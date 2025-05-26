import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {batchDepth, batchedHandlers, flushEffects} from './batch';
import {type Computed, type InternalComputed, activeComputed} from './computed';
import {type Effect, activeEffect} from './effect';
import {
	type Subscription,
	type Unsubscribe,
	subscribe,
	unsubscribe,
} from './subscription';

export type SignalState<Value> = {
	computeds: Set<Computed<unknown>>;
	effects: Set<Effect>;
	subscriptions: Map<GenericCallback, Subscription>;
	value: Value;
};

export class Signal<Value> {
	private declare readonly $mora: string;

	private readonly state: SignalState<Value>;

	constructor(value: Value) {
		Object.defineProperty(this, '$mora', {
			value: 'signal',
		});

		this.state = {
			value,
			computeds: new Set(),
			effects: new Set(),
			subscriptions: new Map(),
		};
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
	 * Get the value _(without reactivity)_
	 */
	peek(): Value {
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
			(computed as unknown as InternalComputed).state.dirty = true;
		}

		for (const effect of this.state.effects) {
			batchedHandlers.add(effect);
		}

		for (const [, subscription] of this.state.subscriptions) {
			batchedHandlers.add(subscription);
		}

		if (batchDepth === 0) {
			flushEffects();
		}
	}

	/**
	 * Subscribe to changes
	 */
	subscribe(callback: (value: Value) => void): Unsubscribe {
		return subscribe(this.state, callback);
	}

	/**
	 * Unsubscribe from changes
	 */
	unsubscribe(callback: (value: Value) => void): void {
		unsubscribe(this.state, callback);
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
