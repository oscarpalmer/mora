/// <reference types="vitest" />
import {defineConfig} from 'vite';

export default defineConfig({
	base: './',
	logLevel: 'silent',
	pack: {
		clean: false,
		dts: true,
		entry: ['./src/**/*.ts'],
		unbundle: false,
	},
	test: {
		coverage: {
			include: ['src/**/*.ts'],
			provider: 'istanbul',
		},
		environment: 'jsdom',
		watch: false,
	},
});
