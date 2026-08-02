import { env } from 'cloudflare:workers';
import { createExecutionContext } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

const RAW_EMAIL = [
	'From: Alice Example <alice@sender.test>',
	'To: Inbox <permanent@example.com>',
	'Subject: Integration test',
	'Message-ID: <integration-test@sender.test>',
	'Date: Sat, 2 Aug 2026 06:00:00 +0000',
	'MIME-Version: 1.0',
	'Content-Type: text/plain; charset=utf-8',
	'',
	'Your verification code is 123456.',
].join('\r\n');

function createEmailMessage(raw = RAW_EMAIL) {
	const setReject = vi.fn();
	const message = {
		from: 'alice@sender.test',
		to: 'permanent@example.com',
		raw: new Response(raw).body!,
		rawSize: new TextEncoder().encode(raw).byteLength,
		headers: new Headers(),
		setReject,
		forward: vi.fn(),
		reply: vi.fn(),
	} as unknown as ForwardableEmailMessage;

	return { message, setReject };
}

describe('email worker', () => {
	beforeEach(async () => {
		await env.DB.exec('DELETE FROM emails');
	});

	it('parses a MIME message and stores it in D1', async () => {
		const { message, setReject } = createEmailMessage();

		await worker.email(message, env, createExecutionContext());

		const stored = await env.DB.prepare('SELECT message_from, message_to, subject, message_id, text, is_read FROM emails').first<
			Record<string, unknown>
		>();
		expect(stored).toMatchObject({
			message_from: 'alice@sender.test',
			message_to: 'permanent@example.com',
			subject: 'Integration test',
			message_id: '<integration-test@sender.test>',
			is_read: 0,
		});
		expect(String(stored?.text).trim()).toBe('Your verification code is 123456.');
		expect(setReject).not.toHaveBeenCalled();
	});

	it('rejects oversized messages without writing a row', async () => {
		const { message, setReject } = createEmailMessage();
		Object.defineProperty(message, 'rawSize', { value: 1_500_001 });

		await worker.email(message, env, createExecutionContext());

		const stored = await env.DB.prepare('SELECT count(*) AS count FROM emails').first<{
			count: number;
		}>();
		expect(stored?.count).toBe(0);
		expect(setReject).toHaveBeenCalledOnce();
	});

	it('propagates database failures so Cloudflare can retry delivery', async () => {
		await env.DB.exec('DROP TABLE emails');
		const { message } = createEmailMessage();

		await expect(worker.email(message, env, createExecutionContext())).rejects.toThrow();
	});
});
