import {
	MESSAGE_DEACTIVATED_READONLY,
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

function Readonly(this: InternalReadonly, state: SignalState, frozen: boolean): void {
	this[SYMBOL_STATE] = state;

	this[SYMBOL_READONLY] = {
		active: true,
		name: frozen ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_ORIGINAL,
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
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		throw new Error(MESSAGE_DEACTIVATED_READONLY);
	}

	const key = (frozen === true ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_ORIGINAL) as never;

	state.readonlies ??= {};

	// @ts-expect-error All good, no worries :-)
	state.readonlies[key] ??= new Readonly(state, frozen === true);

	return state.readonlies[key] as never;
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

	let value: unknown;

	if (peek) {
		value = peekSignalValue.call(state.active ? instance : [instance, state.value], copy === true);
	} else {
		value = state.active ? getSignalValue.call(instance) : state.value;
	}

	return frozen ? getFrozenValue(value) : value;
}

function peekReadonlyValue(this: InternalReadonly, copy?: boolean) {
	return handleReadonlyValue(this, true, this.frozen, copy);
}

// #endregion
