import {expect, test} from 'vite-plus/test';
import {effect, signal} from '../src';

test('basic', () => {
	const value = signal(0);

	let count = 0;
	let total = 0;

	const fx = effect(() => {
		count += 1;
		total = value.get();
	});

	for (let index = 0; index < 100; index += 1) {
		value.update(current => current + index);
	}

	expect(fx.active).toBe(true);
	expect(count).toBe(100);
	expect(total).toBe(4950);
	expect(value.peek()).toBe(4950);

	fx.stop();
	fx.stop();

	expect(fx.active).toBe(false);

	for (let index = 0; index < 100; index += 1) {
		value.update(current => current + index);
	}

	expect(count).toBe(100);
	expect(total).toBe(4950);
	expect(value.peek()).toBe(9900);

	expect(() => effect(123 as never)).toThrow(TypeError);
});
