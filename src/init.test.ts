import init from './init'
import {createFloors, createStubElevator, StubElevator} from "./testHelpers";

declare let global: Record<string, unknown>;

describe('init', () => {
  afterEach(() => {
    global.elevators = undefined
    global.floors = undefined
  })

  describe('idle', () => {
    it('go to middle if empty', () => {
      const elevator = createStubElevator({currentFloor: 0})
      global.elevators = [elevator];
      const floors = createFloors(4)
      global.floors = floors

      init()
      elevator.__handlers.init.forEach(h => h())

      expect(elevator.destinationQueue).toEqual([1])
      expect(elevator.checkDestinationQueue).toBeCalled()
    })

    it('stay put if not empty', () => {
      const elevator = createStubElevator({currentFloor: 0, loadFactor: 0.5})
      global.elevators = [elevator];
      const floors = createFloors(4)
      global.floors = floors

      init()
      elevator.__handlers.init.forEach(h => h())

      expect(elevator.destinationQueue).toEqual([])
      expect(elevator.checkDestinationQueue).not.toBeCalled()
    })
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
        currentFloor: 8,
        destinationQueue: [9]
      })
      global.elevators = [elevator0, elevator1];
      const floors = createFloors(10)
      global.floors = floors

      init()
      const targetFloor = floors[8]
      targetFloor.__handlers.upButtonPressed.forEach(h => h())

      expect(elevator0.destinationQueue).toEqual([])
      expect(elevator0.checkDestinationQueue).not.toBeCalled()
      expect(elevator1.destinationQueue).toEqual([8, 9])
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

    it('move empty elevator even though another already going', () => {
      const elevator0 = createStubElevator({
        currentFloor: 1,
        destinationQueue: [0, 5],
        pressedFloors: [0]
      })
      const elevator1 = createStubElevator({
        currentFloor: 3,
        destinationQueue: [],
        pressedFloors: []
      })
      global.elevators = [elevator0, elevator1];
      const floors = createFloors(6)
      global.floors = floors

      init()
      const targetFloor = floors[5]
      targetFloor.__handlers.upButtonPressed.forEach(h => h())

      expect(elevator0.destinationQueue).toEqual([0])
      expect(elevator0.checkDestinationQueue).toBeCalled()
      expect(elevator1.destinationQueue).toEqual([5])
      expect(elevator1.checkDestinationQueue).toBeCalled()
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
      expect(elevator.checkDestinationQueue).toBeCalled()
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
