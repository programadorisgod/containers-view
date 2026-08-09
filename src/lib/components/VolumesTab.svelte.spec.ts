import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import VolumesTab from './VolumesTab.svelte';
import type { VolumeSummary } from '$lib/types';

function volume(partial: Partial<VolumeSummary>): VolumeSummary {
	return {
		name: partial.name ?? 'data',
		engine: 'docker',
		driver: partial.driver ?? 'local',
		mountpoint: partial.mountpoint ?? '/var/lib/containers/storage/volumes/data',
		createdAt: partial.createdAt ?? '2024-01-01T00:00:00Z',
		scope: partial.scope ?? 'local',
		labels: partial.labels ?? {},
		used: partial.used ?? false
	};
}

describe('VolumesTab', () => {
	it('ordena los volúmenes del más reciente al más antiguo', async () => {
		render(VolumesTab, {
			volumes: [
				volume({ name: 'old', createdAt: '2024-01-01T00:00:00Z' }),
				volume({ name: 'new', createdAt: '2025-01-01T00:00:00Z' })
			],
			onRefresh: async () => {}
		});

		const rows = page.getByTestId('volume-row');
		await expect.element(rows).toHaveLength(2);
		const names = await rows.elements();
		expect((names[0] as HTMLElement).textContent).toContain('new');
		expect((names[1] as HTMLElement).textContent).toContain('old');
	});

	it('muestra el conteo de volúmenes y un estado vacío cuando no hay ninguno', async () => {
		render(VolumesTab, { volumes: [], onRefresh: async () => {} });

		await expect.element(page.getByTestId('volume-count')).toHaveTextContent(/0 volumen/);
		await expect.element(page.getByTestId('empty-state')).toBeInTheDocument();
	});
});
