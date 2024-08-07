import {EventEmitter} from 'node:events';

type EmittedEvents = Record<string | symbol, (...args: any) => any>;

export declare interface TypedEventEmitter<Events extends EmittedEvents> {
  on<E extends keyof Events>(event: E, listener: Events[E]): this;

  once<E extends keyof Events>(event: E, listener: Events[E]): this;
}

export class TypedEventEmitter<
  Events extends EmittedEvents,
> extends EventEmitter {}
