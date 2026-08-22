import type {ReactiveState, Subscription, Unsubscribe} from './models';

export function noop(): void {}

export function subscribe<Value>(
	state: ReactiveState<Value, never>,
	callback: (value: Value) => void,
): Unsubscribe {
	if (typeof callback !== 'function' || state.subscriptions.has(callback)) {
		return noop;
	}

	state.subscriptions.set(callback, subscription(state, callback));

	return () => {
		unsubscribe(state, callback);
	};
}

function subscription<Value>(
	state: ReactiveState<Value, never>,
	callback: (value: Value) => void,
): Subscription {
	const instance: Subscription = {
		callback,
		state,
		destroy: () => {
			instance.callback = noop;
			instance.state = undefined as never;
		},
	};

	callback(state.value);

	return instance;
}

export function unsubscribe<Value>(
	state: ReactiveState<Value, never>,
	callback: (value: Value) => void,
): void {
	state.subscriptions.get(callback)?.destroy();

	state.subscriptions.delete(callback);
}
