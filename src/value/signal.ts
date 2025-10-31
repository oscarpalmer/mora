import {NAME_SIGNAL} from '../constants';
import {emitValue, getValue} from '../helpers/value';
import type {ReactiveOptions} from '../models';
import {Reactive} from './reactive';

export class Signal<Value> extends Reactive<Value> {
	constructor(value: Value, options?: ReactiveOptions<Value>) {
		super(NAME_SIGNAL, value, options);
	}

	/**
	 * @inheritdoc
	 */
	get(): Value {
		return getValue(this.state);
	}

	/**
	 * Set the value
	 * @param value New value
	 */
	set(value: Value): void {
		if (!this.state.equal(this.state.value, value)) {
			this.state.value = value;

			emitValue(this.state);
		}
	}

	/**
	 * Update the value _(based on the current value)_
	 * @param callback Callback to update the value
	 */
	update(callback: (value: Value) => Value): void {
		this.set(callback(this.state.value));
	}
}

/**
 * Create a reactive value
 * @param value Initial value
 * @param options Optional reactivity options
 * @returns Reactive value
 */
export function signal<Value>(
	value: Value,
	options?: ReactiveOptions<Value>,
): Signal<Value> {
	return new Signal<Value>(value, options);
}
