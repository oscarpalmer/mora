import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {ComputedState} from './computed';
import type {SignalState} from './signal';

export class Subscription {
	constructor(
		public state: ComputedState<unknown> | SignalState<unknown>,
		public callback: GenericCallback,
	) {
		callback(state.value);
	}
}

export type Unsubscribe = () => void;

export function noop(): void {}

export function subscribe(
	state: ComputedState<unknown> | SignalState<unknown>,
	callback: GenericCallback,
): Unsubscribe {
	if (typeof callback !== 'function' || state.subscriptions.has(callback)) {
		return noop;
	}

	state.subscriptions.set(callback, new Subscription(state, callback));

	return () => {
		unsubscribe(state, callback);
	};
}

export function unsubscribe(
	state: ComputedState<unknown> | SignalState<unknown>,
	callback: GenericCallback,
): void {
	const subscription = state.subscriptions.get(callback);

	state.subscriptions.delete(callback);

	if (subscription != null) {
		subscription.callback = noop;
		subscription.state = undefined as never;
	}
}
