/** biome-ignore-all lint/style/noMagicNumbers: Testing */
import {expect, test} from 'vitest';
import {computed, signal, startBatch, stopBatch} from '../src';
import {noop} from '../src/subscription';

test('basic', () => {
	function d(value: number): void {
		counts[1] += 1;
		totals[1] = value;
	}

	const counts = [0, 0];
	const totals = [0, 0];

	const a = signal(1);
	const b = computed(() => a.get() * 2);

	const c = a.subscribe(value => {
		counts[0] += 1;
		totals[0] += value;
	});

	b.subscribe(d);

	const e = b.subscribe('blah' as never);
	const f = b.subscribe(d);

	expect(counts).toEqual([1, 1]);
	expect(totals).toEqual([1, 2]);

	expect(e).toBe(noop);
	expect(f).toBe(noop);

	a.set(123);

	expect(counts).toEqual([2, 2]);
	expect(totals).toEqual([124, 246]);

	c();
	b.unsubscribe(d);
	b.unsubscribe(e);
	b.unsubscribe(f);

	a.set(456);

	expect(counts).toEqual([2, 2]);
	expect(totals).toEqual([124, 246]);

	a.subscribe(d);

	a.set(789);

	expect(counts).toEqual([2, 4]);
	expect(totals).toEqual([124, 789]);

	a.unsubscribe(d);

	a.set(1234);

	expect(counts).toEqual([2, 4]);
	expect(totals).toEqual([124, 789]);
});

test('batched', () => {
	let count = 0;

	const a = signal(1);

	a.subscribe(() => {
		count += 1;
	});

	expect(count).toBe(1);

	startBatch();

	for (let index = 0; index < 100; index += 1) {
		a.set(index);
	}

	expect(count).toBe(1);

	stopBatch();

	expect(count).toBe(2);
});
