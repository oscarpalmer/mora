import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {Effect} from '../effect';
import {
	type Subscription,
	type Unsubscribe,
	subscribe,
	unsubscribe,
} from '../subscription';
import type {Computed} from './computed';

export abstract class Reactive<Value, Equal = Value> {
	protected readonly state: ReactiveState<Value, Equal> = {
		computeds: new Set(),
		effects: new Set(),
		equal: Object.is,
		subscriptions: new Map(),
		value: undefined as never,
	};

	constructor(name: string, value: Value, options?: ReactiveOptions<Equal>) {
		this.state.value = value;

		if (typeof options === 'object' && typeof options.equal === 'function') {
			this.state.equal = options.equal;
		}

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

export type ReactiveOptions<Value> = {
	/**
	 * Method to compare values for equality
	 */
	equal?: (first: Value, second: Value) => boolean;
};

export type ReactiveState<Value, Equal> = {
	computeds: Set<Computed<unknown>>;
	effects: Set<Effect>;
	equal: (first: Equal, second: Equal) => boolean;
	subscriptions: Map<GenericCallback, Subscription>;
	value: Value;
};
