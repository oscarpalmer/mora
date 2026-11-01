import {expect, test} from 'vite-plus/test';
import {array, effect} from '../src';

class Item {
	id: number;
	name: string;

	constructor(name: string) {
		this.id = ++itemIndex;
		this.name = name;
	}

	toString(): string {
		return `#${this.id} ${this.name}`;
	}
}

let itemIndex = 0;

test('at', () => {
	const items = array([1]);

	const values: unknown[] = [];

	effect(() => {
		values.push(items.at(0));
	});

	expect(values).toEqual([1]);

	items.push(2, 3);

	expect(values).toEqual([1]);

	items.set(0, 99);

	expect(values).toEqual([1, 99]);

	items.set(0, 99);

	expect(values).toEqual([1, 99]);
});

test('basic', () => {
	const a = array([1, 2, 3, 4, 5]);

	let count = 0;

	effect(() => {
		a.get();

		count += 1;
	});

	expect(a.active).toBe(true);
	expect(count).toBe(1);
	expect(a.peek('length')).toBe(5);

	expect(a.toString()).toBe('1,2,3,4,5');
	expect(a.toJSON()).toEqual([1, 2, 3, 4, 5]);

	expect(array('blah' as never).peek()).toEqual([]);

	a.deactivate();
	a.deactivate();

	expect(a.active).toBe(false);

	a.set([9, 9, 9]);
	a.update(current => current.map(item => item * 2));

	expect(a.peek()).toEqual([1, 2, 3, 4, 5]);
	expect(count).toBe(1);
});

test('clear', () => {
	const a = array([1, 2, 3, 4, 5]);
	const b = a.map(item => item * 2);

	expect(b.peek()).toEqual([2, 4, 6, 8, 10]);

	a.clear();

	expect(a.peek()).toEqual([]);
	expect(b.peek()).toEqual([]);

	a.set([1, 2, 3, 4, 5]);

	expect(b.peek()).toEqual([2, 4, 6, 8, 10]);

	a.deactivate();
	a.clear();

	expect(a.peek()).toEqual([1, 2, 3, 4, 5]);
	expect(b.peek()).toEqual([2, 4, 6, 8, 10]);
});

test('copyWithin', () => {
	const a = array([1, 2, 3, 4, 5]);

	a.get().copyWithin(0, 2);

	expect(a.peek()).toEqual([3, 4, 5, 4, 5]);

	a.get().copyWithin(1, 3, 4);

	expect(a.peek()).toEqual([3, 4, 5, 4, 5]);

	a.deactivate();

	a.get().copyWithin(0, 2);

	expect(a.peek()).toEqual([3, 4, 5, 4, 5]);
});

test('emit', () => {
	const a = array(Array.from({length: 100}, (_, i) => i));
	const b = array(Array.from({length: 300}, (_, i) => i));

	const counts = {
		a: 0,
		b: 0,
	};

	effect(() => {
		a.get();

		counts.a += 1;
	});

	effect(() => {
		b.get();

		counts.b += 1;
	});

	a.set(Array.from({length: 100}, (_, i) => (i === 5 ? i + 1 : 1)));

	expect(counts.a).toBe(2);

	a.set(Array.from({length: 100}, (_, i) => (i === 95 ? i + 1 : 1)));

	expect(counts.a).toBe(3);

	a.set(Array.from({length: 100}, (_, i) => i));

	expect(counts.a).toBe(4);

	a.set(Array.from({length: 100}, (_, i) => i));

	expect(counts.a).toBe(4);

	b.set(Array.from({length: 300}, (_, i) => (i === 150 ? i + 1 : 1)));

	expect(counts.b).toBe(2);
});

test('fill', () => {
	const a = array([1, 2, 3, 4, 5]);

	a.get().fill(99);

	expect(a.peek()).toEqual([99, 99, 99, 99, 99]);

	a.get().fill(100, 1, 3);

	expect(a.peek()).toEqual([99, 100, 100, 99, 99]);

	a.deactivate();

	a.get().fill(101);

	expect(a.peek()).toEqual([99, 100, 100, 99, 99]);
});

