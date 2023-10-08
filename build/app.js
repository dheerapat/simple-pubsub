"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class PublishSubscribeService {
    constructor() {
        this.types = {};
    }
    subscribe(type, handler) {
        if (type in this.types === false) {
            this.types[type] = handler;
        }
    }
    unsubscribe(type) {
        delete this.types[type];
    }
    publish(event) {
        let subscriber = this.types[event.type()];
        if (subscriber) {
            subscriber.handle(event);
        }
    }
}
// implementations
class MachineSaleEvent {
    constructor(_sold, _machineId) {
        this._sold = _sold;
        this._machineId = _machineId;
    }
    machineId() {
        return this._machineId;
    }
    getSoldQuantity() {
        return this._sold;
    }
    type() {
        return 'sale';
    }
}
class MachineRefillEvent {
    constructor(_refill, _machineId) {
        this._refill = _refill;
        this._machineId = _machineId;
    }
    machineId() {
        return this._machineId;
    }
    getRefillQuantity() {
        return this._refill;
    }
    type() {
        return 'refill';
    }
}
class LowStockEvent {
    constructor(_machineId) {
        this._machineId = _machineId;
    }
    machineId() {
        return this._machineId;
    }
    type() {
        return 'low';
    }
}
class StockOkEvent {
    constructor(_machineId) {
        this._machineId = _machineId;
    }
    machineId() {
        return this._machineId;
    }
    type() {
        return 'ok';
    }
}
class StockWarningSubscriber {
    constructor(machines) {
        this.machines = machines;
    }
    handle(event) {
        console.log(`${event.machineId()} : ${(event.type() === 'ok' ? "Stock is Ok" : "Low Stock")}`);
    }
}
class MachineSaleSubscriber {
    constructor(machines) {
        this.machines = machines;
    }
    handle(event) {
        let machine = this.machines.find(m => m.id === event.machineId());
        if (machine === undefined) {
            throw new Error("Machine not found.");
        }
        machine.stockLevel -= event.getSoldQuantity();
    }
}
class MachineRefillSubscriber {
    constructor(machines) {
        this.machines = machines;
    }
    handle(event) {
        let machine = this.machines.find(m => m.id === event.machineId());
        if (machine === undefined) {
            throw new Error("Machine not found.");
        }
        machine.stockLevel += event.getRefillQuantity();
    }
}
// objects
class Machine {
    constructor(id) {
        this.stockLevel = 10;
        this.warningFired = false;
        this.id = id;
    }
}
// helpers
const randomMachine = () => {
    const random = Math.random() * 3;
    if (random < 1) {
        return '001';
    }
    else if (random < 2) {
        return '002';
    }
    return '003';
};
const eventGenerator = () => {
    const random = Math.random();
    if (random < 0.5) {
        const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
        return new MachineSaleEvent(saleQty, randomMachine());
    }
    const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
    return new MachineRefillEvent(refillQty, randomMachine());
};
// program
(() => __awaiter(void 0, void 0, void 0, function* () {
    // create 3 machines with a quantity of 10 stock
    const machines = [new Machine('001'), new Machine('002'), new Machine('003')];
    const testLowStockMachine = [new Machine('004'), new Machine('005')];
    // create a machine sale event subscriber. inject the machines (all subscribers should do this)
    const saleSubscriber = new MachineSaleSubscriber(machines.concat(testLowStockMachine));
    const refillSubscriber = new MachineRefillSubscriber(machines.concat(testLowStockMachine));
    const stockWarningSubscriber = new StockWarningSubscriber(testLowStockMachine);
    const stockThreshold = 3;
    // create the PubSub service
    const pubSubService = new PublishSubscribeService;
    pubSubService.subscribe("sale", saleSubscriber);
    pubSubService.subscribe("refill", refillSubscriber);
    // unsubscribe refill event
    pubSubService.unsubscribe("refill");
    // create 5 random events
    const events = [1, 2, 3, 4, 5].map(i => eventGenerator());
    console.log(events);
    // publish the events
    events.forEach(e => pubSubService.publish(e));
    // resubscribe refill event
    pubSubService.subscribe("refill", refillSubscriber);
    console.log(machines);
    // test low stock event
    pubSubService.subscribe("low", stockWarningSubscriber);
    pubSubService.subscribe("ok", stockWarningSubscriber);
    const forceLowStock = new MachineSaleEvent(9, '004');
    pubSubService.publish(forceLowStock);
    console.log(testLowStockMachine);
    testLowStockMachine.forEach(machine => {
        if (machine.stockLevel < stockThreshold) {
            const lowStockEvent = new LowStockEvent(machine.id);
            pubSubService.publish(lowStockEvent);
            machine.warningFired = true;
        }
        else if (machine.stockLevel > stockThreshold && machine.warningFired === true) {
            const stockOkEvent = new StockOkEvent(machine.id);
            pubSubService.publish(stockOkEvent);
            machine.warningFired = false;
        }
    });
    const forceReStock = new MachineRefillEvent(9, '004');
    pubSubService.publish(forceReStock);
    console.log(testLowStockMachine);
    testLowStockMachine.forEach(machine => {
        if (machine.stockLevel < stockThreshold) {
            const lowStockEvent = new LowStockEvent(machine.id);
            pubSubService.publish(lowStockEvent);
            machine.warningFired = true;
        }
        else if (machine.stockLevel > stockThreshold && machine.warningFired === true) {
            const stockOkEvent = new StockOkEvent(machine.id);
            pubSubService.publish(stockOkEvent);
            machine.warningFired = false;
        }
    });
}))();
