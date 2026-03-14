import {defineConfig} from 'tsdown';

const watch = process.argv.includes('--watch');

export default defineConfig({
	clean: !watch,
	copy: [
		{
			from: './dist/index.mjs',
			to: './dist',
			rename: 'mora.full.mjs',
		},
	],
	deps: {
		alwaysBundle: /^@oscarpalmer/,
		onlyBundle: false,
	},
	entry: './src/index.ts',
	minify: 'dce-only',
});
