import {BATCH} from './constants';
import {runEffect} from './effect';
import type {EffectState, Subscription} from './models';

export function flushHandlers(): void {
	if (BATCH.flushing) {
		return;
	}

	BATCH.flushing = true;

	try {
		while (BATCH.depth === 0 && BATCH.handlers.size > 0) {
			const handlers = [...BATCH.handlers];
			const {length} = handlers;

			BATCH.handlers.clear();

			for (let index = 0; index < length; index += 1) {
				const handler = handlers[index];

				if (typeof (handler as Subscription).destroy === 'function') {
					(handler as Subscription).callback((handler as Subscription).state.value);
				} else {
					runEffect(handler as EffectState);
				}
			}
		}
	} finally {
		BATCH.flushing = false;
	}
}

/**
 * Start batching effects
 *
 * _(Use {@link stopBatch} to flush and run batched effects)_
 */
export function startBatch(): void {
	BATCH.depth += 1;
}

/**
 * Stop batching effects and flush _(run)_ them
 */
export function stopBatch(): void {
	if (BATCH.depth > 0) {
		BATCH.depth -= 1;
	}

	flushHandlers();
}
