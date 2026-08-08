import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ContainersTab from './ContainersTab.svelte';
import type { ContainerSummary } from '$lib/types';

function container(partial: Partial<ContainerSummary>): ContainerSummary {
	return {
		id: partial.id ?? 'id-1',
		name: partial.name ?? 'app',
		names: [partial.name ?? 'app'],
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

const samples: ContainerSummary[] = [
	container({
		id: 'a1',
		name: 'web',
		running: true,
		state: 'running',
		status: 'Up 1h',
		highlighted: true
	}),
	container({ id: 'b2', name: 'worker', running: false, state: 'exited', status: 'Exited (0)' }),
	container({ id: 'c3', name: 'db', running: true, state: 'running', status: 'Up 2h' })
];

describe('ContainersTab', () => {
	it('muestra todos los contenedores y los filtros por estado', async () => {
		render(ContainersTab, { containers: samples, onRefresh: async () => {} });

		await expect.element(page.getByText('worker', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByTestId('container-row')).toHaveLength(3);
		await expect.element(page.getByRole('button', { name: /Todos/ })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /En ejecución/ })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /Destacados/ })).toBeInTheDocument();
	});

	it('filtra por contenedores detenidos al pulsar su chip', async () => {
		render(ContainersTab, { containers: samples, onRefresh: async () => {} });
		await expect.element(page.getByText('worker', { exact: true })).toBeInTheDocument();

		await page.getByRole('button', { name: /Detenidos/ }).click();

		await expect.element(page.getByTestId('container-row')).toHaveLength(1);
		await expect.element(page.getByText('worker', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('web', { exact: true })).not.toBeInTheDocument();
	});

	it('filtra por contenedores destacados', async () => {
		render(ContainersTab, { containers: samples, onRefresh: async () => {} });
		await expect.element(page.getByText('web', { exact: true })).toBeInTheDocument();

		await page.getByRole('button', { name: /Destacados/ }).click();

		await expect.element(page.getByTestId('container-row')).toHaveLength(1);
		await expect.element(page.getByText('web', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('db', { exact: true })).not.toBeInTheDocument();
	});

	it('filtra por texto en el buscador de nombre o imagen', async () => {
		render(ContainersTab, { containers: samples, onRefresh: async () => {} });
		await expect.element(page.getByText('db', { exact: true })).toBeInTheDocument();

		await page.getByLabelText('Buscar contenedores').fill('db');

		await expect.element(page.getByTestId('container-row')).toHaveLength(1);
		await expect.element(page.getByText('db', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('web', { exact: true })).not.toBeInTheDocument();
	});

	it('muestra un estado vacío cuando no hay contenedores', async () => {
		render(ContainersTab, { containers: [], onRefresh: async () => {} });

		await expect.element(page.getByTestId('empty-state')).toBeInTheDocument();
	});
});
