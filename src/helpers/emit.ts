import {batchDepth, batchedHandlers, flushEffects} from '../batch';
import type {InternalComputed} from '../value/computed';
import type {ReactiveState} from '../value/reactive';

export function emitArrayChanges(first: unknown[], second: unknown[]): boolean {
	let {length} = first;

	if (length !== second.length) {
		return true;
	}

	let offset = 0;

	if (length >= 100) {
		offset = Math.round(length / 10);
		offset = offset > 25 ? 25 : offset;

		for (let index = 0; index < offset; index += 1) {
			if (!Object.is(first[index], second[index])) {
				return true;
			}
		}
	}

	length -= offset;

	for (let index = offset; index < length; index += 1) {
		if (!Object.is(first[index], second[index])) {
			return true;
		}
	}

	return false;
}

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
