import {Elevator, Floor, FloorNumber} from "./types";

declare const elevators: ReadonlyArray<Elevator>;
declare const floors: ReadonlyArray<Floor>;

export default function() {
  function getWorkToGetTo(elevator: Elevator, floorNum: FloorNumber): number {
    const targets = [elevator.currentFloor(), ...elevator.destinationQueue, floorNum];
    let distance = 0;
    for (let i = 1; i < targets.length; i += 1) {
      const from = targets[i - 1];
      const to = targets[i];
      distance += Math.abs(from - to);
    }
    return distance;
  }

  function getClosestElevator(elevators: ReadonlyArray<Elevator>, floorNum: FloorNumber): Elevator {
    if (elevators.length === 0) {
      throw new Error('Must provide an elevator')
    }

    const closest = elevators.slice();
    closest.sort((e1, e2) => {
      const e1Index = e1.destinationQueue.indexOf(floorNum);
      const e2Index = e2.destinationQueue.indexOf(floorNum);
      if (e1Index >= 0) {
        return -1;
      }
      if (e2Index >= 0) {
        return 1;
      }
      // Send to shortest destination queue
      const e1WorkToDo = getWorkToGetTo(e1, floorNum);
      const e2WorkToDo = getWorkToGetTo(e2, floorNum);
      if (e1WorkToDo !== e2WorkToDo) {
        return e1WorkToDo - e2WorkToDo;
      }
      // Send to whoever is closest
      return Math.abs(e2.currentFloor() - floorNum) - Math.abs(e1.currentFloor() - floorNum);
    });
    return closest[0];
  }

  // export function goToClosest(elevator: Elevator, floorNumbers: ReadonlyArray<FloorNumber>): void {
  //   if (floorNumbers.length === 0) {
  //     return;
  //   }
  //
  //   const floorsByDistance = floorNumbers.slice(0);
  //   floorsByDistance.sort((f1, f2): number => Math.abs(elevator.currentFloor() - f1)
  //     - Math.abs(elevator.currentFloor() - f2));
  //   elevator.goToFloor(floorsByDistance[0]);
  // }

  function goToFloorInShortestPath(elevator: Elevator, floorNum: FloorNumber): void {
    if (elevator.destinationQueue.indexOf(floorNum) >= 0) {
      return
    }
    elevator.destinationQueue.push(floorNum);
    elevator.checkDestinationQueue();
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
      // TODO: Insert into queue for shortest move
      getClosestElevator(elevators, floor.floorNum()).goToFloor(floor.floorNum());
    });
    floor.on('down_button_pressed', () => {
      // TODO: Insert into queue for shortest move
      getClosestElevator(elevators, floor.floorNum()).goToFloor(floor.floorNum());
    });
  });
}
