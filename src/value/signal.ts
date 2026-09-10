import {NAME_MORA, NAME_SIGNAL} from '../constants';
import {subscribeToSignal} from '../helpers/subscription';
import {
	emitValue,
	getSimpleValue,
	handleSimpleValue,
	peekSimpleValue,
	updateSimpleValue,
} from '../helpers/value';
import type {ReactiveOptions, ReactiveState, ReadonlyInstances, Signal} from '../models';
import {reactive} from './reactive';
import {getReadonlyInstance} from './readonly';

// #region Functions

function setAndEmit<Value>(state: ReactiveState<Value, Value>, value: Value): void {
	if (!state.equal(state.value, value)) {
		state.value = value;

		emitValue(state);
	}
}

/**
 * Create a reactive value from a function result
 *
 * @param value Initial value
 * @param options Reactivity options
 * @returns Reactive value
 */
export function signal<Value>(
	value: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Signal<Value>;

/**
 * Create a reactive value from a promise
 *
 * @param value Initial value
 * @param options Reactivity options
 * @returns Reactive value
 */
export function signal<Value>(
	value: Promise<Value>,
	options?: ReactiveOptions<Value>,
): Signal<Value>;

/**
 * Create a reactive value
 *
 * @param value Initial value
 * @param options Reactivity options
 * @returns Reactive value
 */
export function signal<Value>(value: Value, options?: ReactiveOptions<Value>): Signal<Value>;

export function signal<Value>(
	value: Value | (() => Value | Promise<Value>) | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Signal<Value> {
	const [rx, state] = reactive<Value>(undefined as unknown as Value, options);

	const readonlies: ReadonlyInstances<Value> = {};

	const instance = {
		...rx,
		asReadonly: (frozen?: never) => getReadonlyInstance(state, readonlies, frozen === true),
		get: () => getSimpleValue(state),
		peek: (copy?: boolean) => peekSimpleValue(state.value, copy === true),
		set: (value: never) => handleSimpleValue(state, value, setAndEmit),
		subscribe: (subscriber: never, copy?: never) =>
			subscribeToSignal(state, subscriber, copy === true),
		update: (callback: never) => updateSimpleValue(state, callback, setAndEmit),
	};

	Object.defineProperty(instance, NAME_MORA, {
		value: NAME_SIGNAL,
	});

	handleSimpleValue(state, value, setAndEmit);

	return Object.freeze(instance) as never;
}

// #endregion
