import {expect, test} from 'vitest';
import {computed, effect, signal, startBatch, stopBatch} from '../src';

test(' basic', () => {
	const a = signal(1);
	const b = signal(2);

	const c = computed(() => a.get() + b.get());
	const d = computed(() => c.get() + 1);

	expect(c.peek()).toBe(3);
	expect(d.peek()).toBe(4);

	a.update(current => current + 1);

	expect(c.peek()).toBe(4);
	expect(d.peek()).toBe(5);

	b.set(5);

	expect(c.peek()).toBe(7);
	expect(d.peek()).toBe(8);
});

test('get & peek', () => {
	const a = signal(1);
	const b = computed(() => a.get() ** 2);
	const c = computed(() => b.get() + 1);

	let getCount = 0;
	let peekCount = 0;

	effect(() => {
		b.get();

		getCount += 1;
	});

	effect(() => {
		c.peek();

		peekCount += 1;
	});

	for (let index = 0; index < 100; index += 1) {
		a.update(current => current + 1);
	}

	expect(getCount).toBe(101);
	expect(peekCount).toBe(1);

	expect(a.peek()).toBe(101);
	expect(b.peek()).toBe(10201);
	expect(c.peek()).toBe(10202);
});
