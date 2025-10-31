import {flushHandlers} from '../batch';
import {
	ACTIVE,
	ARRAY_OFFSET,
	ARRAY_PEEK,
	ARRAY_THRESHOLD,
	BATCH,
} from '../constants';
import type {InternalComputed, ReactiveState} from '../models';

export function emitValue<Value>(state: ReactiveState<Value, never>): void {
	for (const computed of state.computeds) {
		(computed as unknown as InternalComputed).effect.dirty = true;
	}

	for (const effect of state.effects) {
		BATCH.handlers.add(effect);
	}

	for (const [, subscription] of state.subscriptions) {
		BATCH.handlers.add(subscription);
	}

	if (BATCH.depth === 0) {
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

	if (length >= ARRAY_THRESHOLD) {
		offset = Math.round(length / ARRAY_PEEK);
		offset = offset > ARRAY_OFFSET ? ARRAY_OFFSET : offset;

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
	if (ACTIVE.computed != null) {
		state.computeds.add(ACTIVE.computed);
	}

	if (ACTIVE.effect != null) {
		state.effects.add(ACTIVE.effect);
	}

	return state.value;
}
