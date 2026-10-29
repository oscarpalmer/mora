import {
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_ORIGINAL,
	SYMBOL_READONLY,
	SYMBOL_STATE,
} from '../constants';
import {deactivateReadonly, getReadonlyActive} from '../helpers/misc';
import {subscribeToReadonly} from '../helpers/subscription';
import {
	getFrozenValue,
	getJsonValue,
	getSignalValue,
	getStringValue,
	peekSignalValue,
} from '../helpers/value';
import type {InternalReadonly, InternalSignal, ReadonlySignal, SignalState} from '../models';

// #region Instance

function Readonly(this: any, state: SignalState, frozen: boolean): void {
	this[SYMBOL_STATE] = state;

	this[SYMBOL_READONLY] = {
		active: true,
	};

	Object.defineProperty(this, SUBSCRIPTION_TYPE_FROZEN, {
		value: frozen,
	});
}

Readonly.prototype.deactivate = deactivateReadonly;
Readonly.prototype.get = getReadonlyValue;
Readonly.prototype.peek = peekReadonlyValue;
Readonly.prototype.subscribe = subscribeToReadonly;
Readonly.prototype.toJSON = getJsonValue;
Readonly.prototype.toString = getStringValue;

Object.defineProperties(Readonly.prototype, {
	active: {
		enumerable: true,
		get: getReadonlyActive,
	},
});

// #endregion

// #region Functions

export function getReadonlySignal<Value>(
	this: InternalSignal,
	frozen?: never,
): ReadonlySignal<Value> {
	const key = (frozen === true ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_ORIGINAL) as never;

	this[SYMBOL_STATE].readonlies ??= {};

	// @ts-expect-error All good, no worries :-)
	this[SYMBOL_STATE].readonlies[key] ??= new Readonly(this[SYMBOL_STATE], frozen === true);

	return this[SYMBOL_STATE].readonlies[key] as never;
}

function getReadonlyValue(this: InternalReadonly) {
	return handleReadonlyValue(this, false, this.frozen);
}

function handleReadonlyValue(
	instance: InternalReadonly,
	peek: boolean,
	frozen: boolean,
	copy?: boolean,
): unknown {
	const state = instance[SYMBOL_READONLY];

	if (!state.active) {
		return frozen ? getFrozenValue(state.value) : state.value;
	}

	let value: unknown;

	if (peek) {
		value = peekSignalValue.call(instance, copy === true);
	} else {
		value = getSignalValue.call(instance);
	}

	return frozen ? getFrozenValue(value) : value;
}

function peekReadonlyValue(this: InternalReadonly, copy?: boolean) {
	return handleReadonlyValue(this, true, this.frozen, copy);
}

// #endregion
