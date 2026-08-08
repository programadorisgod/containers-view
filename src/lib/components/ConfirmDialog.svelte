<script lang="ts">
	import { getRequest, resolveConfirm } from '$lib/client/dialog.svelte';
	import { AlertTriangle } from '@lucide/svelte';

	let request = $derived(getRequest());

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') resolveConfirm(false);
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if request}
	<div
		class="overlay"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && resolveConfirm(false)}
	>
		<div class="dialog" role="alertdialog" aria-modal="true" aria-label={request.title}>
			<div class="heading">
				{#if request.danger}
					<span class="warn"><AlertTriangle size={20} /></span>
				{/if}
				<h3>{request.title}</h3>
			</div>
			{#if request.message}<p class="message">{request.message}</p>{/if}
			<div class="actions">
				<button class="ghost" onclick={() => resolveConfirm(false)}>Cancelar</button>
				<button class:danger={request.danger} class="confirm" onclick={() => resolveConfirm(true)}>
					{request.confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: center;
		background: rgba(2, 6, 12, 0.7);
		backdrop-filter: blur(2px);
		padding: 16px;
	}

	.dialog {
		width: 100%;
		max-width: 420px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 20px;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
		animation: dialog-in 0.16s ease-out;
	}

	@keyframes dialog-in {
		from {
			opacity: 0;
			transform: scale(0.97);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.heading {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.warn {
		color: var(--warning);
		display: flex;
	}

	.message {
		color: var(--text-muted);
		margin: 10px 0 18px;
		white-space: pre-line;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	button {
		border-radius: var(--radius-sm);
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 600;
		border: 1px solid var(--border);
		background: var(--bg-raised);
		color: var(--text);
	}
	button:hover {
		border-color: var(--border-strong);
	}

	.ghost {
		background: transparent;
	}

	.confirm {
		background: var(--accent);
		border-color: var(--accent);
		color: #062031;
	}
	.confirm.danger {
		background: var(--danger);
		border-color: var(--danger);
		color: #2c0710;
	}
</style>
