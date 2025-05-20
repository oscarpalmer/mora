import {batchDepth, flushEffects} from './batch';
import {type Computed, type InternalComputed, activeComputed} from './computed';
import {type Effect, activeEffect, dirtyEffects} from './effect';

type SignalState<Value> = {
	computeds: Set<Computed<unknown>>;
	effects: Set<Effect>;
	value: Value;
};

export class Signal<Value> {
	private readonly state: SignalState<Value>;

	constructor(value: Value) {
		this.state = {
			value,
			computeds: new Set(),
			effects: new Set(),
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

			dirtyEffects.add((computed as unknown as InternalComputed).state.effect);
		}

		for (const effect of this.state.effects) {
			dirtyEffects.add(effect);
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
