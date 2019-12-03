export type FloorNumber = number;

export interface Elevator {
  destinationQueue: Array<FloorNumber>;
  checkDestinationQueue(): void;

  currentFloor(): FloorNumber;
  goToFloor(floorNum: FloorNumber): void;
  getPressedFloors(): ReadonlyArray<FloorNumber>;

  loadFactor(): number;
  maxPassengerCount(): number;

  on(name: 'floor_button_pressed', handler: (floorNum: FloorNumber) => void): void;
  on(name: 'idle', handler: () => void): void;
}

export interface Floor {
  floorNum(): FloorNumber;

  on(name: 'up_button_pressed', handler: () => void): void;
  on(name: 'down_button_pressed', handler: () => void): void;
}

export type FloorNumberHandler = (floorNum: FloorNumber) => void;
export type EmptyHandler = () => void;
