import {signalName} from '../helpers/is';
import {differentValues, emitValue, getValue} from '../helpers/value';
import {Reactive, type ReactiveOptions} from './reactive';

export class Signal<Value> extends Reactive<Value> {
	constructor(value: Value, options?: ReactiveOptions<Value>) {
		super(signalName, value, options);
	}

	/**
	 * @inheritdoc
	 */
	get(): Value {
		return getValue(this.state);
	}

	/**
	 * Set the value
	 */
	set(value: Value): void {
		if (differentValues(this.state, this.state.value, value)) {
			this.state.value = value;

			emitValue(this.state);
		}
	}

	/**
	 * Update the value
	 */
	update(callback: (value: Value) => Value): void {
		this.set(callback(this.state.value));
	}
}

/**
 * Create a reactive value
 */
export function signal<Value>(
	value: Value,
	options?: ReactiveOptions<Value>,
): Signal<Value> {
	return new Signal<Value>(value, options);
}
