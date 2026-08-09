import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ContainerRow from './ContainerRow.svelte';
import type { ContainerSummary } from '$lib/types';

function container(partial: Partial<ContainerSummary>): ContainerSummary {
	return {
		id: 'c1',
		engine: 'docker',
		name: 'app',
		names: ['app'],
		image: 'repo/app:latest',
		imageId: 'sha256:aaa',
		state: 'exited',
		running: false,
		status: 'Exited (0)',
		created: 0,
		ports: [],
		highlighted: false,
		...partial
	};
}

describe('ContainerRow', () => {
	it('muestra nombre, imagen y estado del contenedor', async () => {
		render(ContainerRow, { container: container({}), onRefresh: async () => {} });

		await expect.element(page.getByText('app', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText(/repo\/app:latest/)).toBeInTheDocument();
		await expect.element(page.getByTestId('container-status')).toBeInTheDocument();
	});

	it('habilita iniciar y deshabilita detener o reiniciar en un contenedor detenido', async () => {
		render(ContainerRow, { container: container({}), onRefresh: async () => {} });

		await expect
			.element(page.getByRole('button', { name: 'Iniciar contenedor', exact: true }))
			.toBeEnabled();
		await expect
			.element(page.getByRole('button', { name: 'Detener contenedor', exact: true }))
			.toBeDisabled();
		await expect
			.element(page.getByRole('button', { name: 'Reiniciar contenedor', exact: true }))
			.toBeDisabled();
	});

	it('deshabilita iniciar y habilita detener o reiniciar en un contenedor en ejecución', async () => {
		render(ContainerRow, {
			container: container({ running: true, state: 'running', status: 'Up 1h' }),
			onRefresh: async () => {}
		});

		await expect
			.element(page.getByRole('button', { name: 'Iniciar contenedor', exact: true }))
			.toBeDisabled();
		await expect
			.element(page.getByRole('button', { name: 'Detener contenedor', exact: true }))
			.toBeEnabled();
		await expect
			.element(page.getByRole('button', { name: 'Reiniciar contenedor', exact: true }))
			.toBeEnabled();
	});

	it('refleja el estado de destaque en el botón de estrella', async () => {
		render(ContainerRow, {
			container: container({ highlighted: true }),
			onRefresh: async () => {}
		});

		await expect
			.element(page.getByRole('button', { name: 'Quitar de destacados' }))
			.toBeInTheDocument();
	});

	it('llama a onRefresh tras iniciar el contenedor', async () => {
		const onRefresh = vi.fn(async () => {});
		const fetchMock = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({ ok: true, message: 'Contenedor iniciado' })
		})) as unknown as typeof fetch;
		vi.stubGlobal('fetch', fetchMock);
		try {
			render(ContainerRow, { container: container({}), onRefresh });

			await page.getByRole('button', { name: 'Iniciar contenedor', exact: true }).click();

			expect(fetchMock).toHaveBeenCalledWith(
				'/api/containers/c1/start',
				expect.objectContaining({ method: 'POST' })
			);
			expect(onRefresh).toHaveBeenCalledOnce();
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
