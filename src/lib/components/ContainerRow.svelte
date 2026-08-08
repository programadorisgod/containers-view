<script lang="ts">
	import type { ContainerAction, ContainerSummary } from '$lib/types';
	import { runAction, setHighlight, errorMessage } from '$lib/client/api';
	import { pushToast } from '$lib/client/toasts.svelte';
	import { confirmAction } from '$lib/client/dialog.svelte';
	import { Star, Play, Square, RotateCcw, Trash2, Loader2 } from '@lucide/svelte';

	interface Props {
		container: ContainerSummary;
		onRefresh?: () => void | Promise<void>;
	}

	let { container, onRefresh = () => {} }: Props = $props();

	let pending = $state<ContainerAction | null>(null);

	const actionLabels: Record<ContainerAction, { label: string; title: string }> = {
		start: { label: 'Iniciar', title: 'Iniciar contenedor' },
		stop: { label: 'Detener', title: 'Detener contenedor' },
		restart: { label: 'Reiniciar', title: 'Reiniciar contenedor' },
		remove: { label: 'Eliminar', title: 'Eliminar contenedor' }
	};

	function canStart(): boolean {
		return !container.running && container.state !== 'unknown';
	}

	async function run(action: ContainerAction) {
		if (pending) return;
		if (action === 'remove') {
			const ok = await confirmAction({
				title: `¿Eliminar "${container.name}"?`,
				message: `Se eliminará el contenedor "${container.name}" (${container.id.slice(0, 12)}). Esta acción no se puede deshacer.`,
				confirmLabel: 'Eliminar',
				danger: true
			});
			if (!ok) return;
		}
		pending = action;
		try {
			const result = await runAction('containers', container.id, action, { name: container.name });
			pushToast({ type: 'success', title: actionLabels[action].title, message: result.message });
			await onRefresh();
		} catch (err) {
			pushToast({ type: 'error', title: actionLabels[action].title, message: errorMessage(err) });
		} finally {
			pending = null;
		}
	}

	async function toggleHighlight() {
		try {
			const result = await setHighlight(container.id, container.name, !container.highlighted);
			pushToast({
				type: 'success',
				title: 'Destaque',
				message: result.message
			});
			await onRefresh();
		} catch (err) {
			pushToast({ type: 'error', title: 'Destaque', message: errorMessage(err) });
		}
	}
</script>

<div
	class:highlighted={container.highlighted}
	class="row"
	data-state={container.state}
	data-testid="container-row"
>
	<button
		class="star"
		class:active={container.highlighted}
		onclick={toggleHighlight}
		aria-pressed={container.highlighted}
		aria-label={container.highlighted ? 'Quitar de destacados' : 'Destacar contenedor'}
		title={container.highlighted ? 'Quitar del vigilante' : 'Destacar (vigilar)'}
	>
		<Star size={16} fill={container.highlighted ? 'currentColor' : 'none'} />
	</button>

	<div class="info">
		<p class="name">{container.name}</p>
		<p class="meta mono">
			{container.image || container.imageId.slice(7, 19)}
			<span class="dot">·</span>
			{container.id.slice(0, 12)}
			{#if container.ports.length}
				<span class="dot">·</span>
				{container.ports
					.map((p) => `${p.hostPort ? `${p.hostPort}→` : ''}${p.containerPort}/${p.type}`)
					.join(', ')}
			{/if}
		</p>
	</div>

	<span class="status {container.state}" data-testid="container-status">
		<span class="led"></span>
		{container.state}
	</span>

	<div class="actions">
		<button
			class="action"
			disabled={!canStart() || pending !== null}
			onclick={() => run('start')}
			title={actionLabels.start.title}
			aria-label={actionLabels.start.title}
		>
			{#if pending === 'start'}<span class="spin"><Loader2 size={14} /></span>{:else}<Play
					size={14}
				/>{/if}
		</button>
		<button
			class="action"
			disabled={!container.running || pending !== null}
			onclick={() => run('stop')}
			title={actionLabels.stop.title}
			aria-label={actionLabels.stop.title}
		>
			{#if pending === 'stop'}<span class="spin"><Loader2 size={14} /></span>{:else}<Square
					size={14}
				/>{/if}
		</button>
		<button
			class="action"
			disabled={!container.running || pending !== null}
			onclick={() => run('restart')}
			title={actionLabels.restart.title}
			aria-label={actionLabels.restart.title}
		>
			{#if pending === 'restart'}<span class="spin"><Loader2 size={14} /></span>{:else}<RotateCcw
					size={14}
				/>{/if}
		</button>
		<button
			class="action danger"
			disabled={pending !== null}
			onclick={() => run('remove')}
			title={actionLabels.remove.title}
			aria-label={actionLabels.remove.title}
		>
			{#if pending === 'remove'}<span class="spin"><Loader2 size={14} /></span>{:else}<Trash2
					size={14}
				/>{/if}
		</button>
	</div>
</div>

<style>
	.row {
		display: grid;
		grid-template-columns: 32px 1fr auto auto;
		align-items: center;
		gap: 14px;
		padding: 12px 14px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.row:hover {
		border-color: var(--border-strong);
	}
	.row.highlighted {
		border-color: rgba(251, 191, 36, 0.5);
		background:
			linear-gradient(180deg, rgba(251, 191, 36, 0.07), rgba(251, 191, 36, 0.03) 40%),
			var(--bg-elevated);
	}

	.star {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		border-radius: 6px;
		color: var(--text-faint);
	}
	.star:hover {
		color: var(--warning);
		background: var(--warning-bg);
	}
	.star.active {
		color: var(--warning);
	}

	.info {
		min-width: 0;
	}
	.name {
		margin: 0;
		font-weight: 600;
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

	.status {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 12px;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 999px;
		text-transform: capitalize;
		white-space: nowrap;
	}
	.led {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
	}
	.status.running {
		color: var(--success);
		background: var(--success-bg);
	}
	.status.created {
		color: var(--info);
		background: var(--info-bg);
	}
	.status.exited,
	.status.dead,
	.status.removing,
	.status.unknown {
		color: var(--text-muted);
		background: rgba(148, 163, 184, 0.12);
	}
	.status.paused,
	.status.restarting {
		color: var(--warning);
		background: var(--warning-bg);
	}

	.actions {
		display: flex;
		gap: 6px;
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
	.action:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--border-strong);
	}
	.action.danger:hover:not(:disabled) {
		color: var(--danger);
		border-color: rgba(251, 113, 133, 0.4);
		background: var(--danger-bg);
	}
	.action:disabled {
		opacity: 0.35;
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
			grid-template-columns: 28px 1fr auto;
			gap: 10px;
			padding: 12px;
		}
		.star {
			grid-column: 1;
			grid-row: 1;
		}
		.info {
			grid-column: 2;
			grid-row: 1;
		}
		.status {
			grid-column: 3;
			grid-row: 1;
		}
		.actions {
			grid-column: 1 / -1;
			grid-row: 2;
			justify-content: flex-end;
			padding-top: 2px;
		}
	}
</style>
