import type Docker from 'dockerode';
import { EngineConnection, isConnectionError } from './connection';
import type {
	ContainerAction,
	ContainerSummary,
	EngineStatus,
	ImageSummary,
	NetworkSummary,
	VolumeSummary
} from '../../types';

export type { ContainerAction };

function normalizeContainer(c: Docker.ContainerInfo): ContainerSummary {
	const names = (c.Names ?? []).map((n) => n.replace(/^\//, ''));
	return {
		id: c.Id,
		name: names[0] ?? c.Id.slice(0, 12),
		names,
		image: c.Image ?? '',
		imageId: c.ImageID ?? '',
		state: (c.State as ContainerSummary['state']) ?? 'unknown',
		running: c.State === 'running',
		status: c.Status ?? '',
		created: (c.Created ?? 0) * 1000,
		ports: (c.Ports ?? []).map((p) => ({
			hostIp: p.IP ?? '',
			hostPort: p.PublicPort != null ? String(p.PublicPort) : '',
			containerPort: p.PrivatePort != null ? String(p.PrivatePort) : '',
			type: p.Type ?? ''
		})),
		highlighted: false
	};
}

function normalizeImage(i: Docker.ImageInfo): ImageSummary {
	const tags = i.RepoTags?.filter(Boolean) ?? [];
	return {
		id: i.Id,
		repoTags: tags,
		repoDigests: i.RepoDigests ?? [],
		created: (i.Created ?? 0) * 1000,
		size: i.Size ?? 0,
		sharedSize: i.SharedSize ?? 0,
		containers: i.Containers ?? 0,
		labels: i.Labels ?? {},
		reference: tags[0] ?? i.RepoDigests?.[0]?.split('@')[0] ?? i.Id.slice(7, 19)
	};
}

function normalizeVolume(v: {
	Name?: string;
	Driver?: string;
	Mountpoint?: string;
	CreatedAt?: string;
	Scope?: string;
	Labels?: Record<string, string>;
}): VolumeSummary {
	return {
		name: v.Name ?? '',
		driver: v.Driver ?? '',
		mountpoint: v.Mountpoint ?? '',
		createdAt: v.CreatedAt ?? '',
		scope: v.Scope ?? 'local',
		labels: v.Labels ?? {},
		used: false
	};
}

function normalizeNetwork(n: Docker.NetworkInspectInfo): NetworkSummary {
	const subnet = n.IPAM?.Config?.[0]?.Subnet ?? undefined;
	const createdMs =
		typeof n.Created === 'number' ? n.Created * 1000 : new Date(n.Created ?? 0).getTime();
	return {
		id: n.Id ?? '',
		name: n.Name ?? '',
		driver: n.Driver ?? '',
		scope: n.Scope ?? 'local',
		internal: Boolean(n.Internal),
		attachable: Boolean(n.Attachable),
		created: Number.isNaN(createdMs) ? 0 : createdMs,
		containers: Object.keys(n.Containers ?? {}).length,
		subnet
	};
}

export class EngineService {
	private readonly connection = new EngineConnection();

	constructor(connection?: EngineConnection) {
		if (connection) this.connection = connection;
	}

	async getStatus(): Promise<EngineStatus> {
		try {
			const engine = await this.connection.connect();
			await engine.client.ping();
			return {
				running: true,
				engine: engine.type,
				version: engine.version,
				apiVersion: engine.apiVersion,
				socketPath: engine.socketPath,
				error: null,
				checkedAt: Date.now()
			};
		} catch (err) {
			this.connection.clear();
			return {
				running: false,
				engine: null,
				version: null,
				apiVersion: null,
				socketPath: null,
				error: (err as Error).message,
				checkedAt: Date.now()
			};
		}
	}

	private async withClient<T>(fn: (client: Docker) => Promise<T>): Promise<T> {
		try {
			const engine = await this.connection.connect();
			return await fn(engine.client);
		} catch (err) {
			if (isConnectionError(err)) {
				this.connection.clear();
				const engine = await this.connection.connect();
				return await fn(engine.client);
			}
			throw err;
		}
	}

	async listContainers(): Promise<ContainerSummary[]> {
		return this.withClient(async (client) => {
			const list = await client.listContainers({ all: true });
			return list.map(normalizeContainer);
		});
	}

	async listImages(): Promise<ImageSummary[]> {
		return this.withClient(async (client) => {
			const list = await client.listImages({ all: false });
			return list.map(normalizeImage);
		});
	}

	async listVolumes(): Promise<VolumeSummary[]> {
		return this.withClient(async (client) => {
			const data = await client.listVolumes();
			const used = new Set<string>();
			const containers = await client.listContainers({ all: true });
			for (const c of containers) {
				for (const m of c.Mounts ?? []) if (m.Name) used.add(m.Name);
			}
			return (data.Volumes ?? []).map((v) => ({
				...normalizeVolume(v),
				used: used.has(v.Name ?? '')
			}));
		});
	}

	async listNetworks(): Promise<NetworkSummary[]> {
		return this.withClient(async (client) => {
			const list = await client.listNetworks();
			return list.map(normalizeNetwork);
		});
	}

	async startContainer(id: string): Promise<void> {
		return this.withClient(async (client) => {
			await client.getContainer(id).start();
		});
	}

	async stopContainer(id: string): Promise<void> {
		return this.withClient(async (client) => {
			await client.getContainer(id).stop({ t: 10 });
		});
	}

	async restartContainer(id: string): Promise<void> {
		return this.withClient(async (client) => {
			await client.getContainer(id).restart({ t: 10 });
		});
	}

	async removeContainer(id: string): Promise<void> {
		return this.withClient(async (client) => {
			await client.getContainer(id).remove({ force: true, v: true });
		});
	}

	async removeImage(id: string): Promise<void> {
		return this.withClient(async (client) => {
			await client.getImage(id).remove({ force: true });
		});
	}

	async removeVolume(name: string): Promise<void> {
		return this.withClient(async (client) => {
			await client.getVolume(name).remove();
		});
	}

	async removeNetwork(id: string): Promise<void> {
		return this.withClient(async (client) => {
			await client.getNetwork(id).remove();
		});
	}
}

export const engine = new EngineService();
