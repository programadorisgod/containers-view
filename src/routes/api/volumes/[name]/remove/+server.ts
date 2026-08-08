import { engine } from '$lib/server/engine/engine';
import { apiOk, apiError, errorMessage } from '$lib/server/api-helpers';

export async function POST({ params }) {
	try {
		await engine.removeVolume(params.name);
		return apiOk(`Volumen "${params.name}" eliminado.`);
	} catch (err) {
		return apiError(500, `No se pudo eliminar el volumen "${params.name}": ${errorMessage(err)}`);
	}
}
