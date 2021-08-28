import {useProxy, AccessEvent} from '../src';

describe('getter', () => {
  test('getter', () => {
    const [proxy, emitter] = useProxy({
      visibility: false,
      get visibleTodos() {
        return !this.visibility;
      },
    });
    const events: AccessEvent[] = [];
    emitter.on('event', (event: AccessEvent) => {
      events.push(event);
    });
    if (proxy.visibleTodos) {
      expect(events).toEqual([
        {name: 'get', paths: ['visibleTodos']},
        // {name: 'get', paths: ['visibility']},
      ]);
    }
  });

  test('normal method', () => {
    const [proxy, emitter] = useProxy({
      visibility: false,
      visibleTodos() {
        return !this.visibility;
      },
    });
    const events: AccessEvent[] = [];
    emitter.on('event', (event: AccessEvent) => {
      events.push(event);
    });
    if (proxy.visibleTodos()) {
      expect(events).toEqual([
        {name: 'get', paths: ['visibleTodos']},
        {name: 'get', paths: ['visibility']},
      ]);
    }
  });

  test('JS Proxy normal method', () => {
    class Store {
      hidden = false;
      visible() {
        return !this.hidden;
      }
    }
    const accessList: PropertyKey[] = [];
    const proxy = new Proxy<Store>(new Store(), {
      get: (target: any, propertyKey: PropertyKey) => {
        accessList.push(propertyKey);
        return Reflect.get(target, propertyKey);
      },
    });
    if (proxy.visible()) {
      expect(accessList).toEqual(['visible', 'hidden']);
    }
  });

  test('JS Proxy getter method', () => {
    class Store {
      hidden = false;
      get visible() {
        return !this.hidden;
      }
    }
    const accessList: PropertyKey[] = [];
    const proxy = new Proxy<Store>(new Store(), {
      get: (target: any, propertyKey: PropertyKey) => {
        accessList.push(propertyKey);
        return Reflect.get(target, propertyKey);
      },
    });
    if (proxy.visible) {
      expect(accessList).toEqual(['visible']);
    }
  });
});
