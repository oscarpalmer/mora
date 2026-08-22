import {NAME_MORA, NAME_SIGNAL} from '../constants';
import {emitValue, getSimpleValue, handleSimpleValue} from '../helpers/value';
import type {ReactiveOptions, ReactiveState, Signal} from '../models';
import {subscribe} from '../subscription';
import {reactive} from './reactive';

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

	const instance = {
		...rx,
		get: () => getSimpleValue(state),
		peek: () => state.value,
		set: (value: Value | (() => Value | Promise<Value>) | Promise<Value>) => {
			handleSimpleValue(state, value, setAndEmit);
		},
		update: (callback: (value: Value) => Value) => {
			handleSimpleValue(state, callback(state.value), setAndEmit);
		},
		subscribe: (callback: (value: Value) => void) => subscribe(state, callback),
		unsubscribe: (callback: (value: Value) => void) => {
			state.subscriptions.delete(callback);
		},
	};

	Object.defineProperty(instance, NAME_MORA, {
		enumerable: false,
		value: NAME_SIGNAL,
	});

	handleSimpleValue(state, value, setAndEmit);

	return Object.freeze(instance) as Signal<Value>;
}
