import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {Subscription} from '@oscarpalmer/atoms/subscription';
import {
	ACTIVE,
	MESSAGE_COMPUTED_CALLBACK,
	NAME_COMPUTED,
	STATUS_DIRTY,
	SYMBOL_STATE,
} from '../constants';
import {refreshObserver, setParent} from '../effect';
import {deactivateComputed, getReactiveActive, getState} from '../helpers/misc';
import {subscribeToSignal} from '../helpers/subscription';
import {
	emitValue,
	getJsonValue,
	getStringValue,
	handleSignal,
	peekSignalValue,
	trackSignal,
} from '../helpers/value';
import type {
	Computed,
	ComputedState,
	InternalComputed,
	InternalStateful,
	Parent,
	ReactiveOptions,
	Subscriber,
} from '../models';

// #region Instance

function Computed(
	this: InternalComputed,
	callback: GenericCallback,
	options?: ReactiveOptions<unknown>,
): void {
	const state: ComputedState = {
		...getState(NAME_COMPUTED, undefined, options),
		callback: () => {
			// Forced by `notify()` on arrays and stores; emits even if the value is equal
			const {notify} = state;

			state.notify = false;

			handleSignal(this, callback, setAndEmit, notify);
		},
		cursor: undefined,
		firstChild: undefined,
		firstSource: undefined,
		lastChild: undefined,
		lastSource: undefined,
		nextSibling: undefined,
		notify: false,
		parent: undefined,
		previousSibling: undefined,
		queued: false,
		// Lazy: computed on first read
		status: STATUS_DIRTY,
		version: 0,
	};

	this[SYMBOL_STATE] = state;
}

Computed.prototype.deactivate = deactivateComputed;
Computed.prototype.get = getComputedValue;
Computed.prototype.peek = peekComputedValue;
Computed.prototype.subscribe = subscribeToComputed;
Computed.prototype.toJSON = getComputedJson;
Computed.prototype.toString = getComputedString;

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
	return getComputed(callback, options, ACTIVE.parent) as Computed<Value>;
}

export function getComputed<Value>(
	callback: GenericCallback,
	options?: ReactiveOptions<Value>,
	parent?: Parent,
): InternalComputed {
	if (typeof callback !== 'function') {
		throw new TypeError(MESSAGE_COMPUTED_CALLBACK);
	}

	// @ts-expect-error All good, no worries :-)
	const instance: InternalComputed = new Computed(callback, options);

	setParent(instance[SYMBOL_STATE], parent);

	return instance;
}

function getComputedJson(this: InternalComputed): unknown {
	refreshComputed(this);

	return getJsonValue.call(this);
}

function getComputedString(this: InternalComputed, json?: boolean): string {
	refreshComputed(this);

	return getStringValue.call(this, json);
}

function getComputedValue(this: InternalComputed): unknown {
	const state = this[SYMBOL_STATE];

	if (state.active) {
		trackSignal(state, state);
		refreshObserver(state);
	}

	return state.value;
}

function peekComputedValue(this: InternalComputed, copy?: boolean): unknown {
	refreshComputed(this);

	return peekSignalValue.call(this, copy);
}

function refreshComputed(instance: InternalComputed): void {
	// For reads that shouldn't be tracked, but must still return an up-to-date value

	const state = instance[SYMBOL_STATE];

	if (state.active) {
		refreshObserver(state);
	}
}

function setAndEmit(instance: InternalStateful, value: unknown, notify: boolean): void {
	const state = instance[SYMBOL_STATE] as ComputedState;

	if (!state.active || (!notify && (state.equal ?? Object.is)(state.value, value))) {
		return;
	}

	state.value = value;

	// When recomputed synchronously (i.e., pulled), whoever pulled it continues the flush;
	// when a promise resolves later, the computed acts like a signal write and flushes itself
	emitValue(instance, ACTIVE.effect !== state);
}

function subscribeToComputed(
	this: InternalComputed,
	subscriber: Subscriber<unknown>,
	copy?: unknown,
): Subscription {
	refreshComputed(this);

	return subscribeToSignal.call(this, subscriber, copy);
}

// #endregion
