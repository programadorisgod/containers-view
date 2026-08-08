import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NetworkRow from './NetworkRow.svelte';
import type { NetworkSummary } from '$lib/types';

const { confirmActionMock, pushToastMock } = vi.hoisted(() => ({
	confirmActionMock: vi.fn(),
	pushToastMock: vi.fn()
}));

vi.mock('$lib/client/dialog.svelte', () => ({ confirmAction: confirmActionMock }));
vi.mock('$lib/client/toasts.svelte', () => ({ pushToast: pushToastMock }));

function network(partial: Partial<NetworkSummary>): NetworkSummary {
	return {
		id: 'net1',
		name: 'bridge',
		driver: 'bridge',
		scope: 'local',
		internal: false,
		attachable: true,
		created: 0,
		containers: 0,
		subnet: '172.18.0.0/16',
		...partial
	};
}

describe('NetworkRow', () => {
	beforeEach(() => {
		confirmActionMock.mockReset();
		pushToastMock.mockReset();
	});

	it('muestra el nombre, el driver y el alcance', async () => {
		render(NetworkRow, { network: network({}) });

		const row = page.getByTestId('network-row');
		await expect.element(row).toHaveTextContent(/bridge/);
		await expect.element(row).toHaveTextContent(/local/);
		await expect.element(row).toHaveTextContent(/172\.18\.0\.0\/16/);
	});

	it('indica cuando la red es interna', async () => {
		render(NetworkRow, { network: network({ internal: true }) });

		await expect.element(page.getByTitle('Red interna')).toBeInTheDocument();
	});

	it('no indica red interna cuando no lo es', async () => {
		render(NetworkRow, { network: network({}) });

		await expect.element(page.getByTitle('Red interna')).not.toBeInTheDocument();
	});

	it('muestra el número de contenedores conectados', async () => {
		render(NetworkRow, { network: network({ containers: 3 }) });

		await expect.element(page.getByText('3 contenedor(es)')).toBeInTheDocument();
	});

	it('llama a onRefresh tras eliminar la red cuando se confirma', async () => {
		confirmActionMock.mockResolvedValue(true);
		const onRefresh = vi.fn(async () => {});
		const fetchMock = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({ ok: true, message: 'Red eliminada' })
		})) as unknown as typeof fetch;
		vi.stubGlobal('fetch', fetchMock);
		try {
			render(NetworkRow, { network: network({}), onRefresh });

			await page.getByRole('button', { name: 'Eliminar red bridge', exact: true }).click();

			await vi.waitFor(() =>
				expect(fetchMock).toHaveBeenCalledWith(
					'/api/networks/net1/remove',
					expect.objectContaining({ method: 'POST' })
				)
			);
			await vi.waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('no elimina cuando se cancela la confirmación', async () => {
		confirmActionMock.mockResolvedValue(false);
		const onRefresh = vi.fn(async () => {});
		const fetchMock = vi.fn() as unknown as typeof fetch;
		vi.stubGlobal('fetch', fetchMock);
		try {
			render(NetworkRow, { network: network({}), onRefresh });

			await page.getByRole('button', { name: 'Eliminar red bridge', exact: true }).click();

			expect(fetchMock).not.toHaveBeenCalled();
			expect(onRefresh).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
