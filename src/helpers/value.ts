import {batchDepth, batchedHandlers, flushHandlers} from '../batch';
import {activeEffect} from '../effect';
import {type InternalComputed, activeComputed} from '../value/computed';
import type {ReactiveState} from '../value/reactive';

export function differentArrays<Value>(
	state: ReactiveState<Value[], Value>,
	first: Value[],
	second: Value[],
): boolean {
	let {length} = first;

	if (length !== second.length) {
		return true;
	}

	let offset = 0;

	if (length >= 100) {
		offset = Math.round(length / 10);
		offset = offset > 25 ? 25 : offset;

		for (let index = 0; index < offset; index += 1) {
			if (!state.equal(first[index], second[index])) {
				return true;
			}
		}
	}

	length -= offset;

	for (let index = offset; index < length; index += 1) {
		if (!state.equal(first[index], second[index])) {
			return true;
		}
	}

	return false;
}

export function differentValues<Value>(
	state: ReactiveState<Value, Value>,
	first: Value,
	second: Value,
): boolean {
	return Array.isArray(first) && Array.isArray(second)
		? differentArrays(state as never, first, second)
		: !state.equal(first, second);
}

export function emitValue<Value>(state: ReactiveState<Value, never>): void {
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
		flushHandlers();
	}
}

export function getValue<Value>(state: ReactiveState<Value, never>): Value {
	if (activeComputed != null) {
		state.computeds.add(activeComputed);
	}

	if (activeEffect != null) {
		state.effects.add(activeEffect);
	}

	return state.value;
}
