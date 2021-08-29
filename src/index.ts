import {EventEmitter} from 'events';
import {AccessEvent, Children} from './models';

const emitterKey = '__emitter__';

export const canProxy = (obj: any) => typeof obj === 'object' && obj !== null;

export const getEmitter = (obj: any): EventEmitter | undefined =>
  canProxy(obj) ? Reflect.get(obj, emitterKey) : undefined;

export function useProxy<T extends object>(target: T): [T, EventEmitter] {
  // return if the object is already a proxy
  const oldEmitter = getEmitter(target);
  if (oldEmitter) {
    return [target, oldEmitter!];
  }

  const emitter = new EventEmitter();
  const children = new Children();

  const connectChild = (path: string, value: any, receiver?: any) => {
    const [childProxy, childEmitter] = useProxy(value);
    Reflect.set(target, path, childProxy, receiver);
    children.addChild(path, childEmitter, emitter);
  };

  const proxy = new Proxy(target, {
    get: (target: T, path: string, receiver?: any) => {
      if (path === emitterKey) {
        return emitter;
      }
      const value = Reflect.get(target, path, receiver);
      if (typeof value !== 'function') {
        emitter.emit('event', new AccessEvent('get', [path]));
      }
      return value;
    },
    set: (target: T, path: string, value: any, receiver?: any): boolean => {
      const oldValue = Reflect.get(target, path);
      if (value === oldValue) {
        return true;
      }
      // remove old child in case there is one
      children.removeChild(path);
      if (canProxy(value)) {
        connectChild(path, value, receiver);
      } else {
        Reflect.set(target, path, value, receiver);
      }
      emitter.emit('event', new AccessEvent('set', [path]));
      return true;
    },
  });

  // first time init
  for (const path of Object.keys(target)) {
    const value = Reflect.get(target, path);
    if (canProxy(value)) {
      connectChild(path, value, target);
    }
  }

  return [proxy, emitter];
}

export const runAndMonitor = (
  emitter: EventEmitter,
  f: Function
): [result: any, newEmitter: EventEmitter] => {
  const events: AccessEvent[] = [];
  const callback = (event: AccessEvent) => events.push(event);
  emitter.on('event', callback);
  const result = f();
  emitter.off('event', callback);
  const getPaths = [
    ...new Set(
      events
        .filter(event => event.name === 'get')
        .map(event => event.pathString())
    ),
  ];
  const newEmitter = new EventEmitter();
  emitter.on('event', (event: AccessEvent) => {
    if (event.name === 'set') {
      const setPath = event.pathString();
      if (getPaths.some(getPath => getPath.startsWith(setPath))) {
        // if setPath is shorter than getPath, then it's time to refresh
        newEmitter.emit('event', event);
      }
    }
  });
  return [result, newEmitter];
};
