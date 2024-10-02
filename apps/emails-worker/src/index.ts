/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import PostalMime from "postal-mime";

import { InsertEmail, insertEmailSchema } from "database/schema"
import { insertEmail } from "database/dao"
import { getCloudflareD1 } from "database/db"
import { nanoid } from "nanoid";

export default {
	async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		try {
			const messageFrom = message.from;
			const messageTo = message.to;
			const rawText = await new Response(message.raw).text();
			const mail = await new PostalMime().parse(rawText);
			const now = new Date();
			const db = getCloudflareD1(env.DB);
			//@ts-expect-error mail.address.from 可能解析不出来，无伤大雅，跳过
			const newEmail: InsertEmail = {
				id: nanoid(),
				messageFrom,
				messageTo,
				...mail,
				createdAt: now,
				updatedAt: now,
			};
			const email = insertEmailSchema.parse(newEmail);
			await insertEmail(db, email);
		} catch (e) {
			console.log(e);
		}
	},
} satisfies ExportedHandler<Env>;
