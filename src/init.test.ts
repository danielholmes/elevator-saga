import {Elevator, EmptyHandler, Floor, FloorNumber, FloorNumberHandler} from './types'
import init from './init'

function createFloors(amount: number): ReadonlyArray<Floor> {
  return Array(amount).fill(undefined).map((_, i) => ({
    floorNum() { return i; },
    on: jest.fn()
  }))
}

interface StubElevator extends Elevator {
  readonly __handlers: Readonly<{
    floorButtonPressed: ReadonlyArray<(floorNum: FloorNumber) => void>;
  }>;
}

function createStubElevator(): StubElevator {
  const floorButtonPressedHandlers: Array<FloorNumberHandler> = []
  return {
    __handlers: {
      floorButtonPressed: floorButtonPressedHandlers
    },

    destinationQueue: [],
    checkDestinationQueue: jest.fn(),

    currentFloor(): FloorNumber {
      return 0
    },
    goToFloor: jest.fn(),
    getPressedFloors(): ReadonlyArray<FloorNumber> {
      return []
    },
    on(name: 'idle' | 'floor_button_pressed', handler: FloorNumberHandler | EmptyHandler): void {
      if (name === 'floor_button_pressed') {
        floorButtonPressedHandlers.push(handler)
      }
    }
  }
}

declare let global: Record<string, unknown>;

describe('floor_button_pressed', () => {
  let elevator: StubElevator

  beforeEach(() => {
    elevator = createStubElevator()
    global.elevators = [elevator];
    global.floors = createFloors(2)
  })

  afterEach(() => {
    global.elevators = undefined
    global.floors = undefined
  })

  it('goes to floor if no items', () => {
    init()
    elevator.__handlers.floorButtonPressed.forEach(h => h(1))

    expect(elevator.destinationQueue).toEqual([1])
    expect(elevator.checkDestinationQueue).toBeCalled()
  });

  it('doesn\'t duplicate', () => {
    elevator.destinationQueue.push(1)

    init()
    elevator.__handlers.floorButtonPressed.forEach(h => h(1))

    expect(elevator.destinationQueue).toEqual([1])
    expect(elevator.checkDestinationQueue).not.toBeCalled()
  });
});