test('filter', () => {
	const numbers = array([1, 2, 3, 4, 5]);

	numbers.map(item => item * 2).deactivate();

	const even = numbers.filter(item => item % 2 === 0);

	expect(even.peek()).toEqual([2, 4]);

	numbers.push(6, 7, 8);

	expect(even.peek()).toEqual([2, 4, 6, 8]);

	numbers.deactivate();
	numbers.push(10);

	expect(even.peek()).toEqual([2, 4, 6, 8]);

	expect(() => numbers.filter(() => true)).toThrow();
});

test('length', () => {
	const a = array([1, 2, 3, 4, 5]);

	const counts = [0, 0];

	effect(() => {
		a.get('length');

		counts[0] += 1;
	});

	effect(() => {
		a.length;

		counts[1] += 1;
	});

	a.length = 10;

	expect(a.peek('length')).toBe(10);
	expect(counts).toEqual([2, 2]);

	a.length = -3;
	a.length = 'blah' as never;

	expect(a.peek('length')).toBe(10);
	expect(counts).toEqual([2, 2]);

	a.deactivate();

	a.length = 20;

	expect(a.peek('length')).toBe(10);
	expect(counts).toEqual([2, 2]);
});

test('map', () => {
	const a = array([1, 2, 3, 4, 5]);
	const b = a.map(item => item * 2);

	expect(b.peek()).toEqual([2, 4, 6, 8, 10]);

	a.push(6);

	expect(b.peek()).toEqual([2, 4, 6, 8, 10, 12]);

	a.deactivate();
	a.push(7);

	expect(b.peek()).toEqual([2, 4, 6, 8, 10, 12]);

	expect(() => a.map(() => {})).toThrow();
});

test('notify', () => {
	const items = array<Item>([]);
	const strings = items.map(item => item.toString());

	let count = 0;
	let name = '';

	effect(() => {
		name = items.get(0)?.name ?? '';

		count += 1;
	});

	expect(count).toBe(1);
	expect(name).toBe('');
	expect(strings.peek()).toEqual([]);

	items.push(new Item('Apple'));

	expect(count).toBe(2);
	expect(name).toBe('Apple');
	expect(strings.peek()).toEqual(['#1 Apple']);

	items.peek(0)!.name = 'Banana';

	expect(count).toBe(2);
	expect(name).toBe('Apple');
	expect(strings.peek()).toEqual(['#1 Apple']);

	items.notify();

	expect(count).toBe(3);
	expect(name).toBe('Banana');
	expect(strings.peek()).toEqual(['#1 Banana']);

	items.deactivate();
	items.notify();

	expect(count).toBe(3);
});

test('peek', () => {
	const a = array([1, 2, 3]);
	const b = array([[1], [2], [3]]);
	const c = array([{value: 1}]);

	let count = 0;

	effect(() => {
		a.peek();
		a.peek(0);
		a.peek('length');

		count += 1;
	});

	expect(a.peek()).toEqual([1, 2, 3]);
	expect(a.peek(0)).toBe(1);
	expect(a.peek('length')).toBe(3);
	expect(a.peek('blah' as never)).toEqual([1, 2, 3]);

	a.peek()[0] = 11;

	expect(a.peek()).toEqual([11, 2, 3]);

	a.peek(true)[0] = 111;

	expect(a.peek()).toEqual([11, 2, 3]);
	expect(a.peek(0, true)).toBe(11);

	b.peek(0)![0] = 22;
	c.peek(0)!.value = 22;

	expect(b.peek(0)).toEqual([22]);
	expect(c.peek(0)).toEqual({value: 22});

	b.peek(0, true)![0] = 222;
	c.peek(0, true)!.value = 222;

	expect(b.peek(0)).toEqual([22]);
	expect(c.peek(0)).toEqual({value: 22});

	expect(count).toBe(1);
});

test('pop', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.pop()).toBe(5);
	expect(a.peek()).toEqual([1, 2, 3, 4]);

	a.deactivate();

	expect(a.pop()).toBeUndefined();
});

test('push', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.push(6)).toBe(6);
	expect(a.peek()).toEqual([1, 2, 3, 4, 5, 6]);
	expect(a.peek('length')).toBe(6);

	a.deactivate();

	expect(a.push(7)).toBe(6);
});

