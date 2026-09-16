import {
	NAME_MORA,
	NAME_READONLY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_ORIGINAL,
	SYMBOL_STATE,
} from '../constants';
import {subscribeToReadonly} from '../helpers/subscription';
import {
	getFrozenValue,
	getJsonValue,
	getSignalValue,
	getStringValue,
	peekSignalValue,
} from '../helpers/value';
import type {InternalSignal, ReadonlyFrozenSignal, ReadonlySignal, SignalState} from '../models';

// #region Types

type InternalReadonly = {
	[SUBSCRIPTION_TYPE_FROZEN]: boolean;
} & InternalSignal;

// #endregion

// #region Instance

function Readonly(this: any, state: SignalState, frozen: boolean) {
	this[SUBSCRIPTION_TYPE_FROZEN] = frozen;
	this[SYMBOL_STATE] = state;
}

Readonly.prototype[NAME_MORA] = NAME_READONLY;

Readonly.prototype.get = getReadonlyValue;
Readonly.prototype.peek = peekReadonlyValue;
Readonly.prototype.subscribe = subscribeToReadonly;
Readonly.prototype.toJSON = getJsonValue;
Readonly.prototype.toString = getStringValue;

// #endregion

// #region Functions

export function getReadonlyInstance(
	state: SignalState,
	frozen: boolean,
): ReadonlySignal<unknown> | ReadonlyFrozenSignal<unknown> {
	// @ts-expect-error All good, no worries :-)
	return new Readonly(state, frozen);
}

export function getReadonlySignal<Value>(
	this: InternalSignal,
	frozen?: never,
): ReadonlySignal<Value> {
	const key = (frozen === true ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_ORIGINAL) as never;

	this[SYMBOL_STATE].readonlies ??= {};

	this[SYMBOL_STATE].readonlies[key] ??= getReadonlyInstance(
		this[SYMBOL_STATE],
		frozen === true,
	) as never;

	return this[SYMBOL_STATE].readonlies[key] as never;
}

function getReadonlyValue(this: InternalReadonly) {
	return handleReadonlyValue(this, false, this[SUBSCRIPTION_TYPE_FROZEN]);
}

function handleReadonlyValue(
	instance: InternalReadonly,
	peek: boolean,
	frozen: boolean,
	copy?: boolean,
): unknown {
	let value: unknown;

	if (peek) {
		value = peekSignalValue.call(instance, copy === true);
	} else {
		value = getSignalValue.call(instance);
	}

	return frozen ? getFrozenValue(value) : value;
}

function peekReadonlyValue(this: InternalReadonly, copy?: boolean) {
	return handleReadonlyValue(this, true, this[SUBSCRIPTION_TYPE_FROZEN], copy);
}

// #endregion
