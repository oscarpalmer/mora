import {expect, test} from 'vitest';
import {array, computed, signal, startBatch, stopBatch, store} from '../src';

test('basic', () => {
	function onValue(value: number): void {
		counts[1] += 1;
		totals[1] = value;
	}

	const counts = [0, 0];
	const totals = [0, 0];

	const value = signal(1);
	const squared = computed(() => value.get() * 2);

	let valueSubscription = value.subscribe(value => {
		counts[0] += 1;
		totals[0] += value;
	});

	const squaredSubscription = squared.subscribe(onValue);
	const secondSquaredSubscription = squared.subscribe(onValue);

	expect(squaredSubscription).toBe(secondSquaredSubscription);

	expect(counts).toEqual([1, 1]);
	expect(totals).toEqual([1, 2]);

	value.set(123);

	expect(counts).toEqual([2, 2]);
	expect(totals).toEqual([124, 246]);

	valueSubscription.unsubscribe();
	squaredSubscription.unsubscribe();

	value.set(456);

	expect(counts).toEqual([2, 2]);
	expect(totals).toEqual([124, 246]);

	valueSubscription = value.subscribe(onValue);

	value.set(789);

	expect(counts).toEqual([2, 4]);
	expect(totals).toEqual([124, 789]);

	valueSubscription.unsubscribe();

	value.set(1234);

	expect(counts).toEqual([2, 4]);
	expect(totals).toEqual([124, 789]);

	expect(() => value.subscribe('blah' as never)).toThrow();
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

test('copies', () =>
	new Promise<void>(done => {
		const copied = {
			array: undefined as unknown as number[],
			nested: undefined as unknown as number[] | undefined,
			object: undefined as unknown as Record<string, number[]>,
		};

		const originals = {
			array: undefined as unknown as number[],
			nested: undefined as unknown as number[] | undefined,
			object: undefined as unknown as Record<string, number[]>,
		};

		const numbers = array([1, 2, 3]);
		const object = store({a: [1, 1, 1], b: [2, 2, 2], c: [3, 3, 3]});

		const onNumbersOne = numbers.subscribe(value => {
			originals.array = value;
		});

		const onNumbersTwo = numbers.subscribe(value => {
			copied.array = value;
		}, true);

		const onObjectOne = object.subscribe(value => {
			originals.object = value;
		});

		const onObjectTwo = object.subscribe(value => {
			copied.object = value;
		}, true);

		const onNestedOne = object.subscribe('b', value => {
			originals.nested = value;
		});

		const onNestedTwo = object.subscribe(
			'b',
			value => {
				copied.nested = value;
			},
			true,
		);

		onNumbersOne.unsubscribe();
		onNumbersTwo.unsubscribe();
		onObjectOne.unsubscribe();
		onObjectTwo.unsubscribe();
		onNestedOne.unsubscribe();
		onNestedTwo.unsubscribe();

		expect(originals.array).toEqual(copied.array);
		expect(originals.array).not.toBe(copied.array);

		expect(originals.object).toEqual(copied.object);
		expect(originals.object).not.toBe(copied.object);

		expect(originals.nested).toEqual(copied.nested);
		expect(originals.nested).not.toBe(copied.nested);

		setTimeout(() => {
			originals.array[0] = 9;
			copied.array[2] = 8;

			originals.object.a = [7, 7, 7];
			copied.object.c = [6, 6, 6];

			originals.nested![0] = 5;
			copied.nested![2] = 4;

			expect(originals.array).not.toEqual(copied.array);
			expect(originals.array).not.toBe(copied.array);

			expect(originals.array[0]).toBe(9);
			expect(originals.array[2]).toBe(3);

			expect(copied.array[0]).toBe(1);
			expect(copied.array[2]).toBe(8);

			expect(originals.object).not.toEqual(copied.object);
			expect(originals.object).not.toBe(copied.object);

			expect(originals.object.a).toEqual([7, 7, 7]);
			expect(originals.object.c).toEqual([3, 3, 3]);

			expect(copied.object.a).toEqual([1, 1, 1]);
			expect(copied.object.c).toEqual([6, 6, 6]);

			expect(originals.nested).not.toEqual(copied.nested);
			expect(originals.nested).not.toBe(copied.nested);

			expect(originals.nested![0]).toBe(5);
			expect(originals.nested![2]).toBe(2);

			expect(copied.nested![0]).toBe(2);
			expect(copied.nested![2]).toBe(4);

			done();
		}, 25);
	}));
