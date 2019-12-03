import {Elevator, EmptyHandler, Floor, FloorNumber, FloorNumberHandler} from './types'
import init from './init'

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

function createFloors(amount: number): ReadonlyArray<StubFloor> {
  return Array(amount).fill(undefined).map((_, i) => createFloor(i))
}

interface StubElevator extends Elevator {
  readonly __handlers: Readonly<{
    floorButtonPressed: ReadonlyArray<(floorNum: FloorNumber) => void>;
  }>;
}

function createStubElevator(
  options: {
    currentFloor?: FloorNumber;
    destinationQueue?: ReadonlyArray<FloorNumber>;
    maxPassengerCount?: number;
    loadFactor?: number;
  } = {}
): StubElevator {
  const floorButtonPressedHandlers: Array<FloorNumberHandler> = []
  const currentFloor: FloorNumber = options.currentFloor || 0

  const destinationQueue: Array<FloorNumber> = options.destinationQueue ? options.destinationQueue.slice() : []
  const checkDestinationQueue = jest.fn()

  return {
    __handlers: {
      floorButtonPressed: floorButtonPressedHandlers
    },

    destinationQueue,
    checkDestinationQueue,

    currentFloor(): FloorNumber {
      return currentFloor
    },

    loadFactor(): number {
      return options.loadFactor || 0;
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

describe('init', () => {
  afterEach(() => {
    global.elevators = undefined
    global.floors = undefined
  })

  describe('up_button_pressed', () => {
    it('go to closest elevator with no destinations', () => {
      const elevator0 = createStubElevator({ currentFloor: 0})
      const elevator1 = createStubElevator({currentFloor: 1})
      global.elevators = [elevator0, elevator1];
      const floors = createFloors(4)
      global.floors = floors

      init()
      const targetFloor = floors[2]
      targetFloor.__handlers.upButtonPressed.forEach(h => h())

      expect(elevator0.destinationQueue).toEqual([])
      expect(elevator0.checkDestinationQueue).not.toBeCalled()
      expect(elevator1.destinationQueue).toEqual([2])
      expect(elevator1.checkDestinationQueue).toBeCalled()
    })

    it('go to elevator with least time deviation', () => {
      const elevator0 = createStubElevator({
        currentFloor: 0
      })
      const elevator1 = createStubElevator({
        currentFloor: 3,
        destinationQueue: [5]
      })
      global.elevators = [elevator0, elevator1];
      const floors = createFloors(6)
      global.floors = floors

      init()
      const targetFloor = floors[4]
      targetFloor.__handlers.upButtonPressed.forEach(h => h())

      expect(elevator0.destinationQueue).toEqual([])
      expect(elevator0.checkDestinationQueue).not.toBeCalled()
      expect(elevator1.destinationQueue).toEqual([4, 5])
      expect(elevator1.checkDestinationQueue).toBeCalled()
    })

    it('use elevator not overloaded', () => {
      const elevator0 = createStubElevator({currentFloor: 0})
      const elevator1 = createStubElevator({
        currentFloor: 1, loadFactor: 0.95, maxPassengerCount: 5
      })
      global.elevators = [elevator0, elevator1];
      const floors = createFloors(4)
      global.floors = floors

      init()
      const targetFloor = floors[2]
      targetFloor.__handlers.upButtonPressed.forEach(h => h())

      expect(elevator0.destinationQueue).toEqual([2])
      expect(elevator0.checkDestinationQueue).toBeCalled()
      expect(elevator1.destinationQueue).toEqual([])
      expect(elevator1.checkDestinationQueue).not.toBeCalled()
    })
  })

  describe('floor_button_pressed', () => {
    let elevator: StubElevator

    beforeEach(() => {
      elevator = createStubElevator()
      global.elevators = [elevator];
      global.floors = createFloors(4)
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

    it('will insert if shorter', () => {
      elevator.destinationQueue.push(1)
      elevator.destinationQueue.push(3)

      init()
      elevator.__handlers.floorButtonPressed.forEach(h => h(2))

      expect(elevator.destinationQueue).toEqual([1, 2, 3])
      expect(elevator.checkDestinationQueue).toBeCalled()
    });

    it('will find shortest path for longer example', () => {
      elevator.destinationQueue.push(0)
      elevator.destinationQueue.push(2)
      elevator.destinationQueue.push(1)

      init()
      elevator.__handlers.floorButtonPressed.forEach(h => h(3))

      expect(elevator.destinationQueue).toEqual([0, 1, 2, 3])
      expect(elevator.checkDestinationQueue).toBeCalled()
    });
  });
})
