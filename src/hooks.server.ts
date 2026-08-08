import type { Handle } from '@sveltejs/kit';
import { watcher } from '$lib/server/runtime';

export const handle: Handle = ({ event, resolve }) => {
	watcher.ensureRunning();
	return resolve(event);
};
