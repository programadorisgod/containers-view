<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Toasts from '$lib/components/Toasts.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>ContainerView — Visor de Podman / Docker</title>
	<meta
		name="description"
		content="Visor web para contenedores, imágenes, volúmenes y redes de Podman o Docker."
	/>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<Toasts />
<ConfirmDialog />
