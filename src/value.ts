import {batchDepth, batchedHandlers, flushEffects} from './batch';
import {type InternalComputed, activeComputed} from './computed';
import {activeEffect} from './effect';
import type {ReactiveState} from './reactive';

export function emitValue<Value>(state: ReactiveState<Value>): void {
	for (const computed of state.computeds) {
		(computed as unknown as InternalComputed).effect.dirty = true;
	}

	for (const effect of state.effects) {
		batchedHandlers.add(effect);
	}

	for (const [, subscription] of state.subscriptions) {
		batchedHandlers.add(subscription as never);
	}

	if (batchDepth === 0) {
		flushEffects();
	}
}

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
	if (Object.is(state.value, value)) {
		return;
	}

	state.value = value;

	emitValue(state);
}
