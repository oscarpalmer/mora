import type {Computed} from './computed';
import type {Effect} from './effect';
import {
	type Subscription,
	type Unsubscribe,
	subscribe,
	unsubscribe,
} from './subscription';

export abstract class Reactive<Value> {
	protected readonly state: ReactiveState<Value> = {
		computeds: new Set(),
		effects: new Set(),
		subscriptions: new Map(),
		value: undefined as never,
	};

	constructor(name: string, value: Value) {
		this.state.value = value;

		Object.defineProperty(this, '$mora', {
			value: name,
		});
	}

	/**
	 * Get the value
	 */
	abstract get(): Value;

	/**
	 * Get the value _(without reactivity)_
	 */
	peek(): Value {
		return this.state.value;
	}

	/**
	 * Subscribe to changes
	 */
	subscribe(callback: (value: Value) => void): Unsubscribe {
		return subscribe(this.state, callback);
	}

	/**
	 * JSON representation of the value
	 */
	toJSON(): Value {
		return this.get();
	}

	/**
	 * String representation of the value
	 */
	toString(): string {
		return String(this.get());
	}

	/**
	 * Unsubscribe from changes
	 */
	unsubscribe(callback: (value: Value) => void): void {
		unsubscribe(this.state, callback);
	}
}

export type ReactiveState<Value> = {
	computeds: Set<Computed<unknown>>;
	effects: Set<Effect>;
	subscriptions: Map<(value: Value) => void, Subscription<Value>>;
	value: Value;
};
