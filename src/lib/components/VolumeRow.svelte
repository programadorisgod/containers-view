<script lang="ts">
	import type { VolumeSummary } from '$lib/types';
	import { runAction, errorMessage } from '$lib/client/api';
	import { pushToast } from '$lib/client/toasts.svelte';
	import { confirmAction } from '$lib/client/dialog.svelte';
	import { Trash2, Loader2 } from '@lucide/svelte';
	import { formatDate } from '$lib/format';

	interface Props {
		volume: VolumeSummary;
		onRefresh?: () => void | Promise<void>;
	}

	let { volume, onRefresh = () => {} }: Props = $props();

	let pending = $state(false);

	async function remove() {
		if (pending) return;
		const ok = await confirmAction({
			title: `¿Eliminar el volumen "${volume.name}"?`,
			message: volume.used
				? 'Este volumen está en uso por un contenedor. La operación podría fallar.'
				: 'Esta acción no se puede deshacer.',
			confirmLabel: 'Eliminar',
			danger: true
		});
		if (!ok) return;
		pending = true;
		try {
			const result = await runAction('volumes', volume.name, 'remove');
			pushToast({ type: 'success', title: 'Volumen eliminado', message: result.message });
			await onRefresh();
		} catch (err) {
			pushToast({ type: 'error', title: 'No se pudo eliminar', message: errorMessage(err) });
		} finally {
			pending = false;
		}
	}
</script>

<div class="row" data-testid="volume-row">
	<div class="info">
		<p class="name mono">{volume.name}</p>
		<p class="meta">
			{volume.driver}
			{#if volume.mountpoint}
				<span class="dot">·</span>
				<span class="mono" title={volume.mountpoint}>{volume.mountpoint}</span>
			{/if}
		</p>
	</div>
	{#if volume.used}
		<span class="badge">En uso</span>
	{/if}
	<span class="created text-muted">{formatDate(new Date(volume.createdAt).getTime())}</span>
	<button
		class="action danger"
		onclick={remove}
		disabled={pending}
		title="Eliminar volumen"
		aria-label={`Eliminar volumen ${volume.name}`}
	>
		{#if pending}<span class="spin"><Loader2 size={14} /></span>{:else}<Trash2 size={14} />{/if}
	</button>
</div>

<style>
	.row {
		display: grid;
		grid-template-columns: 1fr auto auto auto;
		align-items: center;
		gap: 14px;
		padding: 12px 14px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.row:hover {
		border-color: var(--border-strong);
	}
	.info {
		min-width: 0;
	}
	.name {
		margin: 0;
		font-weight: 600;
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		margin: 2px 0 0;
		font-size: 12px;
		color: var(--text-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dot {
		margin: 0 6px;
		opacity: 0.5;
	}
	.badge {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
		color: var(--warning);
		background: var(--warning-bg);
	}
	.created {
		font-size: 12px;
		white-space: nowrap;
	}
	.action {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 7px;
		border: 1px solid var(--border);
		background: var(--bg-raised);
		color: var(--text-muted);
	}
	.action.danger:hover:not(:disabled) {
		color: var(--danger);
		border-color: rgba(251, 113, 133, 0.4);
		background: var(--danger-bg);
	}
	.action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.spin {
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 720px) {
		.row {
			grid-template-columns: 1fr auto;
			gap: 10px;
			padding: 12px;
		}
		.info {
			grid-column: 1;
			grid-row: 1;
		}
		.badge {
			grid-column: 2;
			grid-row: 1;
		}
		.created {
			grid-column: 1;
			grid-row: 2;
		}
		.action {
			grid-column: 2;
			grid-row: 1 / span 2;
		}
	}
</style>
