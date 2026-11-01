import type {GenericAsyncCallback, GenericCallback} from '@oscarpalmer/atoms/models';
import {flushHandlers} from '../batch';
import {
	ACTIVE,
	BATCH,
	MESSAGE_COMPUTED_CALLBACK,
	NAME_COMPUTED,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPES,
	SUBSCRIPTION_TYPES_COPY,
	SYMBOL_EFFECT,
	SYMBOL_STATE,
} from '../constants';
import {internalEffect, runEffect, setParent} from '../effect';
import {deactivateComputed, getReactiveActive, getState} from '../helpers/misc';
import {subscribeToSignal} from '../helpers/subscription';
import {
	getJsonValue,
	getStringValue,
	handleSignal,
	notifyObservers,
	peekSignalValue,
	trackSignal,
} from '../helpers/value';
import type {
	Computed,
	ComputedEffect,
	InternalComputed,
	InternalStateful,
	Parent,
	ReactiveOptions,
} from '../models';

// #region Instance

function Computed(this: any, callback: GenericCallback, options?: ReactiveOptions<unknown>): void {
	this[SYMBOL_STATE] = getState(NAME_COMPUTED, undefined, options);
	this[SYMBOL_EFFECT] = getComputedEffect(this, callback);
}

Computed.prototype.deactivate = deactivateComputed;
Computed.prototype.get = getComputedValue;
Computed.prototype.peek = peekSignalValue;
Computed.prototype.subscribe = subscribeToSignal;
Computed.prototype.toJSON = getJsonValue;
Computed.prototype.toString = getStringValue;

Object.defineProperties(Computed.prototype, {
	active: {
		enumerable: true,
		get: getReactiveActive,
	},
});

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
	return getComputed(callback, options, ACTIVE.effect) as Computed<Value>;
}

function getComputed<Value>(
	callback: GenericCallback,
	options?: ReactiveOptions<Value>,
	parent?: Parent,
): InternalComputed {
	if (typeof callback !== 'function') {
		throw new TypeError(MESSAGE_COMPUTED_CALLBACK);
	}

	// @ts-expect-error All good, no worries :-)
	const instance: InternalComputed = new Computed(callback, options);

	setParent(instance, instance[SYMBOL_EFFECT].instance, parent);

	return instance;
}

function getComputedEffect(
	instance: InternalStateful,
	callback: GenericAsyncCallback,
): ComputedEffect {
	const fx: ComputedEffect = {
		dirty: true,
		instance: undefined as never,
		notify: false,
	};

	fx.instance = internalEffect(() => {
		fx.dirty = false;

		handleSignal(
			instance,
			callback,
			setAndEmit,
			() => {
				fx.notify = false;
			},
			fx.notify,
		);
	}, fx);

	return fx;
}

function getComputedValue(this: InternalComputed): unknown {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return state.value;
	}

	const fx = this[SYMBOL_EFFECT];

	trackSignal(state, fx.instance);

	if (fx.dirty && BATCH.depth === 0) {
		runEffect(fx.instance);
	}

	return state.value;
}

export function internalComputed(
	callback: GenericCallback,
	options?: ReactiveOptions<unknown>,
	parent?: Parent,
): InternalComputed {
	return getComputed(callback, options, parent);
}

function setAndEmit(instance: InternalStateful, value: unknown, notify: boolean): void {
	const state = instance[SYMBOL_STATE];

	if (!state.active || (!notify && (state.equal ?? Object.is)(state.value, value))) {
		return;
	}

	state.value = value;

	notifyObservers(state);

	const previousEffect = ACTIVE.effect;

	ACTIVE.effect = undefined;

	try {
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
	} finally {
		ACTIVE.effect = previousEffect;
	}

	flushHandlers();
}

// #endregion
