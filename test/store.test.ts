import {expect, test} from 'vite-plus/test';
import {effect, store} from '../src';

test('basic', () => {
	const stored = store({a: 1, b: 2, c: 3});

	const counts = {
		a: 0,
		obj: 0,
	};

	effect(() => {
		stored.get();

		counts.obj += 1;
	});

	effect(() => {
		stored.get('a');

		counts.a += 1;
	});

	expect(stored.active).toBe(true);
	expect(counts).toEqual({a: 1, obj: 1});
	expect(stored.peek()).toEqual({a: 1, b: 2, c: 3});
	expect(stored.peek('a')).toBe(1);

	expect(stored.toJSON()).toEqual({a: 1, b: 2, c: 3});
	expect(stored.toString()).toBe('[object Object]');
	expect(stored.toString(true)).toBe('{"a":1,"b":2,"c":3}');

	stored.set({a: 1, b: 2, c: 4});

	expect(counts).toEqual({a: 1, obj: 2});
	expect(stored.peek()).toEqual({a: 1, b: 2, c: 4});

	stored.set({a: 1, b: 2, d: 99} as never);

	expect(counts).toEqual({a: 1, obj: 3});
	expect(stored.peek()).toEqual({a: 1, b: 2, d: 99});

	stored.set('a', 123);

	expect(counts).toEqual({a: 2, obj: 4});
	expect(stored.peek('a')).toBe(123);

	stored.set('a', 123);

	expect(counts).toEqual({a: 2, obj: 4});

	stored.set();

	expect(counts).toEqual({a: 3, obj: 5});
	expect(stored.peek()).toEqual({});

	stored.set([] as never);

	expect(counts).toEqual({a: 3, obj: 5});

	stored.deactivate();
	stored.deactivate();

	expect(stored.active).toBe(false);

	stored.set({foo: 'bar'} as never);

	stored.update(current => ({
		...current,
		foo: 'bar',
	}));

	expect(counts).toEqual({a: 3, obj: 5});
	expect(stored.peek()).toEqual({});

	expect(store('blah' as never).peek()).toEqual({});
});

test('delete', () => {
	const stored = store<Record<string, number>>({a: 1, b: 2, c: 3});

	const values: unknown[] = [];

	let count = 0;

	effect(() => {
		stored.get();

		count += 1;
	});

	stored.subscribe('a', value => {
		values.push(value);
	});

	delete stored.get().a;

	expect(Object.keys(stored.peek())).toEqual(['b', 'c']);
	expect(values).toEqual([1, undefined]);
	expect(count).toBe(2);

	delete stored.get().missing;

	expect(count).toBe(2);

	stored.set({c: 4});

	expect(Object.keys(stored.peek())).toEqual(['c']);
	expect(count).toBe(3);

	stored.deactivate();

	delete stored.get().c;

	expect(stored.peek()).toEqual({c: 4});
});

test('function', () => {
	const stored = store({a: 1, b: 2, c: 3});

	const counts = {
		key: 0,
		obj: 0,
	};

	stored.subscribe(() => {
		counts.obj += 1;
	});

	stored.subscribe('a', () => {
		counts.key += 1;
	});

	expect(counts).toEqual({key: 1, obj: 1});

	stored.set('a', () => 123);

	expect(stored.peek()).toEqual({a: 123, b: 2, c: 3});
	expect(counts).toEqual({key: 2, obj: 2});

	stored.set('a', () => {
		throw new Error('Should be a silent error');
	});

	expect(stored.peek('a')).toBe(123);
	expect(counts).toEqual({key: 2, obj: 2});

	stored.set(() => ({a: 9, b: 8, c: 7}));

	expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
	expect(counts).toEqual({key: 3, obj: 3});

	stored.set(() => {
		throw new Error('Should be a silent error');
	});

	stored.set(() => 'blah' as never);

	expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
	expect(counts).toEqual({key: 3, obj: 3});

	stored.set(() => undefined);

	expect(stored.peek()).toEqual({});
	expect(counts).toEqual({key: 4, obj: 4});
});

test('notify', () => {
	const stored = store({
		nested: {
			value: 123,
		},
	});

	let count = 0;
	let value = 0;

	effect(() => {
		value = stored.get('nested').value;
		count += 1;
	});

	expect(count).toBe(1);
	expect(value).toBe(123);

	const nested = stored.peek('nested');

	nested.value = 456;

	stored.set('nested', nested);

	expect(count).toBe(1);
	expect(value).toBe(123);

	stored.notify();

	expect(count).toBe(2);
	expect(value).toBe(456);

	const unkeyed = store({a: 1});

	let notified = 0;

	unkeyed.subscribe(() => {
		notified += 1;
	});

	unkeyed.notify();

	expect(notified).toBe(2);
});

