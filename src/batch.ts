import {ACTIVE, BATCH} from './constants';
import {refreshObserver} from './effect';
import {getFrozenValue, peekSignalValue} from './helpers/value';
import type {ObserverState, StoredSubscription} from './models';

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

	const {queue} = BATCH;

	let index = 0;

	try {
		while (BATCH.depth === 0 && index < queue.length) {
			const handler = queue[index];

			index += 1;

			runHandler(handler);
		}
	} finally {
		ACTIVE.effect = previousEffect;
		ACTIVE.parent = previousParent;

		BATCH.flushing = false;

		if (index >= queue.length) {
			queue.length = 0;
		} else {
			queue.splice(0, index);
		}
	}
}

export function queueObserver(node: ObserverState): void {
	if (!node.queued) {
		node.queued = true;

		BATCH.queue.push(node);
	}
}

function runHandler(handler: ObserverState | StoredSubscription): void {
	if ('subscription' in handler) {
		BATCH.subscriptions.delete(handler.subscription);

		if (handler.subscription.active) {
			handler.callback(
				handler.frozen
					? getFrozenValue(handler.state.value)
					: peekSignalValue.call(handler.instance, handler.copy),
			);
		}

		return;
	}

	handler.queued = false;

	if (handler.active) {
		refreshObserver(handler);
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
