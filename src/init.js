/* global elevators, floors */
function getWorkToGetTo(elevator, floorNum) {
  const targets = [elevator.currentFloor(), ...elevator.destinationQueue, floorNum];
  let distance = 0;
  for (let i = 1; i < targets.length; i += 1) {
    const from = targets[i - 1];
    const to = targets[i];
    distance += Math.abs(from - to);
  }
  return distance;
}

export function getClosestElevator(elevators, floorNum) {
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

export function goToClosest(elevator, floorNumbers) {
  if (floorNumbers.length === 0) {
    return;
  }

  const floorsByDistance = floorNumbers.slice(0);
  floorsByDistance.sort((f1, f2) => Math.abs(elevator.currentFloor() - f1)
    - Math.abs(elevator.currentFloor() - f2));
  elevator.goToFloor(floorsByDistance[0]);
}

elevators.forEach((elevator) => {
  elevator.on('idle', () => {
    goToClosest(elevator, elevator.getPressedFloors());
  });

  elevator.on('floor_button_pressed', (floorNum) => {
    elevator.goToFloor(floorNum);
  });
});

floors.forEach((floor) => {
  floor.on('up_button_pressed', () => {
    getClosestElevator(elevators, floor.floorNum()).goToFloor(floor.floorNum());
  });
  floor.on('down_button_pressed', () => {
    getClosestElevator(elevators, floor.floorNum()).goToFloor(floor.floorNum());
  });
});
