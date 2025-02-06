import {Computed} from './computed';
import {type Effect, activeEffect, runEffect} from './effect';

type SignalState<Value> = {
	observers: Set<Computed<never> | Effect>;
	value: Value;
};

const dirtyEffects = new Set<Effect>();

let batchDepth = 0;

export class Signal<Value> {
	readonly state: SignalState<Value>;

	constructor(value: Value) {
		this.state = {
			value,
			observers: new Set(),
		};
	}

	get(): Value {
		if (activeEffect != null) {
			this.state.observers.add(activeEffect);
			activeEffect.signals.add(this as never);
		}

		return this.state.value;
	}

	set(value: Value): void {
		if (Object.is(this.state.value, value)) {
			return;
		}

		this.state.value = value;

		const isOutermostBatch = batchDepth === 0;

		batchDepth += 1;

		try {
			for (const observer of this.state.observers) {
				if (observer instanceof Computed) {
					observer.dirty = true;

					dirtyEffects.add(observer);

					for (const effect of observer.effects) {
						dirtyEffects.add(effect);
					}
				} else {
					dirtyEffects.add(observer);
				}
			}

			if (isOutermostBatch) {
				queueMicrotask(() => {
					try {
						for (const effect of dirtyEffects) {
							runEffect(effect);
						}
					} finally {
						dirtyEffects.clear();

						batchDepth = 0;
					}
				});
			}
		} finally {
			if (isOutermostBatch) {
				batchDepth -= 1;
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
