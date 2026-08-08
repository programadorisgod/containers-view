import { json } from '@sveltejs/kit';
import { engine } from '$lib/server/engine/engine';
import { watcher } from '$lib/server/runtime';

export async function GET() {
	const status = await engine.getStatus();
	return json({
		status,
		watcher: {
			enabled: watcher.state.enabled,
			intervalMs: watcher.state.intervalMs,
			alertCount: watcher.state.alertCount,
			lastAlertAt: watcher.state.lastAlertAt,
			targetCount: watcher.state.targets.length
		}
	});
}
