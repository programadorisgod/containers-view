import { json } from '@sveltejs/kit';
import { engine } from '$lib/server/engine/engine';
import { errorMessage } from '$lib/server/api-helpers';

export async function GET() {
	try {
		const images = await engine.listImages();
		return json(images);
	} catch (err) {
		return json({ error: errorMessage(err) }, { status: 502 });
	}
}
