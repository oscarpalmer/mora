import {NAME_MORA, NAME_SIGNAL, SYMBOL_STATE} from '../constants';
import {getState} from '../helpers/misc';
import {subscribeToSignal} from '../helpers/subscription';
import {
	emitValue,
	getJsonValue,
	getSignalValue,
	getStringValue,
	handleSignal,
	peekSignalValue,
	updateSignal,
} from '../helpers/value';
import type {InternalSignal, InternalStateful, ReactiveOptions, Signal} from '../models';
import {getReadonlySignal} from './readonly';

// #region Instance

function Signal(this: any, value: unknown, options?: ReactiveOptions<unknown>) {
	this[SYMBOL_STATE] = getState(undefined, options);

	handleSignal(this, value, setAndEmit);
}

Signal.prototype[NAME_MORA] = NAME_SIGNAL;

Signal.prototype.asReadonly = getReadonlySignal;
Signal.prototype.get = getSignalValue;
Signal.prototype.peek = peekSignalValue;
Signal.prototype.set = setSignalValue;
Signal.prototype.subscribe = subscribeToSignal;
Signal.prototype.toString = getStringValue;
Signal.prototype.toJSON = getJsonValue;
Signal.prototype.update = updateSignalValue;

// #endregion

// #region Functions

function setAndEmit(instance: InternalStateful, value: unknown): void {
	const state = instance[SYMBOL_STATE];

	if (!(state.equal ?? Object.is)(state.value, value)) {
		state.value = value;

		emitValue(instance);
	}
}

function setSignalValue(this: InternalSignal, value: unknown): void {
	handleSignal(this, value, setAndEmit);
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

function updateSignalValue(this: InternalSignal, callback: never): void {
	updateSignal(this, callback, setAndEmit);
}

// #endregion
