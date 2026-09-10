import {
	NAME_MORA,
	NAME_READONLY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_ORIGINAL,
	SUBSCRIPTION_TYPE_READONLY,
	SYMBOL_STATE,
} from '../constants';
import {subscribeToReactive} from '../helpers/subscription';
import {getFrozenValue, getSimpleValue, getStringValue, peekSimpleValue} from '../helpers/value';
import type {ReadonlyFrozenSignal, ReadonlySignal, SignalState} from '../models';

// #region Instance

function Readonly<Value>(this: any, state: SignalState<Value, never>, frozen: boolean) {
	this[SYMBOL_STATE] = state;

	Object.defineProperty(this, SUBSCRIPTION_TYPE_FROZEN, {
		enumerable: true,
		value: frozen,
	});
}

Readonly.prototype[NAME_MORA] = NAME_READONLY;

Readonly.prototype.get = function () {
	return getReadonlyValue(this[SYMBOL_STATE], false, this[SUBSCRIPTION_TYPE_FROZEN]);
};

Readonly.prototype.peek = function (copy?: boolean) {
	return getReadonlyValue(this[SYMBOL_STATE], true, this[SUBSCRIPTION_TYPE_FROZEN], copy);
};

Readonly.prototype.subscribe = function (subscriber: never) {
	return subscribeToReactive(
		this[SUBSCRIPTION_TYPE_FROZEN] ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_READONLY,
		this[SYMBOL_STATE],
		subscriber,
	);
};

Readonly.prototype.toJSON = function () {
	return this[SYMBOL_STATE].value;
};

Readonly.prototype.toString = function (json?: boolean) {
	return getStringValue(this[SYMBOL_STATE], json);
};

// #endregion

// #region Functions

export function getReadonlyInstance<Value>(
	state: SignalState<Value, never>,
	frozen: boolean,
): ReadonlySignal<Value> {
	const key = (frozen ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_ORIGINAL) as never;

	state.readonlies ??= {};

	state.readonlies[key] ??= getReadonlySignal(state, frozen) as never;

	return state.readonlies[key] as never;
}

export function getReadonlySignal<Value>(
	state: SignalState<Value, never>,
	frozen: boolean,
): ReadonlySignal<Value> | ReadonlyFrozenSignal<Value> {
	// @ts-expect-error All good, no worries :-)
	return new Readonly(state, frozen);
}

function getReadonlyValue<Value>(
	state: SignalState<Value, never>,
	peek: boolean,
	frozen: boolean,
	copy?: boolean,
): unknown {
	let value: unknown;

	if (peek) {
		value = peekSimpleValue(state.value, copy === true);
	} else {
		value = getSimpleValue(state);
	}

	return frozen ? getFrozenValue(value) : value;
}

// #endregion
