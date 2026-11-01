import {expect, test} from 'vite-plus/test';
import {
	array,
	computed,
	effect,
	isComputed,
	isEffect,
	isReactive,
	isReactiveArray,
	isReactiveStore,
	isReadonlySignal,
	isSignal,
	signal,
	store,
} from '../src';

const a = signal('a');
const b = computed(() => `${a.get()}b`);
const c = array([]);
const d = store({});
const e = effect(() => {});

const instances = [a, b, c, d, e];

const values: unknown[] = [undefined, null, 'a', 123, true, Symbol('test'), {}, [], () => {}];

function check(fn: (value: unknown) => boolean, matches: unknown[]): void {
	for (const value of values) {
		expect(fn(value)).toBe(false);
	}

	for (const instance of instances) {
		expect(fn(instance)).toBe(matches.includes(instance));
	}
}

test('isComputed', () => {
	check(isComputed, [b]);
});

test('isEffect', () => {
	check(isEffect, [e]);
});

test('isReactive', () => {
	check(isReactive, [a, b, c, d]);
});

test('isReactiveArray', () => {
	check(isReactiveArray, [c]);
});

test('isReactiveStore', () => {
	check(isReactiveStore, [d]);
});

test('isReadonlySignal', () => {
	check(isReadonlySignal, []);

	expect(isReadonlySignal(a.asReadonly())).toBe(true);
	expect(isReadonlySignal(c.asReadonly())).toBe(true);
	expect(isReadonlySignal(d.asReadonly())).toBe(true);

	expect(isReactive(a.asReadonly())).toBe(true);
	expect(isReactive(c.asReadonly(true))).toBe(true);

	expect(isSignal(a.asReadonly())).toBe(false);
	expect(isReactiveArray(c.asReadonly())).toBe(false);
	expect(isReactiveStore(d.asReadonly(true))).toBe(false);

	expect(() => (b as any).asReadonly()).toThrow();
	expect(() => (e as any).asReadonly()).toThrow();
});

test('isSignal', () => {
	check(isSignal, [a]);
});
