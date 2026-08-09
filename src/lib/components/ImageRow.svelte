<script lang="ts">
	import type { ImageSummary } from '$lib/types';
	import { runAction, errorMessage } from '$lib/client/api';
	import { pushToast } from '$lib/client/toasts.svelte';
	import { confirmAction } from '$lib/client/dialog.svelte';
	import { Trash2, Loader2 } from '@lucide/svelte';
	import { formatBytes, formatDate } from '$lib/format';
	import EngineBadge from './EngineBadge.svelte';

	interface Props {
		image: ImageSummary;
		onRefresh?: () => void | Promise<void>;
	}

	let { image, onRefresh = () => {} }: Props = $props();

	let pending = $state(false);

	async function remove() {
		if (pending) return;
		const ok = await confirmAction({
			title: `¿Eliminar la imagen "${image.reference}"?`,
			message:
				image.containers > 0
					? `Hay ${image.containers} contenedor(es) que usan esta imagen. Se eliminará por la fuerza.`
					: 'Esta acción no se puede deshacer.',
			confirmLabel: 'Eliminar',
			danger: true
		});
		if (!ok) return;
		pending = true;
		try {
			const result = await runAction('images', image.id, 'remove', { name: image.reference });
			pushToast({ type: 'success', title: 'Imagen eliminada', message: result.message });
			await onRefresh();
		} catch (err) {
			pushToast({ type: 'error', title: 'No se pudo eliminar', message: errorMessage(err) });
		} finally {
			pending = false;
		}
	}
</script>

<div class="row" data-testid="image-row">
	<div class="info">
		<p class="name mono" title={image.reference}>{image.reference}</p>
		<p class="meta">
			<EngineBadge engine={image.engine} />
			<span class="pad"></span>
			<span class="mono">{image.id.slice(7, 19)}</span>
			<span class="dot">·</span>
			{formatBytes(image.size)}
			{#if image.containers > 0}
				<span class="dot">·</span>
				<span class="used">{image.containers} contenedor(es)</span>
			{/if}
		</p>
	</div>
	<span class="created text-muted">{formatDate(image.created)}</span>
	<button
		class="action danger"
		onclick={remove}
		disabled={pending}
		title="Eliminar imagen"
		aria-label={`Eliminar imagen ${image.reference}`}
	>
		{#if pending}<span class="spin"><Loader2 size={14} /></span>{:else}<Trash2 size={14} />{/if}
	</button>
</div>

<style>
	.row {
		display: grid;
		grid-template-columns: 1fr auto auto;
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
	}
	.dot {
		margin: 0 6px;
		opacity: 0.5;
	}
	.pad {
		display: inline-block;
		width: 6px;
	}
	.used {
		color: var(--warning);
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
