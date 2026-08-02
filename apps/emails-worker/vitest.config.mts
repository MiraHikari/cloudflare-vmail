import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig, defineProject } from 'vitest/config';

export default defineConfig(async () => {
	const migrationsPath = fileURLToPath(new URL('../../packages/database/drizzle/', import.meta.url));
	const migrations = await readD1Migrations(migrationsPath);

	return defineProject({
		plugins: [
			cloudflareTest({
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
			}),
		],
		test: {
			include: ['test/**/*.spec.ts'],
			setupFiles: ['./test/apply-migrations.ts'],
		},
	});
});
