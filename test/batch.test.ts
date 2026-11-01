import {expect, test} from 'vite-plus/test';
import {computed, effect, signal, startBatch, stopBatch} from '../src';
import {BATCH} from '../src/constants';

test('nested', () => {
	let count = 0;

	const a = signal(1);
	const b = signal(2);

	effect(() => {
		a.get();
		b.get();

		count += 1;
	});

	startBatch();
	startBatch();

	expect(BATCH.depth).toBe(2);

	a.set(10);
	b.set(20);

	stopBatch();

	expect(BATCH.depth).toBe(1);
	expect(count).toBe(1);

	a.set(100);

	stopBatch();

	expect(BATCH.depth).toBe(0);
	expect(count).toBe(2);
});

test('simple', () => {
	let count = 0;

	const a = signal(123);
	const b = computed(() => a.get() + 1000);

	effect(() => {
		a.get();

		count += 1;
	});

	startBatch();

	expect(BATCH.depth).toBe(1);

	for (let index = 0; index < 100; index += 1) {
		a.update(current => current + 1);
	}

	expect(b.peek()).toBe(1123);

	stopBatch();

	expect(BATCH.depth).toBe(0);
	expect(count).toBe(2);
	expect(b.peek()).toBe(1223);
});

test('stops at zero depth', () => {
	stopBatch();
	stopBatch();

	expect(BATCH.depth).toBe(0);
});

test('unsubscribed while batching', () => {
	const value = signal(1);

	let count = 0;

	const subscription = value.subscribe(() => {
		count += 1;
	});

	startBatch();

	value.set(2);

	subscription.unsubscribe();

	stopBatch();

	expect(count).toBe(1);
});
