import {
	NAME_MORA,
	NAME_READONLY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_READONLY,
} from '../constants';
import {subscribeToReactive} from '../helpers/subscription';
import {getFrozenValue, getSimpleValue, peekSimpleValue} from '../helpers/value';
import type {
	ReactiveState,
	ReadonlyFrozenSignal,
	ReadonlyInstances,
	ReadonlySignal,
} from '../models';

// #region Functions

export function getReadonlyInstance<Value>(
	state: ReactiveState<Value, never>,
	instances: ReadonlyInstances<Value>,
	frozen: boolean,
): ReadonlySignal<Value> {
	const key = frozen ? 'frozen' : 'original';

	instances[key] ??= getReadonlySignal(state, frozen) as never;

	return instances[key] as never;
}

export function getReadonlySignal<Value>(
	state: ReactiveState<Value, never>,
	frozen: boolean,
): ReadonlySignal<Value> | ReadonlyFrozenSignal<Value> {
	const type = frozen ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_READONLY;

	const instance = {
		get: () => getReadonlyValue(state, false, frozen),
		peek: (copy?: boolean) => getReadonlyValue(state, true, frozen, copy),
		subscribe: (subscriber: never) => subscribeToReactive(type, state, subscriber),
	};

	Object.defineProperties(instance, {
		[NAME_MORA]: {
			value: NAME_READONLY,
		},
		frozen: {
			enumerable: true,
			value: frozen,
		},
	});

	return Object.freeze(instance) as never;
}

function getReadonlyValue<Value>(
	state: ReactiveState<Value, never>,
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
