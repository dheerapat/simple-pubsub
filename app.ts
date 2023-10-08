// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish(event: IEvent): void;
  subscribe(type: string, handler: ISubscriber): void;
  unsubscribe(type: string): void;
}

class PublishSubscribeService implements IPublishSubscribeService {
  public types: Record<string, ISubscriber> = {};

  subscribe(type: string, handler: ISubscriber): void {
    if (type in this.types === false) {
      this.types[type] = handler;
    }
  }

  unsubscribe(type: string): void {
    delete this.types[type];
  }

  publish(event: IEvent): void {
    let subscriber = this.types[event.type()]
    if (subscriber) {
      subscriber.handle(event)
    }
  }
}


// implementations
class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold
  }

  type(): string {
    return 'sale';
  }
}

class MachineRefillEvent implements IEvent {
  constructor(private readonly _refill: number, private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  getRefillQuantity(): number {
    return this._refill;
  }

  type(): string {
    return 'refill';
  }
}

class LowStockEvent implements IEvent {
  constructor(private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'low';
  }
}

class StockOkEvent implements IEvent {
  constructor(private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'ok';
  }
}

class StockWarningSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: StockOkEvent | LowStockEvent): void {
    console.log(`${event.machineId()} : ${(event.type() === 'ok' ? "Stock is Ok" : "Low Stock")}`)
  }
}

class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineSaleEvent): void {
    let machine = this.machines.find(m => m.id === event.machineId())
    if (machine === undefined) {
      throw new Error("Machine not found.")
    }
    machine.stockLevel -= event.getSoldQuantity();
  }
}

class MachineRefillSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineRefillEvent): void {
    let machine = this.machines.find(m => m.id === event.machineId())
    if (machine === undefined) {
      throw new Error("Machine not found.")
    }
    machine.stockLevel += event.getRefillQuantity();
  }
}


// objects
class Machine {
  public stockLevel = 10;
  public id: string;
  public warningFired: boolean = false;

  constructor(id: string) {
    this.id = id;
  }
}


// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';

}

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
}


// program
(async () => {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [new Machine('001'), new Machine('002'), new Machine('003')];
  const testLowStockMachine = [new Machine('004'), new Machine('005')];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines.concat(testLowStockMachine));
  const refillSubscriber = new MachineRefillSubscriber(machines.concat(testLowStockMachine));
  const stockWarningSubscriber = new StockWarningSubscriber(testLowStockMachine)

  const stockThreshold = 3;

  // create the PubSub service
  const pubSubService = new PublishSubscribeService
  pubSubService.subscribe("sale", saleSubscriber)
  pubSubService.subscribe("refill", refillSubscriber)

  // unsubscribe refill event
  pubSubService.unsubscribe("refill")

  // create 5 random events
  const events = [1, 2, 3, 4, 5].map(i => eventGenerator());

  console.log(events)

  // publish the events
  events.forEach(e => pubSubService.publish(e));

  // resubscribe refill event
  pubSubService.subscribe("refill", refillSubscriber)
  console.log(machines)

  // test low stock event
  pubSubService.subscribe("low", stockWarningSubscriber)
  pubSubService.subscribe("ok", stockWarningSubscriber)

  const forceLowStock = new MachineSaleEvent(9, '004')
  pubSubService.publish(forceLowStock)

  console.log(testLowStockMachine)

  testLowStockMachine.forEach(machine => {
    if (machine.stockLevel < stockThreshold) {
      const lowStockEvent = new LowStockEvent(machine.id);
      pubSubService.publish(lowStockEvent);
      machine.warningFired = true;
    } else if (machine.stockLevel > stockThreshold && machine.warningFired === true) {
      const stockOkEvent = new StockOkEvent(machine.id);
      pubSubService.publish(stockOkEvent);
      machine.warningFired = false
    }
  });

  const forceReStock = new MachineRefillEvent(9, '004')
  pubSubService.publish(forceReStock)

  console.log(testLowStockMachine)

  testLowStockMachine.forEach(machine => {
    if (machine.stockLevel < stockThreshold) {
      const lowStockEvent = new LowStockEvent(machine.id);
      pubSubService.publish(lowStockEvent);
      machine.warningFired = true;
    } else if (machine.stockLevel > stockThreshold && machine.warningFired === true) {
      const stockOkEvent = new StockOkEvent(machine.id);
      pubSubService.publish(stockOkEvent);
      machine.warningFired = false
    }
  });
})();
