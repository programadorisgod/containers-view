import type { SettingsData } from '../settings';
import type { NotificationChannelType } from '../../types';
import type { ProviderConfig } from './types';

export function buildProviderConfig(settings: SettingsData): ProviderConfig {
	const multiTo = settings.multiTo ?? process.env.NOTIFY_MULTI_TO === 'true';
	return {
		to: settings.to || process.env.NOTIFY_TO || '',
		from: settings.from || process.env.NOTIFY_FROM || '',
		multiTo,
		smtp: {
			host: process.env.SMTP_HOST || '',
			port: Number(process.env.SMTP_PORT || 587),
			secure: process.env.SMTP_SECURE === 'true',
			user: process.env.SMTP_USER || '',
			pass: process.env.SMTP_PASS || '',
			from: settings.from || process.env.NOTIFY_FROM || '',
			to: settings.to || process.env.NOTIFY_TO || '',
			multiTo
		},
		telegram: {
			botToken: process.env.TELEGRAM_BOT_TOKEN || '',
			chatId: process.env.TELEGRAM_CHAT_ID || ''
		}
	};
}

export const channelLabels: Record<NotificationChannelType, string> = {
	email: 'Email (SMTP)',
	console: 'Consola',
	telegram: 'Telegram',
	whatsapp: 'WhatsApp'
};
