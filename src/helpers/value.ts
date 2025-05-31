import {activeEffect} from '../effect';
import {activeComputed} from '../value/computed';
import type {ReactiveState} from '../value/reactive';
import {emitValue} from './emit';

export function getValue<Value>(state: ReactiveState<Value>): Value {
	if (activeComputed != null) {
		state.computeds.add(activeComputed);
	}

	if (activeEffect != null) {
		state.effects.add(activeEffect);
	}

	return state.value;
}

export function setValue<Value>(
	state: ReactiveState<Value>,
	value: Value,
): void {
	if (!Object.is(state.value, value)) {
		state.value = value;

		emitValue(state);
	}
}
