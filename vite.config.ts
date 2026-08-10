// Vitest browser mode leaks its dynamic-import wrapper into SvelteKit's SSR
// environment, where `__vitest_browser_runner__` does not exist. Shim it with a
// passthrough until the upstream fix (vitest-dev/vitest#10355) is available.
const vitestBrowserRunner = globalThis as typeof globalThis & {
	__vitest_browser_runner__?: {
		wrapDynamicImport(load: () => Promise<unknown> | unknown): Promise<unknown> | unknown;
	};
};
vitestBrowserRunner.__vitest_browser_runner__ ??= {
	wrapDynamicImport: (load) => load()
};

import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig(({ mode }) => {
	// Vite no inyecta `.env` en `process.env` automáticamente; el código del
	// servidor lee process.env.SMTP_HOST, NOTIFY_TO, etc. Cargamos el `.env`
	// aquí para que la configuración funcione con un simple `.env`.
	const env = loadEnv(mode, process.cwd(), '');
	process.env = { ...process.env, ...env };

	return {
		server: {
			port: 3030
		},
		preview: {
			allowedHosts: process.env.PREVIEW_ALLOWED_HOSTS
				? process.env.PREVIEW_ALLOWED_HOSTS.split(',').map((h) => h.trim())
				: []
		},
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter(),
				paths: {
					base: '/containers'
				}
			})
		],
		test: {
			expect: { requireAssertions: true },
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						browser: {
							enabled: true,
							provider: playwright(),
							instances: [{ browser: 'chromium', headless: true }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**']
					}
				},

				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});
