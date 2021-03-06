import {EventEmitter} from 'stream';

export class ProxyEvent {
  name: 'get' | 'set';
  paths: string[];

  constructor(name: 'get' | 'set', paths: string[]) {
    this.name = name;
    this.paths = paths;
  }

  get pathString() {
    return this.paths.join('+');
  }

  toString() {
    return `${this.name}: ${this.pathString}`;
  }
}

export class Child {
  emitter: EventEmitter;
  listener: (event: ProxyEvent) => void;

  constructor(
    path: string,
    emitter: EventEmitter,
    parentEmitter: EventEmitter
  ) {
    this.emitter = emitter;
    this.listener = (event: ProxyEvent) => {
      parentEmitter.emit(
        'event',
        new ProxyEvent(event.name, [path, ...event.paths])
      );
    };
    this.emitter.on('event', this.listener);
  }

  release() {
    this.emitter.off('event', this.listener);
  }
}

export class Children {
  children: {[path: string]: Child} = {};

  addChild(path: string, emitter: EventEmitter, parentEmitter: EventEmitter) {
    this.releaseChild(path);
    const child = new Child(path, emitter, parentEmitter);
    this.children[path] = child;
  }

  releaseChild(path: string) {
    const child = this.children[path];
    if (child) {
      child.release();
      delete this.children[path];
    }
  }

  releasesAll() {
    for (const path of Object.keys(this.children)) {
      this.releaseChild(path);
    }
  }
}
