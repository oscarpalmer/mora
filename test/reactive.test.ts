import {equal} from '@oscarpalmer/atoms/value';
import {expect, test} from 'vitest';
import {array, signal} from '../src';

test('equal: basic', () => {
	const arrays = {
		a: array([1, 2, 3]),
		b: array([1, 2, 3], {equal}),
	};

	const counts = {
		arrays: [0, 0],
		numbers: [0, 0],
		objects: [0, 0],
	};

	const numbers = {
		a: signal(1),
		b: signal(1, {equal}),
	};

	const objects = {
		a: signal({a: 1, b: 2}),
		b: signal({a: 1, b: 2}, {equal}),
	};

	arrays.a.subscribe(() => {
		counts.arrays[0] += 1;
	});

	arrays.b.subscribe(() => {
		counts.arrays[1] += 1;
	});

	numbers.a.subscribe(() => {
		counts.numbers[0] += 1;
	});

	numbers.b.subscribe(() => {
		counts.numbers[1] += 1;
	});

	objects.a.subscribe(() => {
		counts.objects[0] += 1;
	});

	objects.b.subscribe(() => {
		counts.objects[1] += 1;
	});

	expect(counts.arrays).toEqual([1, 1]);
	expect(counts.numbers).toEqual([1, 1]);
	expect(counts.objects).toEqual([1, 1]);

	arrays.a.set([1, 2, 3]);
	arrays.b.set([1, 2, 3]);

	numbers.a.set(1);
	numbers.b.set(1);

	objects.a.set({a: 1, b: 2});
	objects.b.set({a: 1, b: 2});

	expect(counts.arrays).toEqual([1, 1]);
	expect(counts.numbers).toEqual([1, 1]);
	expect(counts.objects).toEqual([2, 1]);
});

test('equal: nested', () => {
	const count = [0, 0];

	const nested = {
		a: array([
			{id: 1, value: 123},
			{id: 2, value: 456},
			{id: 3, value: 789},
		]),
		b: array(
			[
				{id: 1, value: 123},
				{id: 2, value: 456},
				{id: 3, value: 789},
			],
			{equal},
		),
	};

	nested.a.subscribe(() => {
		count[0] += 1;
	});

	nested.b.subscribe(() => {
		count[1] += 1;
	});

	expect(count).toEqual([1, 1]);

	nested.a.set([
		{id: 1, value: 123},
		{id: 2, value: 456},
		{id: 3, value: 789},
	]);

	nested.b.set([
		{id: 1, value: 123},
		{id: 2, value: 456},
		{id: 3, value: 789},
	]);

	expect(count).toEqual([2, 1]);

	nested.a.set(1, {id: 2, value: 999});
	nested.b.set(1, {id: 2, value: 999});

	expect(count).toEqual([3, 2]);

	nested.a.set(1, {id: 2, value: 999});
	nested.b.set(1, {id: 2, value: 999});

	expect(count).toEqual([4, 2]);
});
