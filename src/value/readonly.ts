import {
	NAME_MORA,
	NAME_READONLY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_ORIGINAL,
	SYMBOL_STATE,
} from '../constants';
import {subscribeToReadonly} from '../helpers/subscription';
import {getFrozenValue, getSignalValue, getStringValue, peekSignalValue} from '../helpers/value';
import type {ReadonlyFrozenSignal, ReadonlySignal, SignalState, InternalSignal} from '../models';

// #region Instance

function Readonly(this: any, state: SignalState, frozen: boolean) {
	this[SYMBOL_STATE] = state;

	Object.defineProperty(this, SUBSCRIPTION_TYPE_FROZEN, {
		enumerable: true,
		value: frozen,
	});
}

Readonly.prototype[NAME_MORA] = NAME_READONLY;

Readonly.prototype.subscribe = subscribeToReadonly;
Readonly.prototype.toString = getStringValue;

Readonly.prototype.get = function () {
	return getReadonlyValue(this, false, this[SUBSCRIPTION_TYPE_FROZEN]);
};

Readonly.prototype.peek = function (copy?: boolean) {
	return getReadonlyValue(this, true, this[SUBSCRIPTION_TYPE_FROZEN], copy);
};

Readonly.prototype.toJSON = function () {
	return this[SYMBOL_STATE].value;
};

// #endregion

// #region Functions

export function getReadonlyInstance<Value>(
	this: InternalSignal,
	frozen?: never,
): ReadonlySignal<Value> {
	const key = (frozen === true ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_ORIGINAL) as never;

	this[SYMBOL_STATE].readonlies ??= {};

	this[SYMBOL_STATE].readonlies[key] ??= getReadonlySignal(
		this[SYMBOL_STATE],
		frozen === true,
	) as never;

	return this[SYMBOL_STATE].readonlies[key] as never;
}

export function getReadonlySignal(
	state: SignalState,
	frozen: boolean,
): ReadonlySignal<unknown> | ReadonlyFrozenSignal<unknown> {
	// @ts-expect-error All good, no worries :-)
	return new Readonly(state, frozen);
}

function getReadonlyValue(
	instance: InternalSignal,
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

// #endregion
