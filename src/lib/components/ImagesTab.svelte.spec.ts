import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ImagesTab from './ImagesTab.svelte';
import type { ImageSummary } from '$lib/types';

function image(partial: Partial<ImageSummary>): ImageSummary {
	return {
		id: partial.id ?? 'sha256:aaa',
		engine: 'docker',
		reference: partial.reference ?? 'repo/app:latest',
		size: partial.size ?? 1024,
		created: partial.created ?? 0,
		containers: partial.containers ?? 0,
		repoTags: partial.repoTags ?? [],
		repoDigests: partial.repoDigests ?? [],
		sharedSize: partial.sharedSize ?? 0,
		labels: partial.labels ?? {}
	};
}

describe('ImagesTab', () => {
	it('ordena las imágenes de la más reciente a la más antigua por defecto', async () => {
		render(ImagesTab, {
			images: [
				image({ id: 'a1', reference: 'old:v1', created: 1000 }),
				image({ id: 'b2', reference: 'new:v2', created: 9000 })
			],
			onRefresh: async () => {}
		});

		await expect.element(page.getByText('new:v2', { exact: true })).toBeInTheDocument();
		const rows = page.getByTestId('image-row');
		await expect.element(rows).toHaveLength(2);
		const names = await rows.elements();
		expect((names[0] as HTMLElement).textContent).toContain('new:v2');
		expect((names[1] as HTMLElement).textContent).toContain('old:v1');
	});

	it('invierte el orden al pulsar el botón de ordenación', async () => {
		render(ImagesTab, {
			images: [
				image({ id: 'a1', reference: 'old:v1', created: 1000 }),
				image({ id: 'b2', reference: 'new:v2', created: 9000 })
			],
			onRefresh: async () => {}
		});
		await expect.element(page.getByText('new:v2', { exact: true })).toBeInTheDocument();

		await page.getByRole('button', { name: /Cambiar orden/ }).click();

		const rows = page.getByTestId('image-row');
		const names = await rows.elements();
		expect((names[0] as HTMLElement).textContent).toContain('old:v1');
		expect((names[1] as HTMLElement).textContent).toContain('new:v2');
	});

	it('muestra el conteo de imágenes y un estado vacío cuando no hay ninguna', async () => {
		render(ImagesTab, { images: [], onRefresh: async () => {} });

		await expect.element(page.getByTestId('image-count')).toHaveTextContent(/0 imagen/);
		await expect.element(page.getByTestId('empty-state')).toBeInTheDocument();
	});
});
