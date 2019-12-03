import {
  DestinationDirection,
  Elevator,
  EmptyHandler,
  Floor,
  FloorNumber,
  FloorNumberHandler,
  MovementHandler
} from "./types";

interface StubFloor extends Floor {
  __handlers: Readonly<{
    upButtonPressed: ReadonlyArray<EmptyHandler>;
    downButtonPressed: ReadonlyArray<EmptyHandler>;
  }>;
}

function createFloor(num: FloorNumber): StubFloor {
  const downButtonPressedHandlers: Array<EmptyHandler> = []
  const upButtonPressedHandlers: Array<EmptyHandler> = []

  return {
    __handlers: {
      upButtonPressed: upButtonPressedHandlers,
      downButtonPressed: downButtonPressedHandlers
    },
    floorNum(): FloorNumber { return num; },
    on(name: 'up_button_pressed' | 'down_button_pressed', handler: EmptyHandler): void {
      if (name === 'up_button_pressed') {
        upButtonPressedHandlers.push(handler)
        return
      }
      if (name === 'down_button_pressed') {
        downButtonPressedHandlers.push(handler)
      }
    }
  }
}

export function createFloors(amount: number): ReadonlyArray<StubFloor> {
  return Array(amount).fill(undefined).map((_, i) => createFloor(i))
}

export interface StubElevator extends Elevator {
  readonly __handlers: Readonly<{
    init: ReadonlyArray<EmptyHandler>;
    floorButtonPressed: ReadonlyArray<FloorNumberHandler>;
  }>;
}

export function createStubElevator(
  options: {
    currentFloor?: FloorNumber;
    destinationQueue?: ReadonlyArray<FloorNumber>;
    maxPassengerCount?: number;
    loadFactor?: number;
    pressedFloors?: ReadonlyArray<FloorNumber>;
  } = {}
): StubElevator {
  const floorButtonPressedHandlers: Array<FloorNumberHandler> = []
  const initHandlers: Array<EmptyHandler> = []

  const currentFloor: FloorNumber = options.currentFloor || 0

  const destinationQueue: Array<FloorNumber> = options.destinationQueue ? options.destinationQueue.slice() : []
  const checkDestinationQueue = jest.fn()

  return {
    __handlers: {
      init: initHandlers,
      floorButtonPressed: floorButtonPressedHandlers
    },

    destinationDirection(): DestinationDirection {
      return 'up'
    },
    destinationQueue,
    checkDestinationQueue,

    currentFloor(): FloorNumber {
      return currentFloor
    },

    loadFactor(): number {
      return options.loadFactor || 0;
    },

    goingUpIndicator(): boolean {
      return false
    },
    goingDownIndicator(): boolean {
      return false
    },

    maxPassengerCount(): number {
      return options.maxPassengerCount || 5;
    },

    goToFloor(floorNum: FloorNumber): void {
      if (destinationQueue.indexOf(floorNum) === -1) {
        destinationQueue.push(floorNum)
        checkDestinationQueue()
      }
    },
    stop(): void {
      // Not used
    },

    getPressedFloors(): ReadonlyArray<FloorNumber> {
      return options.pressedFloors || []
    },
    on(
      name: 'idle' | 'floor_button_pressed' | 'passing_floor' | 'stopped_at_floor',
      handler: FloorNumberHandler | EmptyHandler | MovementHandler
    ): void {
      if (name === 'floor_button_pressed') {
        floorButtonPressedHandlers.push((num) => handler(num, 'up'))
        return
      }
      if (name === 'idle') {
        initHandlers.push(() => handler(0, 'up'))
      }
    }
  }
}
