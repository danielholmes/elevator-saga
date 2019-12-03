export type FloorNumber = number;

export type Direction = 'up' | 'down'
export type DestinationDirection = Direction | 'stopped'

export type FloorNumberHandler = (floorNum: FloorNumber) => void;
export type MovementHandler = (floorNum: FloorNumber, direction: Direction) => void;
export type EmptyHandler = () => void;

export interface Elevator {
  destinationDirection(): DestinationDirection;
  destinationQueue: Array<FloorNumber>;
  checkDestinationQueue(): void;

  currentFloor(): FloorNumber;
  goToFloor(floorNum: FloorNumber): void;
  getPressedFloors(): ReadonlyArray<FloorNumber>;

  loadFactor(): number;
  maxPassengerCount(): number;

  stop(): void;

  goingUpIndicator(): boolean;
  goingUpIndicator(newValue: boolean): void;
  goingDownIndicator(): boolean;
  goingDownIndicator(newValue: boolean): void;

  on(name: 'floor_button_pressed', handler: FloorNumberHandler): void;
  on(name: 'idle', handler: EmptyHandler): void;
  on(name: 'passing_floor', handler: MovementHandler): void;
  on(name: 'stopped_at_floor', handler: FloorNumberHandler): void;
}

export interface Floor {
  floorNum(): FloorNumber;

  on(name: 'up_button_pressed', handler: EmptyHandler): void;
  on(name: 'down_button_pressed', handler: EmptyHandler): void;
}
