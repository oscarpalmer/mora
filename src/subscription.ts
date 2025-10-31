import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {ReactiveState, Unsubscribe} from './models';

export class Subscription {
	callback: GenericCallback;
	state: ReactiveState<unknown, never>;

	constructor(state: ReactiveState<unknown, never>, callback: GenericCallback) {
		this.state = state;
		this.callback = callback;

		callback(state.value);
	}

	destroy(): void {
		this.callback = noop;
		this.state = undefined as never;
	}
}

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
	state.subscriptions.get(callback)?.destroy();

	state.subscriptions.delete(callback);
}
