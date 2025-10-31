import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {Effect} from './effect';
import type {Subscription} from './subscription';
import type {Computed} from './value/computed';
import type {Signal} from './value/signal';

export type Active = {
	computed?: Computed<unknown>;
	effect?: Effect;
};

export type Batch = {
	depth: number;
	handlers: Set<Effect | Subscription>;
};

export type ComputedEffect = {
	dirty: boolean;
	instance: Effect;
};

export type EffectState = {
	callback: GenericCallback;
};

export type InternalComputed = {
	readonly effect: ComputedEffect;
	readonly state: ReactiveState<unknown, unknown>;
};

export type InternalEffect = {
	state: EffectState;
};

export type ReactiveOptions<Value> = {
	/**
	 * Method for comparing values for equality
	 * @param first First value
	 * @param second Second value
	 * @returns Are the values equal?
	 * @default Object.is
	 */
	equal?: (first: Value, second: Value) => boolean;
};

export type ReactiveState<Value, Equal> = {
	computeds: Set<Computed<unknown>>;
	effects: Set<Effect>;
	equal: (first: Equal, second: Equal) => boolean;
	subscriptions: Map<GenericCallback, Subscription>;
	value: Value;
};

export type SetValueInProxyParameters<Value, Equal> = {
	target: Value;
	property: PropertyKey;
	value: unknown;
	state: ReactiveState<Value, Equal>;
	isArray: boolean;
	length?: Signal<number>;
};

/**
 * Unsubscribe from changes
 */
export type Unsubscribe = () => void;
