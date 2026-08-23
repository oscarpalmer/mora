import {expect, test} from 'vitest';
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

const values: unknown[] = [undefined, null, 'a', 123, true, Symbol('test'), {}, [], () => {}];

test('isComputed', () => {
	for (const value of values) {
		expect(isComputed(value)).toBe(false);
	}

	expect(isComputed(a)).toBe(false);
	expect(isComputed(b)).toBe(true);
	expect(isComputed(c)).toBe(false);
	expect(isComputed(d)).toBe(false);
	expect(isComputed(e)).toBe(false);
});

test('isEffect', () => {
	for (const value of values) {
		expect(isEffect(value)).toBe(false);
	}

	expect(isEffect(a)).toBe(false);
	expect(isEffect(b)).toBe(false);
	expect(isEffect(c)).toBe(false);
	expect(isEffect(d)).toBe(false);
	expect(isEffect(e)).toBe(true);
});

test('isReactive', () => {
	for (const value of values) {
		expect(isReactive(value)).toBe(false);
	}

	expect(isReactive(a)).toBe(true);
	expect(isReactive(b)).toBe(true);
	expect(isReactive(c)).toBe(true);
	expect(isReactive(d)).toBe(true);
	expect(isReactive(e)).toBe(false);
});

test('isSignal', () => {
	for (const value of values) {
		expect(isSignal(value)).toBe(false);
	}

	expect(isSignal(a)).toBe(true);
	expect(isSignal(b)).toBe(false);
	expect(isSignal(c)).toBe(false);
	expect(isSignal(d)).toBe(false);
	expect(isSignal(e)).toBe(false);
});

test('isReactiveArray', () => {
	for (const value of values) {
		expect(isReactiveArray(value)).toBe(false);
	}

	expect(isReactiveArray(a)).toBe(false);
	expect(isReactiveArray(b)).toBe(false);
	expect(isReactiveArray(c)).toBe(true);
	expect(isReactiveArray(d)).toBe(false);
	expect(isReactiveArray(e)).toBe(false);
});

test('isReactiveStore', () => {
	for (const value of values) {
		expect(isReactiveStore(value)).toBe(false);
	}

	expect(isReactiveStore(a)).toBe(false);
	expect(isReactiveStore(b)).toBe(false);
	expect(isReactiveStore(c)).toBe(false);
	expect(isReactiveStore(d)).toBe(true);
	expect(isReactiveStore(e)).toBe(false);
});

test('isReadonlySignal', () => {
	for (const value of values) {
		expect(isReadonlySignal(value)).toBe(false);
	}

	expect(isReadonlySignal(a)).toBe(false);
	expect(isReadonlySignal(b)).toBe(false);
	expect(isReadonlySignal(c)).toBe(false);
	expect(isReadonlySignal(d)).toBe(false);
	expect(isReadonlySignal(e)).toBe(false);

	const f = a.asReadonly();
	const g = c.asReadonly();
	const h = d.asReadonly();

	expect(isReadonlySignal(f)).toBe(true);
	expect(isReadonlySignal(g)).toBe(true);
	expect(isReadonlySignal(h)).toBe(true);

	expect(() => (b as any).asReadonly()).toThrow();
	expect(() => (e as any).asReadonly()).toThrow();
});
