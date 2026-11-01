import {noop} from '@oscarpalmer/atoms/function';
import type {PlainObject} from '@oscarpalmer/atoms/models';
import {SYMBOL_EFFECT, SYMBOL_READONLY, SYMBOL_STATE} from '../constants';
import {deactivateEffect} from '../effect';
import type {
	InternalArray,
	InternalComputed,
	InternalReactive,
	InternalReadonly,
	InternalStore,
	ReactiveOptions,
	ReactiveState,
} from '../models';
import {peekSignalValue} from './value';

// #region Functions

export function deactivateComputed(this: InternalComputed): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	deactivateEffect(this[SYMBOL_EFFECT].instance);

	deactivateReactive.call(this);
}

export function deactivateProxy(this: InternalArray | InternalStore): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	if (state.derived != null) {
		for (const computed of state.derived) {
			computed.deactivate();
		}

		state.derived.clear();

		state.derived = undefined;
	}

	if (state.mapped != null) {
		for (const [, computed] of state.mapped) {
			computed.deactivate();
		}

		state.mapped.clear();

		state.mapped = undefined;
	}

	deactivateReactive.call(this);
}

export function deactivateReactive(this: InternalReactive): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	state.active = false;

	state.computeds?.clear();
	state.effects?.clear();
	state.promises?.clear();
	state.readonlies?.frozen?.deactivate();
	state.readonlies?.original?.deactivate();
	state.subscriptions?.clear();

	state.equal = noop as never;
	state.promise = undefined;

	state.computeds = undefined;
	state.effects = undefined;
	state.promises = undefined;
	state.readonlies = undefined;
	state.subscriptions = undefined;
}

export function deactivateReadonly(this: InternalReadonly): void {
	const readonly = this[SYMBOL_READONLY];
	const signal = this[SYMBOL_STATE];

	if (!readonly.active) {
		return;
	}

	(signal.readonlies as PlainObject)![readonly.name] = undefined;

	if (readonly.subscriptions != null) {
		for (const subscription of readonly.subscriptions) {
			subscription.unsubscribe();
		}

		readonly.subscriptions.clear();

		readonly.subscriptions = undefined;
	}

	readonly.active = false;
	readonly.value = peekSignalValue.call(this, true);
}

export function getReactiveActive(this: InternalReactive): boolean {
	return this[SYMBOL_STATE].active;
}

export function getReadonlyActive(this: InternalReadonly): boolean {
	return this[SYMBOL_READONLY].active;
}

export function getState(
	name: string,
	value: unknown,
	options?: ReactiveOptions<unknown>,
): ReactiveState {
	return {
		name,
		value,
		active: true,
		equal:
			typeof options === 'object' && typeof options?.equal === 'function'
				? options.equal
				: undefined,
	};
}

// #endregion
