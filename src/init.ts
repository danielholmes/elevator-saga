import {Elevator, Floor, FloorNumber} from "./types";

declare const elevators: ReadonlyArray<Elevator>;
declare const floors: ReadonlyArray<Floor>;

type DestinationQueue = ReadonlyArray<FloorNumber>

export default function(): void {
  const epsilon = 0.00001
  const timePerStop = 1
  const moveOverhead = 0.5
  const timePerFloor = 0.5

  function getTravelTime(fullPath: ReadonlyArray<FloorNumber>): number {
    let time = 0;
    for (let i = 1; i < fullPath.length; i += 1) {
      const from = fullPath[i - 1];
      const to = fullPath[i];
      time += moveOverhead + Math.abs(from - to) * timePerFloor + timePerStop;
    }
    return time;
  }

  function getElevatorTravelTime(elevator: Elevator, queue: DestinationQueue): number {
    return getTravelTime([elevator.currentFloor(), ...queue])
  }

  function getCurrentTravelTime(elevator: Elevator): number {
    return getElevatorTravelTime(elevator, elevator.destinationQueue)
  }

  interface TimedDestinationQueue {
    readonly queue: DestinationQueue;
    readonly time: number;
  }

  function getShortestQueuesFrom(
    fromFloor: FloorNumber,
    floors: ReadonlySet<FloorNumber>,
    maxTime: number
  ): ReadonlyArray<TimedDestinationQueue> {
    const floorsArray = Array.from(floors);
    if (floorsArray.length === 1) {
      return [
        {
          queue: floorsArray,
          time: getTravelTime([fromFloor, ...floorsArray])
        }
      ]
    }

    const floorResults = floorsArray.reduce(
      (accu: ReadonlyArray<TimedDestinationQueue>, current: FloorNumber): ReadonlyArray<TimedDestinationQueue> => {
        const otherFloors = new Set(floorsArray.filter(f => f !== current));
        const longestAccu = Math.max.apply(undefined, [maxTime, ...accu.map(q => q.time)])
        const otherPerms = getShortestQueuesFrom(current, otherFloors, longestAccu);
        const perms: ReadonlyArray<TimedDestinationQueue> = otherPerms.map(otherPerm => ({
          queue: [current, ...otherPerm.queue],
          time: getTravelTime([fromFloor, current, ...otherPerm.queue])
        }))
          .filter(({ time }) => time <= maxTime)
        return perms.concat(accu)
      },
      [] as ReadonlyArray<TimedDestinationQueue>
    )
    const lowestTime = Math.min.apply(undefined, floorResults.map(({ time }) => time))
    return floorResults.filter(({ time }) => time === lowestTime)
  }

  function getShortestDestinationQueue(elevator: Elevator, floorNum: FloorNumber): TimedDestinationQueue {
    const floors = new Set([floorNum, ...elevator.destinationQueue]);
    const options = getShortestQueuesFrom(elevator.currentFloor(), floors, Number.MAX_VALUE).slice()
    // Choose a random. Is there another rule to use for equal distances?
    return options[0]
  }

  function isFull(elevator: Elevator): boolean {
    const averageLoadFactorPerPerson = 1 / elevator.maxPassengerCount()
    const averagePersonSizeBuffer = 1.5
    return (1 - elevator.loadFactor()) < (averageLoadFactorPerPerson * averagePersonSizeBuffer)
  }

  function isEmpty(elevator: Elevator): boolean {
    return elevator.loadFactor() < epsilon;
  }

  function getClosestElevator(elevators: ReadonlyArray<Elevator>, floorNum: FloorNumber): Elevator | undefined {
    if (elevators.length === 0) {
      throw new Error('Must provide an elevator')
    }

    const availableElevators = elevators.filter(e => !isFull(e));
    if (availableElevators.length === 0) {
      return undefined
    }

    const queues = availableElevators.map(elevator => ({
      elevator,
      shortest: getShortestDestinationQueue(elevator, floorNum)
    }))
    queues.sort((q1, q2) => {
      const queue1Others = queues.filter(queue => queue.elevator !== q1.elevator)
      const q1Lengths = [
        ...queue1Others.map(q => getCurrentTravelTime(q.elevator)),
        q1.shortest.time
      ]
      const queue2Others = queues.filter(queue => queue.elevator !== q2.elevator)
      const q2Lengths = [
        ...queue2Others.map(q => getCurrentTravelTime(q.elevator)),
        q2.shortest.time
      ]
      const q1Length = Math.max.apply(undefined, q1Lengths)
      const q2Length = Math.max.apply(undefined, q2Lengths)
      if (q1Length !== q2Length) {
        return q1Length - q2Length
      }
      // Equal times for all elevators, want the better service (more stops)
      const q1OtherElevatorStops = availableElevators.filter(e => e !== q1.elevator).map(e => e.destinationQueue.length).reduce((a, b) => a + b)
      const q1Stops = q1.shortest.queue.length + q1OtherElevatorStops
      const q2OtherElevatorStops = availableElevators.filter(e => e !== q2.elevator).map(e => e.destinationQueue.length).reduce((a, b) => a + b)
      const q2Stops = q2.shortest.queue.length + q2OtherElevatorStops
      return q2Stops - q1Stops
    })
    return queues[0].elevator
  }

  function goToFloorInShortestPath(elevator: Elevator, floorNum: FloorNumber): void {
    const shortest = getShortestDestinationQueue(elevator, floorNum)
    elevator.destinationQueue = shortest.queue.slice();
    elevator.checkDestinationQueue();
  }

  function removeNonPassengerFloors(checkElevators: ReadonlyArray<Elevator>, floorNum: FloorNumber): void {
    checkElevators.filter(e => e.destinationQueue.indexOf(floorNum) >= 0)
      .filter(e => e.getPressedFloors().indexOf(floorNum) === -1)
      .forEach(e => {
        e.destinationQueue = e.destinationQueue.filter(d => d !== floorNum)
        e.checkDestinationQueue()
      })
  }

  elevators.forEach((elevator) => {
    elevator.on('idle', () => {
      if (isEmpty(elevator)) {
        elevator.destinationQueue = [floors.length / 2 - 1]
        elevator.checkDestinationQueue()
      }
    });

    elevator.on('floor_button_pressed', (floorNum: FloorNumber) => {
      goToFloorInShortestPath(elevator, floorNum);
    });
  });

  floors.forEach((floor: Floor) => {
    floor.on('up_button_pressed', () => {
      const closest = getClosestElevator(elevators, floor.floorNum())
      if (closest) {
        goToFloorInShortestPath(closest, floor.floorNum())
        removeNonPassengerFloors(elevators.filter(e => e !== closest), floor.floorNum())
      }
    });
    floor.on('down_button_pressed', () => {
      const closest = getClosestElevator(elevators, floor.floorNum())
      if (closest) {
        goToFloorInShortestPath(closest, floor.floorNum())
        removeNonPassengerFloors(elevators.filter(e => e !== closest), floor.floorNum())
      }
    });
  });
}
