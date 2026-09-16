import type {GenericAsyncCallback, GenericCallback} from '@oscarpalmer/atoms/models';
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
import {getJsonValue, getStringValue, handleSignal, peekSignalValue} from '../helpers/value';
import type {
	Computed,
	ComputedEffect,
	InternalComputed,
	InternalStateful,
	ReactiveOptions,
} from '../models';

// #region Instance

function Computed(this: any, callback: GenericCallback, options?: ReactiveOptions<unknown>) {
	this[SYMBOL_STATE] = getState(undefined, options);
	this[SYMBOL_EFFECT] = getComputedEffect(this, callback);
}

Computed.prototype[NAME_MORA] = NAME_COMPUTED;

Computed.prototype.get = getComputedValue;
Computed.prototype.peek = peekSignalValue;
Computed.prototype.subscribe = subscribeToSignal;
Computed.prototype.toJSON = getJsonValue;
Computed.prototype.toString = getStringValue;

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
	return getComputed(callback, options)[0] as Computed<Value>;
}

function getComputed<Value>(
	callback: GenericCallback,
	options?: ReactiveOptions<Value>,
): [InternalComputed, ComputedEffect] {
	if (typeof callback !== 'function') {
		throw new TypeError('Computed callback must be a function');
	}

	// @ts-expect-error All good, no worries :-)
	const instance = new Computed(callback, options);

	return [instance, instance[SYMBOL_EFFECT]];
}

function getComputedEffect(
	instance: InternalStateful,
	callback: GenericAsyncCallback,
): ComputedEffect {
	const fx: ComputedEffect = {
		dirty: true,
		instance: undefined as never,
	};

	fx.instance = internalEffect(() => {
		if (fx.dirty) {
			const previousComputed = ACTIVE.computed;

			ACTIVE.computed = fx;

			handleSignal(instance, callback, setAndEmit, () => {
				ACTIVE.computed = previousComputed;
			});

			fx.dirty = false;
		}
	});

	return fx;
}

function getComputedValue(this: InternalComputed): unknown {
	const fx = this[SYMBOL_EFFECT];
	const state = this[SYMBOL_STATE];

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

export function internalComputed(
	callback: GenericCallback,
	options?: ReactiveOptions<unknown>,
): [InternalComputed, ComputedEffect] {
	return getComputed(callback, options);
}

function setAndEmit(instance: InternalStateful, value: unknown): void {
	const state = instance[SYMBOL_STATE];

	if ((state.equal ?? Object.is)(state.value, value)) {
		return;
	}

	state.value = value;

	if (state.computeds != null && state.computeds.size > 0) {
		for (const computed of state.computeds) {
			computed.dirty = true;
		}
	}

	if (state.effects != null && state.effects.size > 0) {
		for (const effect of state.effects) {
			BATCH.handlers.set(effect, effect);
		}
	}

	for (const type of SUBSCRIPTION_TYPES) {
		if (type === SUBSCRIPTION_TYPE_FROZEN) {
			continue;
		}

		const subscriptions = state.subscriptions?.values.to.keyed?.get(type);

		if (subscriptions != null && subscriptions.size > 0) {
			const copy = SUBSCRIPTION_TYPES_COPY.has(type);

			for (const [, callback] of subscriptions) {
				callback(peekSignalValue.call(instance, copy));
			}
		}
	}

	flushHandlers();
}

// #endregion