test('peek', () => {
	const stored = store({
		a: 1,
		b: [2],
		c: {
			d: 3,
		},
	});

	let count = 0;

	effect(() => {
		stored.peek();
		stored.peek('a');

		count += 1;
	});

	stored.peek().a = 11;
	stored.peek('b')[0] = 22;
	stored.peek('c').d = 33;

	expect(stored.peek()).toEqual({a: 11, b: [22], c: {d: 33}});

	stored.peek(true).a = 111;
	stored.peek('b', true)[0] = 222;
	stored.peek('c', true).d = 333;

	expect(stored.peek()).toEqual({a: 11, b: [22], c: {d: 33}});
	expect(stored.peek('a', true)).toBe(11);

	expect(count).toBe(1);
});

test('promise', () =>
	new Promise<void>(done => {
		const counts = {
			key: 0,
			obj: 0,
		};

		const stored = store(new Promise<{}>(resolve => resolve({a: 1, b: 2, c: 3})));

		stored.subscribe(() => {
			counts.obj += 1;
		});

		stored.subscribe('a', () => {
			counts.key += 1;
		});

		expect(stored.peek()).toEqual({});
		expect(counts).toEqual({key: 1, obj: 1});

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 1, b: 2, c: 3});
			expect(counts).toEqual({key: 2, obj: 2});

			stored.set('a', new Promise<number>(resolve => setTimeout(() => resolve(456), 25)));
			stored.set('a', new Promise<number>(resolve => setTimeout(() => resolve(789), 25)));
		}, 50);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 789, b: 2, c: 3});
			expect(counts).toEqual({key: 3, obj: 3});

			stored.set(
				'a',
				new Promise<number>(() => {
					throw new Error('Should be a silent error');
				}),
			);
		}, 100);

		setTimeout(() => {
			expect(stored.peek('a')).toBe(789);
			expect(counts).toEqual({key: 3, obj: 3});

			stored.set(new Promise<{}>(resolve => resolve({a: 9, b: 8, c: 7})));
		}, 125);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
			expect(counts).toEqual({key: 4, obj: 4});

			stored.set(
				new Promise<{}>(() => {
					throw new Error('Should be a silent error');
				}),
			);

			stored.set(
				new Promise<{}>(() => {
					throw new Error('Should be a silent error');
				}),
			);
		}, 150);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
			expect(counts).toEqual({key: 4, obj: 4});

			stored.set(new Promise<{}>(resolve => resolve('blah' as never)));
		}, 175);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
			expect(counts).toEqual({key: 4, obj: 4});

			stored.set(new Promise<undefined>(resolve => resolve(undefined)));
		}, 200);

		setTimeout(() => {
			expect(stored.peek()).toEqual({});
			expect(counts).toEqual({key: 5, obj: 5});

			done();
		}, 225);
	}));

test('promise, deactivated', () => {
	const stored = store({a: 1});

	stored.set('a', new Promise<number>(() => {}));
	stored.deactivate();

	expect(stored.active).toBe(false);
	expect(stored.peek('a')).toBe(1);
});

test('subscribe', () => {
	const stored = store({a: 1, b: 2, c: 3});

	const counts = {
		a: 0,
		store: 0,
	};

	const storeSubscription = stored.subscribe(() => {
		counts.store += 1;
	});

	const aSubscription = stored.subscribe('a', () => {
		counts.a += 1;
	});

	expect(counts).toEqual({a: 1, store: 1});

	stored.update(value => ({
		...value,
		c: 99,
		d: 4,
	}));

	expect(counts).toEqual({a: 1, store: 2});

	stored.set('a', 123);

	expect(counts).toEqual({a: 2, store: 3});

	stored.update(() => 'blah' as never);

	expect(counts).toEqual({a: 2, store: 3});

	storeSubscription.unsubscribe();
	aSubscription.unsubscribe();

	stored.set('a', 456);
	stored.update(() => null as never);

	expect(counts).toEqual({a: 2, store: 3});

	expect(() => stored.subscribe('blah' as never)).toThrow();
	expect(() => stored.subscribe('blah', 123 as never)).toThrow();

	expect(() => stored.update(undefined as never)).toThrow();
});
