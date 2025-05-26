import {batchDepth, batchedHandlers, flushEffects} from './batch';
import {type InternalComputed, activeComputed} from './computed';
import {activeEffect} from './effect';
import {Reactive} from './reactive';

export class Signal<Value> extends Reactive<Value> {
	constructor(value: Value) {
		super('signal', value);
	}

	/**
	 * Get the value
	 */
	get(): Value {
		if (activeComputed != null) {
			this.state.computeds.add(activeComputed);
		}

		if (activeEffect != null) {
			this.state.effects.add(activeEffect);
		}

		return this.state.value;
	}

	/**
	 * Set the value
	 */
	set(value: Value): void {
		if (Object.is(this.state.value, value)) {
			return;
		}

		this.state.value = value;

		for (const computed of this.state.computeds) {
			(computed as unknown as InternalComputed).effect.dirty = true;
		}

		for (const effect of this.state.effects) {
			batchedHandlers.add(effect);
		}

		for (const [, subscription] of this.state.subscriptions) {
			batchedHandlers.add(subscription as never);
		}

		if (batchDepth === 0) {
			flushEffects();
		}
	}

	/**
	 * Update the value
	 */
	update(callback: (value: Value) => Value): void {
		this.set(callback(this.state.value));
	}
}

export function signal<Value>(value: Value): Signal<Value> {
	return new Signal(value);
}
