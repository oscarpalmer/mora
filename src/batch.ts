import {dirtyEffects, runEffect} from './effect';

export function flushEffects(): void {
	while (batchDepth === 0 && dirtyEffects.size > 0) {
		const effects = [...dirtyEffects];

		dirtyEffects.clear();

		for (const effect of effects) {
			runEffect(effect);
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

export let batchDepth = 0;