test('reverse', () => {
	const a = array([1, 2, 3, 4, 5]);

	a.get().reverse();

	expect(a.peek()).toEqual([5, 4, 3, 2, 1]);
});

test('select', () => {
	const all = array([
		{id: 1, value: 'Apple'},
		{id: 2, value: 'Banana'},
		{id: 3, value: 'Cherry'},
	]);

	const even = all.select(
		item => item.id % 2 === 0,
		item => item.value,
	);

	const odd = all.select(
		item => item.id % 2 !== 0,
		item => item.value,
	);

	expect(even.peek()).toEqual(['Banana']);
	expect(odd.peek()).toEqual(['Apple', 'Cherry']);

	all.push({id: 4, value: 'Date'}, {id: 5, value: 'Elderberry'});

	expect(even.peek()).toEqual(['Banana', 'Date']);
	expect(odd.peek()).toEqual(['Apple', 'Cherry', 'Elderberry']);

	all.deactivate();
	all.push({id: 6, value: 'Fig'});

	expect(even.peek()).toEqual(['Banana', 'Date']);
	expect(odd.peek()).toEqual(['Apple', 'Cherry', 'Elderberry']);

	expect(() =>
		all.select(
			() => true,
			item => item.value,
		),
	).toThrow();
});

test('set', () => {
	const a = array([1, 2, 3, 4, 5]);

	let count = 0;

	effect(() => {
		a.get();

		count += 1;
	});

	a.set([6, 7, 8]);

	expect(a.peek()).toEqual([6, 7, 8]);
	expect(count).toBe(2);

	a.set(1, 999);

	expect(a.peek()).toEqual([6, 999, 8]);
	expect(count).toBe(3);

	a.set(1, 999);

	expect(count).toBe(3);

	a.set(-1, 666);

	expect(a.peek()).toEqual([6, 999, 666]);
	expect(count).toBe(4);

	a.set(-1000, 333);
	a.set(Number.NaN, 123);

	expect(a.peek()).toEqual([6, 999, 666]);
	expect(count).toBe(4);

	a.set(3, 333);

	expect(a.peek()).toEqual([6, 999, 666, 333]);
	expect(count).toBe(5);

	a.set('length', 6);

	expect(a.peek()).toEqual([6, 999, 666, 333, undefined, undefined]);
	expect(count).toBe(6);

	a.set('blah' as never, 'Hello, world!' as never);

	expect(a.peek()['blah' as never]).toBeUndefined();

	a.get()['blah' as never] = 'Hello, world!' as never;

	expect(a.get()['blah' as never]).toBe('Hello, world!');

	a.deactivate();

	a.set(0, 1234);
	a.get()[0] = 1234;
	a.set([1, 2, 3]);
	a.set('length', 0);

	expect(a.peek(0)).toBe(6);
	expect(a.peek('length')).toBe(6);
});

test('shift', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.shift()).toBe(1);
	expect(a.peek()).toEqual([2, 3, 4, 5]);
	expect(a.peek('length')).toBe(4);

	a.deactivate();

	expect(a.shift()).toBeUndefined();
	expect(a.peek()).toEqual([2, 3, 4, 5]);
});

test('sort', () => {
	const a = array([5, 4, 3, 2, 1]);

	a.get().sort();

	expect(a.peek()).toEqual([1, 2, 3, 4, 5]);

	a.deactivate();

	a.get().sort((a, b) => b - a);

	expect(a.peek()).toEqual([1, 2, 3, 4, 5]);
});

test('splice + (get)', () => {
	const a = array([1, 2, 3, 4, 5]);

	let first: unknown;
	let last: unknown;

	effect(() => {
		first = a.get(0);
		last = a.get(-1);
	});

	expect(a.splice(0, 2)).toEqual([1, 2]);
	expect(a.peek()).toEqual([3, 4, 5]);

	expect(first).toBe(3);
	expect(last).toBe(5);

	a.splice(1, 0, 6);

	expect(a.peek()).toEqual([3, 6, 4, 5]);

	a.splice(0);

	expect(a.peek()).toEqual([]);

	expect(first).toBeUndefined();
	expect(last).toBeUndefined();

	a.deactivate();

	expect(a.splice(0)).toEqual([]);
});

