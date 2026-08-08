import Docker from 'dockerode';
import * as http from 'node:http';
import * as fs from 'node:fs';
import path from 'node:path';
import type { EngineType } from '../../types';

export interface PingHeaders {
	server: string;
	apiVersion: string;
}

export interface ConnectedEngine {
	client: Docker;
	type: EngineType;
	socketPath: string | null;
	version: string;
	apiVersion: string;
}

function getUid(): number {
	try {
		return typeof process.getuid === 'function' ? process.getuid() : 1000;
	} catch {
		return 1000;
	}
}

function candidateSocketPaths(): string[] {
	const runtime = process.env.XDG_RUNTIME_DIR || `/run/user/${getUid()}`;
	const candidates = [
		process.env.CONTAINERS_SOCKET,
		process.env.DOCKER_SOCKET,
		'/var/run/docker.sock',
		path.join(runtime, 'podman', 'podman.sock'),
		path.join(runtime, 'docker.sock')
	];
	return [...new Set(candidates.filter((c): c is string => Boolean(c)))];
}

export function envTransport(): {
	socketPath?: string;
	host?: string;
	port?: number;
	protocol?: string;
} | null {
	const dockerHost = process.env.DOCKER_HOST;
	if (dockerHost?.startsWith('tcp://')) {
		const url = new URL(dockerHost);
		return {
			host: url.hostname,
			port: Number(url.port || 2375),
			protocol: url.protocol.replace(':', '') || 'http'
		};
	}
	if (dockerHost?.startsWith('unix://')) {
		return { socketPath: dockerHost.replace('unix://', '') };
	}
	return null;
}

function readPingHeaders(socketPath: string): Promise<PingHeaders> {
	return new Promise((resolve, reject) => {
		const req = http.request({ socketPath, path: '/_ping', method: 'GET' }, (res) => {
			res.resume();
			resolve({
				server: String(res.headers['server'] || ''),
				apiVersion: String(res.headers['api-version'] || '')
			});
		});
		req.setTimeout(3000, () => req.destroy(new Error('ping timeout') as Error));
		req.on('error', reject);
		req.end();
	});
}

export function detectEngineType(serverHeader: string): EngineType {
	return /libpod|podman/i.test(serverHeader) ? 'podman' : 'docker';
}

export function isConnectionError(err: unknown): boolean {
	const message = (err as Error).message || String(err);
	return /(socket|ECONNREFUSED|ECONNRESET|ENOENT|EPIPE|EHOSTUNREACH|bad gateway|502|404)/i.test(
		message
	);
}

async function resolveEngine(): Promise<ConnectedEngine> {
	const tcp = envTransport();
	if (tcp) {
		const client = new Docker(tcp as never);
		await client.ping();
		const version = await client.version();
		return {
			client,
			type: detectEngineType(version.Platform?.Name ?? ''),
			socketPath: null,
			version: version.Version,
			apiVersion: version.ApiVersion
		};
	}

	const errors: string[] = [];
	for (const socketPath of candidateSocketPaths()) {
		if (!fs.existsSync(socketPath)) continue;
		try {
			const headers = await readPingHeaders(socketPath);
			const client = new Docker({ socketPath });
			await client.ping();
			const version = await client.version();
			return {
				client,
				type: detectEngineType(headers.server),
				socketPath,
				version: version.Version,
				apiVersion: version.ApiVersion
			};
		} catch (err) {
			errors.push(`${socketPath}: ${(err as Error).message}`);
		}
	}
	throw new Error(
		`No container engine reachable. Tried: ${errors.length ? errors.join('; ') : 'no candidate sockets found'}. ` +
			'Start Podman/Docker, or set CONTAINERS_SOCKET / DOCKER_HOST.'
	);
}

export class EngineConnection {
	private connected: ConnectedEngine | null = null;

	async connect(): Promise<ConnectedEngine> {
		if (this.connected) return this.connected;
		const engine = await resolveEngine();
		this.connected = engine;
		return engine;
	}

	clear(): void {
		this.connected = null;
	}
}
