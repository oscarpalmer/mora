import {NAME_MORA, NAME_SIGNAL, SYMBOL_STATE} from '../constants';
import {getState} from '../helpers/misc';
import {subscribeToSignal} from '../helpers/subscription';
import {
	emitValue,
	getSimpleValue,
	getStringValue,
	handleSimpleValue,
	peekSimpleValue,
	updateSimpleValue,
} from '../helpers/value';
import type {ReactiveOptions, ReactiveState, Signal} from '../models';
import {getReadonlyInstance} from './readonly';

// #region Instance

function Signal<Value>(this: any, value: never, options?: ReactiveOptions<Value>) {
	this[SYMBOL_STATE] = getState<Value, Value>(undefined as never, options);

	handleSimpleValue(this[SYMBOL_STATE], value, setAndEmit);
}

Signal.prototype[NAME_MORA] = NAME_SIGNAL;

Signal.prototype.asReadonly = function (frozen?: never) {
	return getReadonlyInstance(this[SYMBOL_STATE], frozen === true);
};

Signal.prototype.get = function () {
	return getSimpleValue(this[SYMBOL_STATE]);
};

Signal.prototype.peek = function (copy?: boolean) {
	return peekSimpleValue(this[SYMBOL_STATE].value, copy === true);
};

Signal.prototype.set = function (value: never) {
	return handleSimpleValue(this[SYMBOL_STATE], value, setAndEmit);
};

Signal.prototype.subscribe = function (subscriber: never, copy?: never) {
	return subscribeToSignal(this[SYMBOL_STATE], subscriber, copy === true);
};

Signal.prototype.toJSON = function () {
	return this[SYMBOL_STATE].value;
};

Signal.prototype.toString = function (json?: boolean) {
	return getStringValue(this[SYMBOL_STATE], json);
};

Signal.prototype.update = function (callback: never) {
	return updateSimpleValue(this[SYMBOL_STATE], callback, setAndEmit);
};

// #endregion

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

export function signal<Value>(value: unknown, options?: ReactiveOptions<Value>): Signal<Value> {
	// @ts-expect-error All good, no worries :-)
	return new Signal(value, options);
}

// #endregion
