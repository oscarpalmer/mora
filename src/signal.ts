import {type Computed, activeComputed} from './computed';
import {type Effect, activeEffect, runEffect} from './effect';

type SignalState<Value> = {
	computeds: Set<Computed<unknown>>;
	effects: Set<Effect>;
	value: Value;
};

export const dirtyEffects = new Set<Effect>();

export class Signal<Value> {
	readonly state: SignalState<Value>;

	constructor(value: Value) {
		this.state = {
			value,
			computeds: new Set(),
			effects: new Set(),
		};
	}

	get(): Value {
		if (activeComputed != null) {
			this.state.computeds.add(activeComputed);
		}

		if (activeEffect != null) {
			this.state.effects.add(activeEffect);
		}

		return this.state.value;
	}

	set(value: Value): void {
		if (Object.is(this.state.value, value)) {
			return;
		}

		this.state.value = value;

		for (const computed of this.state.computeds) {
			computed.state.dirty = true;

			dirtyEffects.add(computed.state.effect);
		}

		for (const effect of this.state.effects) {
			dirtyEffects.add(effect);
		}

		while (dirtyEffects.size > 0) {
			const effects = [...dirtyEffects];

			dirtyEffects.clear();

			for (const effect of effects) {
				runEffect(effect);
			}
		}
	}

	update(callback: (value: Value) => Value): void {
		this.set(callback(this.state.value));
	}
}

export function signal<Value>(value: Value): Signal<Value> {
	return new Signal(value);
}
