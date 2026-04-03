import {NAME_SIGNAL} from '../constants';
import {emitValue, getValue} from '../helpers/value';
import type {ReactiveOptions, ReactiveState} from '../models';
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
	set(value: Value | (() => Value | Promise<Value>) | Promise<Value>): void {
		setValue<Value>(this.state, value);
	}

	/**
	 * Update the value _(based on the current value)_
	 * @param callback Callback to update the value
	 */
	update(callback: (value: Value) => Value): void {
		this.set(callback(this.state.value));
	}
}

function setAndEmit<Value>(state: ReactiveState<Value, Value>, value: Value): void {
	if (!state.equal(state.value, value)) {
		state.value = value;

		emitValue(state);
	}
}

function setValue<Value>(
	state: ReactiveState<Value, Value>,
	value: Value | (() => Value | Promise<Value>) | Promise<Value>,
): void {
	try {
		let actual = value;

		if (typeof value === 'function') {
			actual = (value as () => Value | Promise<Value>)() as Value | Promise<Value>;
		}

		if (actual instanceof Promise) {
			state.promise = actual;

			void actual
				.then(value => {
					if (actual === state.promise) {
						state.promise = undefined;

						setAndEmit(state, value);
					}
				})
				.catch(() => {
					if (actual === state.promise) {
						state.promise = undefined;
					}
				});
		} else {
			setAndEmit(state, actual as Value);
		}
	} catch {}
}

/**
 * Create a reactive value from a function result
 * @param value Initial value
 * @param options Reactivity options
 * @returns Reactive value
 */
export function signal<Value>(
	value: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Signal<Value>;

/**
 * Create a reactive value from a promise
 * @param value Initial value
 * @param options Reactivity options
 * @returns Reactive value
 */
export function signal<Value>(
	value: Promise<Value>,
	options?: ReactiveOptions<Value>,
): Signal<Value>;

/**
 * Create a reactive value
 * @param value Initial value
 * @param options Reactivity options
 * @returns Reactive value
 */
export function signal<Value>(value: Value, options?: ReactiveOptions<Value>): Signal<Value>;

export function signal<Value>(
	value: Value | (() => Value | Promise<Value>) | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Signal<Value> {
	const instance = new Signal<Value>(undefined as unknown as Value, options);

	instance.set(value);

	return instance;
}
