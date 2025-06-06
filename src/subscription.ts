import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {ReactiveState} from './value/reactive';

export class Subscription<Value> {
	constructor(
		public state: ReactiveState<Value, never>,
		public callback: GenericCallback,
	) {
		callback(state.value);
	}
}

/**
 * Unsubscribe from changes
 */
export type Unsubscribe = () => void;

export function noop(): void {}

export function subscribe<Value>(
	state: ReactiveState<Value, never>,
	callback: (value: Value) => void,
): Unsubscribe {
	if (typeof callback !== 'function' || state.subscriptions.has(callback)) {
		return noop;
	}

	state.subscriptions.set(callback, new Subscription(state, callback));

	return () => {
		unsubscribe(state, callback);
	};
}

export function unsubscribe<Value>(
	state: ReactiveState<Value, never>,
	callback: (value: Value) => void,
): void {
	const subscription = state.subscriptions.get(callback);

	state.subscriptions.delete(callback);

	if (subscription != null) {
		subscription.callback = noop;
		subscription.state = undefined as never;
	}
}
