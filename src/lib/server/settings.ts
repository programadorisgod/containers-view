import { JsonStore } from './store';
import { ProviderFactory } from './notifications/provider-factory';
import { buildProviderConfig } from './notifications/config';
import type { NotificationChannelType } from '../types';
import type { AppSettings } from '../types';
import type { ProviderConfig } from './notifications/types';

export interface SettingsData {
	to: string;
	from: string;
	multiTo: boolean;
	enabledChannels: NotificationChannelType[];
}

const defaults = (): SettingsData => ({
	to: process.env.NOTIFY_TO || '',
	from: process.env.NOTIFY_FROM || '',
	multiTo: process.env.NOTIFY_MULTI_TO === 'true',
	enabledChannels: ['email', 'console']
});

export class SettingsService {
	private readonly store = new JsonStore<SettingsData>('settings.json', defaults());

	get(): SettingsData {
		return this.store.get();
	}

	update(partial: Partial<SettingsData>): SettingsData {
		return this.store.update((draft) => {
			if (partial.to !== undefined) draft.to = partial.to;
			if (partial.from !== undefined) draft.from = partial.from;
			if (partial.multiTo !== undefined) draft.multiTo = partial.multiTo;
			if (partial.enabledChannels !== undefined) draft.enabledChannels = partial.enabledChannels;
		});
	}

	providerConfig(): ProviderConfig {
		return buildProviderConfig(this.store.get());
	}

	appSettings(): AppSettings {
		const data = this.store.get();
		const config = this.providerConfig();
		const channels = ProviderFactory.availableChannels().map((type) => {
			const provider = ProviderFactory.create(type, config);
			return {
				type,
				label: provider.label,
				description: provider.description,
				configured: provider.isConfigured() && data.enabledChannels.includes(type)
			};
		});
		return {
			to: data.to || process.env.NOTIFY_TO || '',
			from: data.from || process.env.NOTIFY_FROM || '',
			multiTo: data.multiTo ?? process.env.NOTIFY_MULTI_TO === 'true',
			channels
		};
	}
}

export const settingsService = new SettingsService();
