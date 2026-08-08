<script lang="ts">
	import type {
		ContainerSummary,
		EngineStatus,
		ImageSummary,
		NetworkSummary,
		NotificationChannelType,
		VolumeSummary,
		WatchState
	} from '$lib/types';
	import {
		Boxes as ContainersIcon,
		Image,
		Database,
		Network,
		RefreshCw,
		Bell,
		Loader2,
		X,
		CheckCircle2
	} from '@lucide/svelte';
	import ContainersTab from '$lib/components/ContainersTab.svelte';
	import ImagesTab from '$lib/components/ImagesTab.svelte';
	import VolumesTab from '$lib/components/VolumesTab.svelte';
	import NetworksTab from '$lib/components/NetworksTab.svelte';
	import {
		fetchStatus,
		fetchList,
		fetchWatcher,
		updateWatcher,
		fetchSettings,
		updateSettings,
		sendTestNotification,
		runWatcherNow,
		errorMessage
	} from '$lib/client/api';
	import { pushToast } from '$lib/client/toasts.svelte';

	type Tab = 'containers' | 'images' | 'volumes' | 'networks';

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'containers', label: 'Contenedores' },
		{ id: 'images', label: 'Imágenes' },
		{ id: 'volumes', label: 'Volúmenes' },
		{ id: 'networks', label: 'Redes' }
	];

	let tab = $state<Tab>('containers');
	let status = $state<EngineStatus | null>(null);
	let containers = $state<ContainerSummary[]>([]);
	let images = $state<ImageSummary[]>([]);
	let volumes = $state<VolumeSummary[]>([]);
	let networks = $state<NetworkSummary[]>([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let watcher = $state<WatchState | null>(null);
	let showSettings = $state(false);
	let settingsTo = $state('');
	let settingsFrom = $state('');
	let availableChannels = $state<
		{ type: NotificationChannelType; label: string; description: string; configured: boolean }[]
	>([]);
	let settingsSaving = $state(false);
	let testing = $state(false);
	let checking = $state(false);
	let intervalInput = $state('60');
	let closeBtn: HTMLButtonElement | undefined = $state();

	const needsSetup = $derived(
		availableChannels.some(
			(ch) => ch.type !== 'console' && ch.type !== 'whatsapp' && !ch.configured
		)
	);

	async function loadStatus() {
		try {
			status = (await fetchStatus()).status;
		} catch {
			status = null;
		}
	}

	async function loadLists() {
		refreshing = true;
		try {
			const [c, i, v, n] = await Promise.all([
				fetchList<ContainerSummary>('containers'),
				fetchList<ImageSummary>('images'),
				fetchList<VolumeSummary>('volumes'),
				fetchList<NetworkSummary>('networks')
			]);
			containers = c;
			images = i;
			volumes = v;
			networks = n;
		} catch (err) {
			pushToast({
				type: 'error',
				title: 'No se pudieron cargar los recursos',
				message: errorMessage(err)
			});
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	async function loadWatcher() {
		try {
			watcher = await fetchWatcher();
			if (watcher) intervalInput = String(Math.round(watcher.intervalMs / 1000));
		} catch {
			watcher = null;
		}
	}

	async function loadSettings() {
		try {
			const s = await fetchSettings();
			settingsTo = s.to;
			settingsFrom = s.from;
			availableChannels = s.channels;
		} catch {
			/* settings not critical */
		}
	}

	function toggleSettings() {
		showSettings = !showSettings;
		if (showSettings) loadSettings();
	}

	function closeSettings() {
		showSettings = false;
	}

	function refreshAll() {
		loadStatus();
		loadLists();
		loadWatcher();
		loadSettings();
	}

	async function toggleWatcher() {
		if (!watcher) return;
		const next = !watcher.enabled;
		try {
			watcher = await updateWatcher({ enabled: next });
			pushToast({
				type: 'success',
				title: next ? 'Vigilancia activada' : 'Vigilancia pausada',
				message: next
					? 'Se comprobará periódicamente el estado de los contenedores destacados.'
					: 'La comprobación periódica está pausada.'
			});
		} catch (err) {
			pushToast({ type: 'error', title: 'No se pudo actualizar', message: errorMessage(err) });
		}
	}

	async function saveInterval() {
		if (!watcher) return;
		const seconds = Number(intervalInput);
		if (!Number.isFinite(seconds) || seconds < 10) {
			pushToast({
				type: 'error',
				title: 'Intervalo inválido',
				message: 'El intervalo debe ser de al menos 10 segundos.'
			});
			return;
		}
		try {
			watcher = await updateWatcher({ intervalMs: Math.round(seconds * 1000) });
			pushToast({
				type: 'success',
				title: 'Intervalo actualizado',
				message: `Se comprobará cada ${seconds} segundos.`
			});
		} catch (err) {
			pushToast({ type: 'error', title: 'No se pudo actualizar', message: errorMessage(err) });
		}
	}

	async function saveSettings() {
		settingsSaving = true;
		try {
			const s = await updateSettings({ to: settingsTo, from: settingsFrom });
			availableChannels = s.channels;
			pushToast({
				type: 'success',
				title: 'Ajustes guardados',
				message: 'La configuración de notificaciones se ha guardado.'
			});
		} catch (err) {
			pushToast({ type: 'error', title: 'No se pudo guardar', message: errorMessage(err) });
		} finally {
			settingsSaving = false;
		}
	}

	async function testNotification() {
		testing = true;
		try {
			const result = await sendTestNotification();
			pushToast({
				type: result.ok ? 'success' : 'error',
				title: 'Notificación de prueba',
				message: result.message
			});
		} catch (err) {
			pushToast({ type: 'error', title: 'Fallo al enviar', message: errorMessage(err) });
		} finally {
			testing = false;
		}
	}

	async function runNow() {
		if (!watcher) return;
		checking = true;
		try {
			const result = await runWatcherNow();
			const downCount = result.down.length;
			pushToast({
				type: downCount > 0 ? 'warning' : 'success',
				title: 'Comprobación completada',
				message:
					downCount > 0
						? `${downCount} destacado(s) caído(s)${result.notified ? ' · se notificó' : ''}.`
						: `${result.checked} destacado(s) comprobados, todos en ejecución.`
			});
			watcher = await fetchWatcher();
		} catch (err) {
			pushToast({ type: 'error', title: 'Fallo al comprobar', message: errorMessage(err) });
		} finally {
			checking = false;
		}
	}

	$effect(() => {
		if (!showSettings) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') showSettings = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (showSettings) closeBtn?.focus();
	});

	$effect(() => {
		refreshAll();
		const interval = setInterval(loadStatus, 10_000);
		return () => clearInterval(interval);
	});
</script>

<div class="page">
	<header class="app-header">
		<div class="brand">
			<h1>Containers&nbsp;View</h1>
			<p class="tagline">Visor web para Podman y Docker</p>
		</div>

		<div class="status" data-testid="engine-status" title={status?.socketPath ?? undefined}>
			{#if status}
				<span class="dot {status.running ? 'ok' : 'down'}" aria-hidden="true"></span>
				<span class="engine">
					{status.engine ? (status.engine === 'podman' ? 'Podman' : 'Docker') : 'Motor desconocido'}
					{#if status.version}
						<span class="version">{status.version}</span>
					{/if}
				</span>
				<span class="state text-muted">{status.running ? 'conectado' : 'no disponible'}</span>
				{#if status.error}
					<span class="err" title={status.error}>⚠</span>
				{/if}
			{:else}
				<span class="dot down" aria-hidden="true"></span>
				<span class="engine">Sin conexión</span>
			{/if}
		</div>

		<button
			class="btn notif"
			class:open={showSettings}
			onclick={toggleSettings}
			title="Ajustes de vigilancia y notificaciones"
			aria-label="Abrir ajustes de vigilancia y notificaciones"
			aria-expanded={showSettings}
			data-testid="settings-open"
		>
			<Bell size={16} />
			<span class="label">Notificaciones</span>
			{#if needsSetup}
				<span class="badge" title="Hay canales sin configurar"></span>
			{/if}
		</button>

		<button
			class="icon-btn"
			onclick={refreshAll}
			disabled={refreshing}
			title="Actualizar todo"
			aria-label="Actualizar todo"
		>
			{#if refreshing}<span class="spin"><Loader2 size={17} /></span>{:else}<RefreshCw
					size={17}
				/>{/if}
		</button>
	</header>

	<div class="tabs" role="tablist" aria-label="Tipo de recurso" data-testid="tabs">
		{#each tabs as t (t.id)}
			<button
				role="tab"
				aria-selected={tab === t.id}
				class:active={tab === t.id}
				onclick={() => (tab = t.id)}
				data-testid="tab"
				data-tab={t.id}
			>
				{#if t.id === 'containers'}<ContainersIcon size={15} />
				{:else if t.id === 'images'}<Image size={15} />
				{:else if t.id === 'volumes'}<Database size={15} />
				{:else}<Network size={15} />{/if}
				{t.label}
			</button>
		{/each}
	</div>

	{#if showSettings}
		<div class="overlay" onclick={closeSettings} aria-hidden="true"></div>
		<div
			class="drawer"
			data-testid="settings-panel"
			role="dialog"
			aria-modal="true"
			aria-label="Ajustes de vigilancia y notificaciones"
		>
			<header class="drawer-header">
				<h2><Bell size={15} /> Vigilancia y notificaciones</h2>
				<button
					class="icon-btn"
					onclick={closeSettings}
					aria-label="Cerrar ajustes"
					bind:this={closeBtn}
					data-testid="settings-close"
				>
					<X size={17} />
				</button>
			</header>

			<div class="drawer-body">
				<h3>Vigilancia</h3>
				<div class="field">
					<button class="switch-row" onclick={toggleWatcher} data-testid="watcher-toggle">
						<span
							class="switch"
							class:on={watcher?.enabled}
							role="switch"
							aria-checked={!!watcher?.enabled}
						>
							<span class="knob"></span>
						</span>
						<span>
							<strong>{watcher?.enabled ? 'Vigilancia activada' : 'Vigilancia pausada'}</strong>
							<small
								>Cuando un contenedor destacado deja de ejecutarse, se envía una notificación.</small
							>
						</span>
					</button>
				</div>

				{#if watcher}
					<div class="field">
						<label for="interval">Intervalo de comprobación (segundos)</label>
						<div class="inline">
							<input
								id="interval"
								type="number"
								min="10"
								step="5"
								bind:value={intervalInput}
								data-testid="watcher-interval"
							/>
							<button class="btn" onclick={saveInterval} data-testid="watcher-save-interval"
								>Guardar</button
							>
						</div>
					</div>

					<p class="stats text-muted">
						<span data-testid="watcher-targets">{watcher.targets.length} destacado(s)</span>
						· <span>{watcher.alertCount} alerta(s)</span>
						· última comprobación: {watcher.lastRunAt
							? new Date(watcher.lastRunAt).toLocaleTimeString()
							: '—'}
					</p>

					<button
						class="btn ghost"
						onclick={runNow}
						disabled={checking}
						data-testid="watcher-run-now"
					>
						{checking ? 'Comprobando…' : 'Comprobar ahora'}
					</button>
				{/if}

				<h3>Notificaciones</h3>
				<div class="field">
					<label for="settings-to">Destinatario</label>
					<input
						id="settings-to"
						type="text"
						bind:value={settingsTo}
						placeholder="alguien@ejemplo.com"
						data-testid="settings-to"
					/>
				</div>
				<div class="field">
					<label for="settings-from">Remitente</label>
					<input
						id="settings-from"
						type="text"
						bind:value={settingsFrom}
						placeholder="containers@ejemplo.com"
						data-testid="settings-from"
					/>
				</div>
				<div class="field">
					<span class="field-label">Canales</span>
					<ul class="channels">
						{#each availableChannels as ch (ch.type)}
							<li data-testid="channel">
								{#if ch.configured}<span class="ok"><CheckCircle2 size={14} /></span>{:else}<span
										class="off"
										aria-hidden="true"
									></span>{/if}
								<span class="label">{ch.label}</span>
								<span class="desc">{ch.description}</span>
								<span class="state {ch.configured ? 'configured' : 'unconfigured'}"
									>{ch.configured ? 'configurado' : 'sin configurar'}</span
								>
							</li>
						{/each}
					</ul>
				</div>
				<div class="actions">
					<button
						class="btn"
						onclick={saveSettings}
						disabled={settingsSaving}
						data-testid="settings-save"
					>
						{settingsSaving ? 'Guardando…' : 'Guardar ajustes'}
					</button>
					<button
						class="btn ghost"
						onclick={testNotification}
						disabled={testing}
						data-testid="settings-test"
					>
						{testing ? 'Enviando…' : 'Enviar notificación de prueba'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<main class="content">
		{#if loading}
			<div class="loading text-muted" role="status">Cargando recursos…</div>
		{:else}
			{#if tab === 'containers'}
				<ContainersTab {containers} onRefresh={loadLists} />
			{:else if tab === 'images'}
				<ImagesTab {images} onRefresh={loadLists} />
			{:else if tab === 'volumes'}
				<VolumesTab {volumes} onRefresh={loadLists} />
			{:else if tab === 'networks'}
				<NetworksTab {networks} onRefresh={loadLists} />
			{/if}
		{/if}
	</main>
</div>

<style>
	.page {
		max-width: 1080px;
		margin: 0 auto;
		padding: 0 20px;
	}
	.app-header {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 18px 0 14px;
		flex-wrap: wrap;
	}
	.brand h1 {
		margin: 0;
		font-size: 20px;
		letter-spacing: -0.02em;
	}
	.tagline {
		margin: 2px 0 0;
		font-size: 12px;
		color: var(--text-faint);
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
		padding: 6px 12px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg-elevated);
		font-size: 13px;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.dot.ok {
		background: var(--success);
		box-shadow: 0 0 0 3px var(--success-bg);
	}
	.dot.down {
		background: var(--danger);
		box-shadow: 0 0 0 3px var(--danger-bg);
	}
	.engine {
		font-weight: 600;
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
	}
	.version {
		font-weight: 500;
		color: var(--text-muted);
		font-size: 12px;
	}
	.state {
		font-size: 12px;
	}
	.err {
		color: var(--warning);
	}
	.icon-btn {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text-muted);
	}
	.icon-btn:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--border-strong);
	}
	.icon-btn:disabled {
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
	.tabs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		border-bottom: 1px solid var(--border);
		margin-bottom: 18px;
	}
	.tabs button {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 10px 14px;
		border: none;
		background: none;
		color: var(--text-muted);
		font-size: 14px;
		font-weight: 600;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		white-space: nowrap;
	}
	.tabs button:hover {
		color: var(--text);
	}
	.tabs button.active {
		color: var(--text);
		border-bottom-color: var(--accent);
	}
	.btn.notif {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		position: relative;
		padding: 7px 13px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text);
		font-size: 13px;
		font-weight: 600;
	}
	.btn.notif:hover:not(:disabled) {
		border-color: var(--border-strong);
		color: var(--text);
	}
	.btn.notif.open {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--info-bg);
	}
	.btn.notif .badge {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--warning);
		box-shadow: 0 0 0 2px var(--warning-bg);
	}
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(4, 8, 16, 0.6);
		z-index: 40;
	}
	.drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(420px, 100vw);
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		box-shadow: -18px 0 44px rgba(0, 0, 0, 0.45);
		z-index: 50;
	}
	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	.drawer-header h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: 15px;
		text-transform: none;
		letter-spacing: 0;
		color: var(--text);
	}
	.drawer-body {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 16px;
	}
	.drawer-body h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 4px 0 0;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.field label {
		font-size: 13px;
		font-weight: 600;
	}
	.field-label {
		font-size: 13px;
		font-weight: 600;
	}
	.inline {
		display: flex;
		gap: 8px;
	}
	input[type='text'],
	input[type='number'] {
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--bg-raised);
		color: var(--text);
		font-size: 13px;
	}
	input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.switch-row {
		display: flex;
		align-items: center;
		gap: 12px;
		text-align: left;
		background: none;
		border: none;
		color: var(--text);
		padding: 0;
	}
	.switch-row strong {
		display: block;
		font-size: 14px;
	}
	.switch-row small {
		display: block;
		margin-top: 2px;
		color: var(--text-faint);
		font-size: 12px;
	}
	.switch {
		position: relative;
		width: 42px;
		height: 24px;
		border-radius: 999px;
		background: var(--bg-raised);
		border: 1px solid var(--border-strong);
		flex-shrink: 0;
		transition: background 0.15s;
	}
	.switch .knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--text-faint);
		transition:
			transform 0.15s,
			background 0.15s;
	}
	.switch.on {
		background: var(--accent);
		border-color: var(--accent);
	}
	.switch.on .knob {
		transform: translateX(18px);
		background: #062031;
	}
	.stats {
		margin: 0;
		font-size: 12px;
	}
	.channels {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.channels li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.channels .ok {
		color: var(--success);
		flex-shrink: 0;
	}
	.channels .off {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1px solid var(--border-strong);
		flex-shrink: 0;
	}
	.channels .label {
		font-weight: 600;
	}
	.channels .desc {
		color: var(--text-faint);
		font-size: 12px;
		flex: 1;
	}
	.channels .state {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
	}
	.channels .state.configured {
		color: var(--success);
		background: var(--success-bg);
	}
	.channels .state.unconfigured {
		color: var(--text-faint);
		background: var(--bg-raised);
	}
	.actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.btn {
		padding: 8px 14px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--accent);
		background: var(--accent);
		color: #062031;
		font-size: 13px;
		font-weight: 600;
	}
	.btn:hover:not(:disabled) {
		filter: brightness(1.06);
	}
	.btn.ghost {
		background: var(--bg-raised);
		color: var(--text);
		border-color: var(--border-strong);
	}
	.btn.ghost:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}
	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.loading {
		padding: 60px 0;
		text-align: center;
		font-size: 13px;
	}
	@media (max-width: 720px) {
		.app-header {
			padding: 14px 0 12px;
			gap: 10px;
		}
		.brand h1 {
			font-size: 18px;
		}
		.tabs button {
			padding: 10px 12px;
			font-size: 13px;
		}
		.drawer-body {
			padding: 14px;
		}
		.inline {
			flex-wrap: wrap;
		}
		.inline input {
			flex: 1;
			min-width: 120px;
		}
		.channels li {
			flex-wrap: wrap;
		}
		.channels .desc {
			flex-basis: 100%;
		}
		.actions {
			flex-direction: column;
		}
		.actions .btn {
			width: 100%;
		}
	}
</style>
