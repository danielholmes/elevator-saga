import {Elevator, Floor, FloorNumber} from "./types";

declare const elevators: ReadonlyArray<Elevator>;
declare const floors: ReadonlyArray<Floor>;

export default function(): void {
  const timePerStop = 2
  const timePerFloor = 1

  function getPathTime(elevator: Elevator, path: ReadonlyArray<FloorNumber>): number {
    const fullPath = [elevator.currentFloor(), ...path]
    let time = 0;
    for (let i = 1; i < fullPath.length; i += 1) {
      const from = fullPath[i - 1];
      const to = fullPath[i];
      time += Math.abs(from - to) * timePerFloor + timePerStop;
    }
    return time;
  }

  function getCurrentPathLength(elevator: Elevator): number {
    return getPathTime(elevator, elevator.destinationQueue)
  }

  interface DestinationQueueWithLength {
    readonly queue: ReadonlyArray<FloorNumber>;
    readonly length: number;
  }

  function createAllPermutations(floors: ReadonlyArray<FloorNumber>): ReadonlyArray<ReadonlyArray<FloorNumber>> {
    if (floors.length === 1) {
      return [floors]
    }

    return floors.reduce(
      (accu: ReadonlyArray<ReadonlyArray<FloorNumber>>, current: FloorNumber): ReadonlyArray<ReadonlyArray<FloorNumber>> => {
        const otherFloors = floors.filter(f => f !== current);
        const otherPerms = createAllPermutations(otherFloors);
        const perms = otherPerms.map(otherPerm => [current, ...otherPerm])
        return [...perms, ...accu]
      },
      [] as ReadonlyArray<ReadonlyArray<FloorNumber>>
    )
  }

  function getShortestDestinationQueue(elevator: Elevator, floorNum: FloorNumber): DestinationQueueWithLength | undefined {
    if (elevator.destinationQueue.indexOf(floorNum) >= 0) {
      return undefined
    }

    // TODO: Can be done more efficiently, pruning paths that have gone over current max
    const options = createAllPermutations([floorNum, ...elevator.destinationQueue])
      .map((queue): DestinationQueueWithLength => ({queue, length: getPathTime(elevator, queue)}))
    options.sort((option1, option2) =>
      option1.length - option2.length
    )
    return options[0]
  }

  function isFull(elevator: Elevator): boolean {
    const averageLoadFactorPerPerson = 1 / elevator.maxPassengerCount()
    const averagePersonSizeBuffer = 1.3
    return (1 - elevator.loadFactor()) < (averageLoadFactorPerPerson * averagePersonSizeBuffer)
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
      if (q1.shortest === undefined) {
        return -1
      }
      if (q2.shortest === undefined) {
        return 1
      }
      const queuesWithLengths = queues.filter(q => q.shortest)
      const q1OtherTotalLength = queuesWithLengths.filter(queue => queue.elevator !== q1.elevator).map(q => getCurrentPathLength(q.elevator)).reduce((a, b) => a + b)
      const q2OtherTotalLength = queuesWithLengths.filter(queue => queue.elevator !== q2.elevator).map(q => getCurrentPathLength(q.elevator)).reduce((a, b) => a + b)
      return (q1.shortest.length + q1OtherTotalLength) - (q2.shortest.length + q2OtherTotalLength)
    })
    return queues[0].elevator
  }

  function goToFloorInShortestPath(elevator: Elevator, floorNum: FloorNumber): void {
    const shortest = getShortestDestinationQueue(elevator, floorNum)
    if (shortest) {
      elevator.destinationQueue = shortest.queue.slice();
      elevator.checkDestinationQueue();
    }
  }

  elevators.forEach((elevator) => {
    // elevator.on('idle', () => {
    //   goToClosest(elevator, elevator.getPressedFloors());
    // });

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
