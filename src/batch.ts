import {ACTIVE, BATCH} from './constants';
import {runEffect} from './effect';
import {getFrozenValue, peekSignalValue} from './helpers/value';
import type {EffectState, StoredSubscription} from './models';

// #region Functions

export function flushHandlers(): void {
	if (BATCH.flushing) {
		return;
	}

	BATCH.flushing = true;

	const previousEffect = ACTIVE.effect;
	const previousParent = ACTIVE.parent;

	ACTIVE.effect = undefined;
	ACTIVE.parent = undefined;

	try {
		while (BATCH.depth === 0 && BATCH.handlers.size > 0) {
			const handlers = BATCH.handlers;

			BATCH.handlers = BATCH.queue;
			BATCH.queue = handlers;

			for (const [owner, handler] of handlers) {
				if (!owner.active) {
					continue;
				}

				const subscription = handler as StoredSubscription;

				if (typeof subscription.frozen === 'boolean') {
					subscription.callback(
						subscription.frozen
							? getFrozenValue(subscription.state.value)
							: peekSignalValue.call(subscription.instance, subscription.copy),
					);
				} else {
					runEffect(handler as EffectState);
				}
			}

			handlers.clear();
		}
	} finally {
		ACTIVE.effect = previousEffect;
		ACTIVE.parent = previousParent;

		BATCH.flushing = false;
		BATCH.queue.clear();
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

// #endregion
