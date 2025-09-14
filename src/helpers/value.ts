import {batchDepth, batchedHandlers, flushHandlers} from '../batch';
import {activeEffect} from '../effect';
import {activeComputed, type InternalComputed} from '../value/computed';
import type {ReactiveState} from '../value/reactive';

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

export function equalArrays<Value>(
	state: ReactiveState<Value[], Value>,
	first: Value[],
	second: Value[],
): boolean {
	let {length} = first;

	if (length !== second.length) {
		return false;
	}

	let offset = 0;

	if (length >= 100) {
		offset = Math.round(length / 10);
		offset = offset > 25 ? 25 : offset;

		for (let index = 0; index < offset; index += 1) {
			if (!state.equal(first[index], second[index])) {
				return false;
			}
		}
	}

	length -= offset;

	for (let index = offset; index < length; index += 1) {
		if (!state.equal(first[index], second[index])) {
			return false;
		}
	}

	return true;
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
