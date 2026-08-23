import {isPlainObject} from '@oscarpalmer/atoms/is';
import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {NAME_MORA, NAME_READONLY} from '../constants';
import {getSimpleValue} from '../helpers/value';
import type {
	ReactiveState,
	ReadonlyFrozenSignal,
	ReadonlyInstances,
	ReadonlySignal,
	ReadonlySignalValue,
} from '../models';

export function getReadonlyInstance<Value>(
	state: ReactiveState<Value, never>,
	instances: ReadonlyInstances<Value>,
	handlers: Record<string, GenericCallback>,
	frozen: boolean,
): ReadonlySignal<Value> {
	const key = frozen ? 'frozen' : 'original';

	instances[key] ??= getReadonlySignal(state, handlers, frozen) as never;

	return instances[key] as ReadonlySignal<Value>;
}

export function getReadonlySignal<Value>(
	state: ReactiveState<Value, never>,
	handlers: Record<string, GenericCallback>,
	frozen: boolean,
): ReadonlySignal<Value> | ReadonlyFrozenSignal<Value> {
	const instance = {
		...handlers,
		get: () => getReadonlyValue(state, false, frozen),
		peek: () => getReadonlyValue(state, true, frozen),
	};

	Object.defineProperties(instance, {
		[NAME_MORA]: {
			enumerable: false,
			value: NAME_READONLY,
		},
		frozen: {
			enumerable: true,
			value: frozen,
		},
	});

	return Object.freeze(instance) as ReadonlySignal<Value>;
}

function getReadonlyValue<Value>(
	state: ReactiveState<Value, never>,
	peek: boolean,
	frozen: boolean,
): Value | ReadonlySignalValue<Value> {
	let value = peek ? state.value : getSimpleValue(state);

	if (!frozen) {
		return value;
	}

	if (Array.isArray(state.value)) {
		value = [...state.value] as Value;
	} else if (isPlainObject(state.value)) {
		value = {...state.value} as Value;
	} else {
		value = state.value;
	}

	return Object.freeze(value);
}
