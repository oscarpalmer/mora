import {BATCH} from './constants';
import {runEffect} from './effect';
import {isEffect} from './helpers/is';

export function flushHandlers(): void {
	while (BATCH.depth === 0 && BATCH.handlers.size > 0) {
		const handlers = [...BATCH.handlers];

		BATCH.handlers.clear();

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
