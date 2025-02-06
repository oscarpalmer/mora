import {Effect, activeEffect, runEffect} from './effect';

export class Computed<Value> extends Effect {
	dirty = true;
	effects = new Set<Effect>();
	value!: Value;

	constructor(callback: () => Value) {
		super();

		this.callback = () => {
			if (this.dirty) {
				this.value = callback();
				this.dirty = false;
			}
		};

		runEffect(this);
	}

	get(): Value {
		if (activeEffect != null && activeEffect !== this) {
			this.effects.add(activeEffect);
		}

		if (this.dirty) {
			runEffect(this);
		}

		return this.value;
	}
}

export function computed<Value>(callback: () => Value): Computed<Value> {
	return new Computed(callback);
}
