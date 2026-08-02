import type { Address, InsertEmail } from 'database/schema';
import PostalMime from 'postal-mime';
import { insertEmail } from 'database/dao';
import { getCloudflareD1 } from 'database/db';
import { insertEmailSchema } from 'database/schema';
import { nanoid } from 'nanoid';

const DEFAULT_MAX_EMAIL_BYTES = 1_500_000;

type ParsedAddress = {
	address?: string;
	name?: string;
};

function normalizeAddress(address: ParsedAddress | undefined, fallback = ''): Address {
	return {
		address: address?.address?.trim().toLowerCase() || fallback.trim().toLowerCase(),
		name: address?.name?.trim() || '',
	};
}

function normalizeAddresses(addresses: ParsedAddress[] | undefined): Address[] | undefined {
	return addresses?.map((address) => normalizeAddress(address));
}

function getMaxEmailBytes(env: Env): number {
	const configured = Number(env.MAX_EMAIL_BYTES);
	return Number.isSafeInteger(configured) && configured > 0 ? configured : DEFAULT_MAX_EMAIL_BYTES;
}

export default {
	async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
		if (message.rawSize > getMaxEmailBytes(env)) {
			message.setReject('Message exceeds this mailbox service size limit');
			return;
		}

		const raw = await new Response(message.raw).arrayBuffer();
		const parsed = await new PostalMime().parse(raw);
		const now = new Date();
		const email: InsertEmail = {
			id: nanoid(),
			messageFrom: message.from.trim().toLowerCase(),
			messageTo: message.to.trim().toLowerCase(),
			headers: parsed.headers,
			from: normalizeAddress(parsed.from, message.from),
			sender: parsed.sender ? normalizeAddress(parsed.sender) : undefined,
			replyTo: normalizeAddresses(parsed.replyTo),
			deliveredTo: parsed.deliveredTo,
			returnPath: parsed.returnPath,
			to: normalizeAddresses(parsed.to),
			cc: normalizeAddresses(parsed.cc),
			bcc: normalizeAddresses(parsed.bcc),
			subject: parsed.subject,
			messageId: parsed.messageId || crypto.randomUUID(),
			inReplyTo: parsed.inReplyTo,
			references: parsed.references,
			date: parsed.date,
			html: parsed.html,
			text: parsed.text,
			createdAt: now,
			updatedAt: now,
			isRead: false,
			readAt: null,
			priority: 'normal',
		};

		await insertEmail(getCloudflareD1(env.DB), insertEmailSchema.parse(email));
	},
} satisfies ExportedHandler<Env>;
