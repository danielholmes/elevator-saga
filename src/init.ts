import {Elevator, Floor, FloorNumber} from "./types";

declare const elevators: ReadonlyArray<Elevator>;
declare const floors: ReadonlyArray<Floor>;

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

  function getElevatorTravelTime(elevator: Elevator, path: ReadonlyArray<FloorNumber>): number {
    return getTravelTime([elevator.currentFloor(), ...path])
  }

  function getCurrentTravelTime(elevator: Elevator): number {
    return getElevatorTravelTime(elevator, elevator.destinationQueue)
  }

  interface DestinationQueueWithLength {
    readonly queue: ReadonlyArray<FloorNumber>;
    readonly length: number;
  }

  function createAllPermutations(floors: ReadonlySet<FloorNumber>): ReadonlyArray<ReadonlyArray<FloorNumber>> {
    const floorsArray = Array.from(floors);
    if (floorsArray.length === 1) {
      return [floorsArray]
    }

    return floorsArray.reduce(
      (accu: ReadonlyArray<ReadonlyArray<FloorNumber>>, current: FloorNumber): ReadonlyArray<ReadonlyArray<FloorNumber>> => {
        const otherFloors = floorsArray.filter(f => f !== current);
        const otherPerms = createAllPermutations(new Set(otherFloors));
        const perms = otherPerms.map(otherPerm => [current, ...otherPerm])
        return [...perms, ...accu]
      },
      [] as ReadonlyArray<ReadonlyArray<FloorNumber>>
    )
  }

  function getShortestDestinationQueue(elevator: Elevator, floorNum: FloorNumber): DestinationQueueWithLength {
    // TODO: Can be done more efficiently, pruning paths that have gone over current max
    const options = createAllPermutations(new Set([floorNum, ...elevator.destinationQueue]))
      .map((queue): DestinationQueueWithLength => ({queue, length: getElevatorTravelTime(elevator, queue)}))
    options.sort((option1, option2) =>
      option1.length - option2.length
    )
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
        q1.shortest.length
      ]
      const queue2Others = queues.filter(queue => queue.elevator !== q2.elevator)
      const q2Lengths = [
        ...queue2Others.map(q => getCurrentTravelTime(q.elevator)),
        q2.shortest.length
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
      }
    });
    floor.on('down_button_pressed', () => {
      const closest = getClosestElevator(elevators, floor.floorNum())
      if (closest) {
        goToFloorInShortestPath(closest, floor.floorNum())
      }
    });
  });
}
