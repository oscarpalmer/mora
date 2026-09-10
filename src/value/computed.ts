import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {flushHandlers} from '../batch';
import {
	ACTIVE,
	BATCH,
	NAME_COMPUTED,
	NAME_MORA,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPES,
	SUBSCRIPTION_TYPES_COPY,
	SYMBOL_EFFECT,
	SYMBOL_STATE,
} from '../constants';
import {internalEffect, runEffect} from '../effect';
import {getState} from '../helpers/misc';
import {subscribeToSignal} from '../helpers/subscription';
import {getStringValue, handleSimpleValue, peekSimpleValue} from '../helpers/value';
import type {Computed, ComputedEffect, ReactiveOptions, ReactiveState} from '../models';

// #region Instance

function Computed<Value>(this: any, callback: GenericCallback, options?: ReactiveOptions<Value>) {
	this[SYMBOL_STATE] = getState<Value, Value>(undefined as never, options);

	this[SYMBOL_EFFECT] = getComputedEffect(this[SYMBOL_STATE], callback);
}

Computed.prototype[NAME_MORA] = NAME_COMPUTED;

Computed.prototype.get = function () {
	return getValue(this[SYMBOL_STATE], this[SYMBOL_EFFECT]);
};

Computed.prototype.peek = function (copy?: never) {
	return peekSimpleValue(this[SYMBOL_STATE].value, copy === true);
};

Computed.prototype.subscribe = function (subscriber: never, copy?: never) {
	return subscribeToSignal(this[SYMBOL_STATE], subscriber, copy === true);
};

Computed.prototype.toJSON = function () {
	return this[SYMBOL_STATE].value;
};

Computed.prototype.toString = function (json?: boolean) {
	return getStringValue(this[SYMBOL_STATE], json);
};

// #endregion

// #region Functions

/**
 * Create a computed value
 *
 * @param callback Callback to compute the value
 * @param options Reactivity options
 * @returns Computed value
 */
export function computed<Value>(
	callback: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Computed<Value> {
	return getComputed(callback, options)[0];
}

function getComputed<Value>(
	callback: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): [Computed<Value>, ComputedEffect] {
	if (typeof callback !== 'function') {
		throw new TypeError('Computed callback must be a function');
	}

	// @ts-expect-error All good, no worries :-)
	const instance = new Computed(callback, options);

	return [instance as never, instance[SYMBOL_EFFECT]];
}

function getComputedEffect<Value>(
	state: ReactiveState<Value, Value>,
	callback: () => Value | Promise<Value>,
): ComputedEffect {
	const fx: ComputedEffect = {
		dirty: true,
		instance: undefined as never,
	};

	fx.instance = internalEffect(() => {
		if (fx.dirty) {
			const previousComputed = ACTIVE.computed;

			ACTIVE.computed = fx;

			handleSimpleValue(state, callback, setAndEmit, () => {
				ACTIVE.computed = previousComputed;
			});

			fx.dirty = false;
		}
	});

	return fx;
}

function getValue<Value>(state: ReactiveState<Value, Value>, fx: ComputedEffect): Value {
	if (ACTIVE.computed != null && fx !== ACTIVE.computed) {
		state.computeds ??= new Set();

		state.computeds.add(ACTIVE.computed);
	}

	if (ACTIVE.effect != null && ACTIVE.effect !== fx.instance) {
		state.effects ??= new Set();

		state.effects.add(ACTIVE.effect);
	}

	if (fx.dirty && BATCH.depth === 0) {
		runEffect(fx.instance);
	}

	return state.value;
}

export function internalComputed<Value>(
	callback: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): [Computed<Value>, ComputedEffect] {
	return getComputed(callback, options);
}

function setAndEmit<Value>(state: ReactiveState<Value, Value>, value: Value): void {
	if (state.equal(state.value, value)) {
		return;
	}

	state.value = value;

	if (state.computeds != null) {
		for (const computed of state.computeds) {
			computed.dirty = true;
		}
	}

	if (state.effects != null) {
		for (const effect of state.effects) {
			BATCH.handlers.set(effect, effect);
		}
	}

	for (const type of SUBSCRIPTION_TYPES) {
		if (type === SUBSCRIPTION_TYPE_FROZEN) {
			continue;
		}

		const copy = SUBSCRIPTION_TYPES_COPY.has(type);
		const subscriptions = state.subscriptions?.values.to.keyed?.get(type);

		if (subscriptions != null) {
			for (const [, callback] of subscriptions) {
				callback(peekSimpleValue(state.value, copy));
			}
		}
	}

	flushHandlers();
}

// #endregion
