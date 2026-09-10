import {NAME_MORA, NAME_SIGNAL, SYMBOL_STATE} from '../constants';
import {getState} from '../helpers/misc';
import {subscribeToSignal} from '../helpers/subscription';
import {
	emitValue,
	getSignalValue,
	getStringValue,
	handleSignalValue,
	peekSignalValue,
	updateSignalValue,
} from '../helpers/value';
import type {ReactiveOptions, Signal, InternalSignal} from '../models';
import {getReadonlyInstance} from './readonly';

// #region Instance

function Signal(this: any, value: unknown, options?: ReactiveOptions<unknown>) {
	this[SYMBOL_STATE] = getState(undefined, options);

	handleSignalValue(this, value, setAndEmit);
}

Signal.prototype[NAME_MORA] = NAME_SIGNAL;

Signal.prototype.asReadonly = getReadonlyInstance;
Signal.prototype.get = getSignalValue;
Signal.prototype.peek = peekSignalValue;
Signal.prototype.subscribe = subscribeToSignal;
Signal.prototype.toString = getStringValue;

Signal.prototype.set = function (value: never) {
	return handleSignalValue(this, value, setAndEmit);
};

Signal.prototype.toJSON = function () {
	return this[SYMBOL_STATE].value;
};

Signal.prototype.update = function (callback: never) {
	return updateSignalValue(this, callback, setAndEmit);
};

// #endregion

// #region Functions

function setAndEmit(instance: InternalSignal, value: unknown): void {
	const state = instance[SYMBOL_STATE];

	if (!(state.equal ?? Object.is)(state.value as never, value as never)) {
		state.value = value;

		emitValue(instance);
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

export function signal(value: unknown, options?: ReactiveOptions<unknown>): Signal<unknown> {
	// @ts-expect-error All good, no worries :-)
	return new Signal(value, options);
}

// #endregion
