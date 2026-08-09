import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import VolumeRow from './VolumeRow.svelte';
import type { VolumeSummary } from '$lib/types';

const { confirmActionMock, pushToastMock } = vi.hoisted(() => ({
	confirmActionMock: vi.fn(),
	pushToastMock: vi.fn()
}));

vi.mock('$lib/client/dialog.svelte', () => ({ confirmAction: confirmActionMock }));
vi.mock('$lib/client/toasts.svelte', () => ({ pushToast: pushToastMock }));

function volume(partial: Partial<VolumeSummary>): VolumeSummary {
	return {
		name: 'data',
		engine: 'docker',
		driver: 'local',
		mountpoint: '/var/lib/containers/storage/volumes/data',
		createdAt: '2024-01-01T00:00:00Z',
		scope: 'local',
		labels: {},
		used: false,
		...partial
	};
}

describe('VolumeRow', () => {
	beforeEach(() => {
		confirmActionMock.mockReset();
		pushToastMock.mockReset();
	});

	it('muestra el nombre, el driver y la ruta de montaje', async () => {
		render(VolumeRow, { volume: volume({}) });

		const row = page.getByTestId('volume-row');
		await expect.element(row).toHaveTextContent(/data/);
		await expect.element(row).toHaveTextContent(/local/);
		await expect.element(row).toHaveTextContent(/var\/lib\/containers/);
	});

	it('muestra la insignia de uso cuando el volumen está en uso', async () => {
		render(VolumeRow, { volume: volume({ used: true }) });

		await expect.element(page.getByText('En uso', { exact: true })).toBeInTheDocument();
	});

	it('no muestra la insignia de uso cuando el volumen está libre', async () => {
		render(VolumeRow, { volume: volume({}) });

		await expect.element(page.getByText('En uso', { exact: true })).not.toBeInTheDocument();
	});

	it('llama a onRefresh tras eliminar el volumen cuando se confirma', async () => {
		confirmActionMock.mockResolvedValue(true);
		const onRefresh = vi.fn(async () => {});
		const fetchMock = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({ ok: true, message: 'Volumen eliminado' })
		})) as unknown as typeof fetch;
		vi.stubGlobal('fetch', fetchMock);
		try {
			render(VolumeRow, { volume: volume({}), onRefresh });

			await page.getByRole('button', { name: 'Eliminar volumen data', exact: true }).click();

			await vi.waitFor(() =>
				expect(fetchMock).toHaveBeenCalledWith(
					'/api/volumes/data/remove',
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
			render(VolumeRow, { volume: volume({}), onRefresh });

			await page.getByRole('button', { name: 'Eliminar volumen data', exact: true }).click();

			expect(fetchMock).not.toHaveBeenCalled();
			expect(onRefresh).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
