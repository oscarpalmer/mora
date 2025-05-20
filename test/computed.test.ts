import {expect, test} from 'vitest';
import {computed, signal} from '../src';

test('computed', () => {
	const a = signal(1);
	const b = signal(2);

	const c = computed(() => a.get() + b.get());
	const d = computed(() => c.get() + 1);

	expect(c.get()).toBe(3);
	expect(d.get()).toBe(4);

	a.update(current => current + 1);

	expect(c.get()).toBe(4);
	expect(d.get()).toBe(5);

	b.set(5);

	expect(c.get()).toBe(7);
	expect(d.get()).toBe(8);
});
