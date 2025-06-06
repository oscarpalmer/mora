import {expect, test} from 'vitest';
import {computed, effect, signal, startBatch, stopBatch} from '../src';
import {batchDepth} from '../src/batch';

test('simple', () => {
	let counter = 0;

	const a = signal(123);
	const b = computed(() => a.get() + 1000);

	effect(() => {
		a.get();

		counter += 1;
	});

	expect(batchDepth).toBe(0);

	startBatch();

	expect(batchDepth).toBe(1);

	for (let index = 0; index < 100; index += 1) {
		a.update(current => current + 1);
	}

	expect(b.peek()).toBe(1123);

	stopBatch();

	expect(batchDepth).toBe(0);
	expect(counter).toBe(2);
	expect(a.peek()).toBe(223);
	expect(b.peek()).toBe(1223);
});

test('nested', () => {
	let count = 0;

	const signal1 = signal(1);
	const signal2 = signal(2);

	effect(() => {
		signal1.get();
		signal2.get();

		count += 1;
	});

	expect(batchDepth).toBe(0);

	startBatch();

	expect(batchDepth).toBe(1);

	startBatch();

	expect(batchDepth).toBe(2);

	signal1.set(10);
	signal2.set(20);

	stopBatch();

	expect(batchDepth).toBe(1);
	expect(count).toBe(1);

	signal1.set(100);

	stopBatch();

	expect(batchDepth).toBe(0);

	expect(count).toBe(2);
	expect(signal1.peek()).toBe(100);
	expect(signal2.peek()).toBe(20);
});

test('stops at zero depth', () => {
	expect(batchDepth).toBe(0);

	stopBatch();

	expect(batchDepth).toBe(0);

	stopBatch();
	stopBatch();

	expect(batchDepth).toBe(0);
});