test('subscription', () => {
	const a = array([1, 2, 3, 4, 5]);

	const counts = {
		array: 0,
		item: 0,
	};

	const arraySubscription = a.subscribe(() => {
		counts.array += 1;
	});

	const itemSubscription = a.subscribe(0, () => {
		counts.item += 1;
	});

	expect(counts).toEqual({array: 1, item: 1});

	a.push(6, 7, 8);

	expect(counts).toEqual({array: 2, item: 1});

	a.set(0, 999);

	expect(counts).toEqual({array: 3, item: 2});

	arraySubscription.unsubscribe();
	itemSubscription.unsubscribe();

	a.set([1, 2, 3]);

	expect(counts).toEqual({array: 3, item: 2});

	a.deactivate();

	expect(() => a.subscribe(() => {})).toThrow();
	expect(() => a.subscribe(0, () => {})).toThrow();
});

test('unshift', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.unshift(0)).toBe(6);
	expect(a.peek()).toEqual([0, 1, 2, 3, 4, 5]);
	expect(a.peek('length')).toBe(6);

	a.deactivate();

	expect(a.unshift()).toBe(6);
});

test('update', () => {
	const a = array([1, 2, 3, 4, 5]);

	let count = 0;

	effect(() => {
		a.get();

		count += 1;
	});

	a.update(value => value.map(item => item * 2));

	expect(a.peek()).toEqual([2, 4, 6, 8, 10]);
	expect(count).toBe(2);

	a.update(() => 'blah' as never);

	expect(count).toBe(2);

	a.update(() => null as never);

	expect(a.peek()).toEqual([]);
	expect(count).toBe(3);

	expect(() => a.update(undefined as never)).toThrow();
});

test('value: function', () => {
	let count = 0;

	const arr = array(() => [1, 2, 3]);

	arr.subscribe(() => {
		count += 1;
	});

	expect(arr.peek()).toEqual([1, 2, 3]);
	expect(count).toBe(1);

	arr.set(1, () => 99);

	expect(arr.peek()).toEqual([1, 99, 3]);
	expect(count).toBe(2);

	arr.set(() => {
		throw new Error('Should be a silent error');
	});

	arr.set(() => 'blah' as never);

	expect(arr.peek()).toEqual([1, 99, 3]);
	expect(count).toBe(2);

	arr.set(() => undefined);

	expect(arr.peek()).toEqual([]);
	expect(count).toBe(3);
});

test('value: promise', () =>
	new Promise<void>(done => {
		let count = 0;

		const arr = array(new Promise<number[]>(resolve => resolve([1, 2, 3])));

		arr.subscribe(() => {
			count += 1;
		});

		setTimeout(() => {
			expect(arr.peek()).toEqual([1, 2, 3]);
			expect(count).toBe(2); // TODO: Because the promise is set after the initial value; can we improve the logic to avoid this?

			arr.set(1, new Promise<number>(resolve => setTimeout(() => resolve(99), 25)));
		}, 25);

		setTimeout(() => {
			expect(arr.peek()).toEqual([1, 99, 3]);
			expect(count).toBe(3);

			arr.set(
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Should be a silent error')), 25),
				),
			);

			arr.set(
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Should be a silent error')), 25),
				),
			);
		}, 75);

		setTimeout(() => {
			expect(arr.peek()).toEqual([1, 99, 3]);
			expect(count).toBe(3);

			arr.set(new Promise<number[]>(resolve => setTimeout(() => resolve([7, 8, 9]), 25)));
			arr.set(new Promise<number[]>(resolve => setTimeout(() => resolve([10, 11, 12]), 25)));
		}, 125);

		setTimeout(() => {
			expect(arr.peek()).toEqual([10, 11, 12]);
			expect(count).toBe(4);

			arr.set(new Promise(resolve => resolve(undefined)));
		}, 175);

		setTimeout(() => {
			expect(arr.peek()).toEqual([]);
			expect(count).toBe(5);

			arr.set(new Promise(resolve => resolve('blah' as never)));
		}, 225);

		setTimeout(() => {
			expect(arr.peek()).toEqual([]);
			expect(count).toBe(5);

			done();
		}, 275);
	}));
