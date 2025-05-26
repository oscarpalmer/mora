import {type Effect, runEffect} from './effect';
import {isEffect} from './is';
import type {Subscription} from './subscription';

export function flushEffects(): void {
	while (batchDepth === 0 && batchedHandlers.size > 0) {
		const handlers = [...batchedHandlers];

		batchedHandlers.clear();

		for (const handler of handlers) {
			if (isEffect(handler)) {
				runEffect(handler);
			} else {
				handler.callback(handler.state.value);
			}
		}
	}
}

/**
 * Start batching effects _(use `stopBatch` to flush and run batched effects)_
 */
export function startBatch(): void {
	batchDepth += 1;
}

/**
 * Stop batching effects and flush _(run)_ them
 */
export function stopBatch(): void {
	if (batchDepth > 0) {
		batchDepth -= 1;
	}

	flushEffects();
}

export const batchedHandlers = new Set<Effect | Subscription>();

export let batchDepth = 0;
