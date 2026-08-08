import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NetworksTab from './NetworksTab.svelte';
import type { NetworkSummary } from '$lib/types';

function network(partial: Partial<NetworkSummary>): NetworkSummary {
	return {
		id: partial.id ?? 'net1',
		name: partial.name ?? 'bridge',
		driver: partial.driver ?? 'bridge',
		scope: partial.scope ?? 'local',
		internal: partial.internal ?? false,
		attachable: partial.attachable ?? true,
		created: partial.created ?? 0,
		containers: partial.containers ?? 0,
		subnet: partial.subnet ?? '172.18.0.0/16'
	};
}

describe('NetworksTab', () => {
	it('ordena las redes de la más reciente a la más antigua', async () => {
		render(NetworksTab, {
			networks: [
				network({ id: 'a', name: 'old', created: 1000 }),
				network({ id: 'b', name: 'new', created: 9000 })
			],
			onRefresh: async () => {}
		});

		const rows = page.getByTestId('network-row');
		await expect.element(rows).toHaveLength(2);
		const names = await rows.elements();
		expect((names[0] as HTMLElement).textContent).toContain('new');
		expect((names[1] as HTMLElement).textContent).toContain('old');
	});

	it('muestra el conteo de redes y un estado vacío cuando no hay ninguna', async () => {
		render(NetworksTab, { networks: [], onRefresh: async () => {} });

		await expect.element(page.getByTestId('network-count')).toHaveTextContent(/0 red/);
		await expect.element(page.getByTestId('empty-state')).toBeInTheDocument();
	});
});
