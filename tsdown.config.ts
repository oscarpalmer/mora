import {defineConfig} from 'vite-plus/pack';

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
		// tsdown <0.23 compatibility: resolve external dependency subpaths.
		// Remove to preserve subpath imports as written (the new default).
		// https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
		resolveDepSubpath: true,
		alwaysBundle: /^@oscarpalmer/,
		onlyBundle: false,
	},
	entry: './src/index.ts',
	minify: 'dce-only',
});
