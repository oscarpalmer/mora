import {expect, test} from 'vitest';
import {
	array,
	computed,
	effect,
	isArray,
	isComputed,
	isEffect,
	isSignal,
	signal,
	store,
} from '../src';
import {isReactive, isStore} from '../src/helpers/is';

const a = signal('a');
const b = computed(() => `${a.get()}b`);
const c = array([]);
const d = store({});
const e = effect(() => {});

const values: unknown[] = [undefined, null, 'a', 123, true, Symbol('test'), {}, [], () => {}];

test('isArray', () => {
	for (const value of values) {
		expect(isArray(value)).toBe(false);
	}

	expect(isArray(a)).toBe(false);
	expect(isArray(b)).toBe(false);
	expect(isArray(c)).toBe(true);
	expect(isArray(d)).toBe(false);
	expect(isArray(e)).toBe(false);
});

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

test('isStore', () => {
	for (const value of values) {
		expect(isStore(value)).toBe(false);
	}

	expect(isStore(a)).toBe(false);
	expect(isStore(b)).toBe(false);
	expect(isStore(c)).toBe(false);
	expect(isStore(d)).toBe(true);
	expect(isStore(e)).toBe(false);
});
