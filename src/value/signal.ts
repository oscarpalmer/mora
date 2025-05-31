import {signalName} from '../helpers/is';
import {getValue, setValue} from '../helpers/value';
import {Reactive} from './reactive';

export class Signal<Value> extends Reactive<Value> {
	constructor(value: Value) {
		super(signalName, value);
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
		setValue(this.state, value);
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
export function signal<Value>(value: Value): Signal<Value> {
	return new Signal(value);
}
