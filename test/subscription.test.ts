import {expect, test} from 'vite-plus/test';
import {array, computed, signal, startBatch, stopBatch, store} from '../src';

test('arguments', () => {
	const value = signal(1);

	const calls: unknown[][] = [];

	const subscription = value.subscribe((...args) => {
		calls.push(args);
	});

	value.set(2);

	expect(calls.map(([value]) => value)).toEqual([1, 2]);
	expect(calls.every(([, argument]) => argument === subscription)).toBe(true);
});

test('basic', () => {
	function onValue(value: number): void {
		counts[1] += 1;
		totals[1] = value;
	}

	const counts = [0, 0];
	const totals = [0, 0];

	const value = signal(1);
	const doubled = computed(() => value.get() * 2);

	let valueSubscription = value.subscribe(value => {
		counts[0] += 1;
		totals[0] += value;
	});

	const doubledSubscription = doubled.subscribe(onValue);

	expect(doubled.subscribe(onValue)).toBe(doubledSubscription);

	expect(counts).toEqual([1, 1]);
	expect(totals).toEqual([1, 2]);

	value.set(123);

	expect(counts).toEqual([2, 2]);
	expect(totals).toEqual([124, 246]);

	valueSubscription.unsubscribe();
	doubledSubscription.unsubscribe();

	value.set(456);

	expect(counts).toEqual([2, 2]);
	expect(totals).toEqual([124, 246]);

	valueSubscription = value.subscribe(onValue);

	value.set(789);

	expect(counts).toEqual([2, 4]);
	expect(totals).toEqual([124, 789]);

	expect(() => value.subscribe('blah' as never)).toThrow();

	value.deactivate();
	value.set(999);

	expect(counts).toEqual([2, 4]);

	expect(() => value.subscribe(() => {})).toThrow();
});

test('batched', () => {
	let count = 0;

	const a = signal(1);

	a.subscribe(() => {
		count += 1;
	});

	startBatch();

	for (let index = 0; index < 100; index += 1) {
		a.set(index);
	}

	expect(count).toBe(1);

	stopBatch();

	expect(count).toBe(2);
});

test('copies', () => {
	const numbers = array([1, 2, 3]);
	const object = store({a: [1, 1, 1], b: [2, 2, 2]});

	const copies: Record<string, any> = {};
	const originals: Record<string, any> = {};

	numbers.subscribe((value, subscription) => {
		originals.array = value;

		subscription.unsubscribe();
	});

	numbers.subscribe((value, subscription) => {
		copies.array = value;

		subscription.unsubscribe();
	}, true);

	object.subscribe((value, subscription) => {
		originals.object = value;

		subscription.unsubscribe();
	});

	object.subscribe((value, subscription) => {
		copies.object = value;

		subscription.unsubscribe();
	}, true);

	object.subscribe('b', (value, subscription) => {
		originals.nested = value;

		subscription.unsubscribe();
	});

	object.subscribe(
		'b',
		(value, subscription) => {
			copies.nested = value;

			subscription.unsubscribe();
		},
		true,
	);

	expect(originals.array).toBe(numbers.peek());
	expect(originals.object).toBe(object.peek());
	expect(originals.nested).toBe(object.peek('b'));

	expect(copies.array).toEqual(originals.array);
	expect(copies.array).not.toBe(originals.array);

	expect(copies.object).toEqual(originals.object);
	expect(copies.object).not.toBe(originals.object);

	expect(copies.nested).toEqual(originals.nested);
	expect(copies.nested).not.toBe(originals.nested);

	copies.array[0] = 9;
	copies.object.a = [9, 9, 9];
	copies.nested[0] = 9;

	expect(numbers.peek()).toEqual([1, 2, 3]);
	expect(object.peek()).toEqual({a: [1, 1, 1], b: [2, 2, 2]});
});
