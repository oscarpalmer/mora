import {NAME_MORA} from '../constants';
import type {ReactiveOptions, ReactiveState, Unsubscribe} from '../models';
import {subscribe, unsubscribe} from '../subscription';

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

		Object.defineProperty(this, NAME_MORA, {
			value: name,
		});
	}

	/**
	 * Get the value
	 * @return Current value
	 */
	abstract get(): Value;

	/**
	 * Get the value _(without reactivity)_
	 * @return Current value
	 */
	peek(): Value {
		return this.state.value;
	}

	/**
	 * Subscribe to changes
	 * @param callback Callback for changes
	 * @return Unsubscribe callback
	 */
	subscribe(callback: (value: Value) => void): Unsubscribe {
		return subscribe(this.state, callback);
	}

	/**
	 * JSON representation of the value
	 * @return JSON value
	 */
	toJSON(): Value {
		return this.get();
	}

	/**
	 * String representation of the value
	 * @return Value as string
	 */
	toString(): string {
		return String(this.get());
	}

	/**
	 * Unsubscribe from changes
	 * @param callback Callback to unsubscribe
	 */
	unsubscribe(callback: (value: Value) => void): void {
		unsubscribe(this.state, callback);
	}
}
