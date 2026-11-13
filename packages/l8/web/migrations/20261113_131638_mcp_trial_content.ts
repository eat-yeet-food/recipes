import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

// Additive: new trial-content and MCP OAuth tables plus nullable lock columns; older Workers ignore them.
export const onlineCompatible = true

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`trial_recipes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`slug\` text NOT NULL,
  	\`title\` text NOT NULL,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`revision\` numeric DEFAULT 1 NOT NULL,
  	\`source\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`trial_recipes_slug_idx\` ON \`trial_recipes\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`trial_recipes_status_idx\` ON \`trial_recipes\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`trial_recipes_updated_at_idx\` ON \`trial_recipes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`trial_recipes_created_at_idx\` ON \`trial_recipes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`trial_media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`source_id\` text NOT NULL,
  	\`public\` integer DEFAULT true,
  	\`alt\` text,
  	\`manifest\` text NOT NULL,
  	\`import_key\` text,
  	\`credit\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`trial_media_source_id_idx\` ON \`trial_media\` (\`source_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`trial_media_import_key_idx\` ON \`trial_media\` (\`import_key\`);`)
  await db.run(sql`CREATE INDEX \`trial_media_updated_at_idx\` ON \`trial_media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`trial_media_created_at_idx\` ON \`trial_media\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`mcp_clients\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`client_id\` text NOT NULL,
  	\`name\` text,
  	\`redirect_uris\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`mcp_clients_client_id_idx\` ON \`mcp_clients\` (\`client_id\`);`)
  await db.run(sql`CREATE INDEX \`mcp_clients_updated_at_idx\` ON \`mcp_clients\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`mcp_clients_created_at_idx\` ON \`mcp_clients\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`mcp_codes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`code_hash\` text NOT NULL,
  	\`client_id\` text NOT NULL,
  	\`redirect_uri\` text NOT NULL,
  	\`challenge\` text NOT NULL,
  	\`member_id\` integer NOT NULL,
  	\`expires_at\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`member_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`mcp_codes_code_hash_idx\` ON \`mcp_codes\` (\`code_hash\`);`)
  await db.run(sql`CREATE INDEX \`mcp_codes_member_idx\` ON \`mcp_codes\` (\`member_id\`);`)
  await db.run(sql`CREATE INDEX \`mcp_codes_updated_at_idx\` ON \`mcp_codes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`mcp_codes_created_at_idx\` ON \`mcp_codes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`mcp_tokens\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`access_hash\` text NOT NULL,
  	\`refresh_hash\` text NOT NULL,
  	\`client_id\` text NOT NULL,
  	\`member_id\` integer NOT NULL,
  	\`access_expires_at\` text NOT NULL,
  	\`refresh_expires_at\` text NOT NULL,
  	\`revoked_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`member_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`mcp_tokens_access_hash_idx\` ON \`mcp_tokens\` (\`access_hash\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`mcp_tokens_refresh_hash_idx\` ON \`mcp_tokens\` (\`refresh_hash\`);`)
  await db.run(sql`CREATE INDEX \`mcp_tokens_client_id_idx\` ON \`mcp_tokens\` (\`client_id\`);`)
  await db.run(sql`CREATE INDEX \`mcp_tokens_member_idx\` ON \`mcp_tokens\` (\`member_id\`);`)
  await db.run(sql`CREATE INDEX \`mcp_tokens_updated_at_idx\` ON \`mcp_tokens\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`mcp_tokens_created_at_idx\` ON \`mcp_tokens\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`trial_recipes_id\` integer REFERENCES trial_recipes(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`trial_media_id\` integer REFERENCES trial_media(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`mcp_clients_id\` integer REFERENCES mcp_clients(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`mcp_codes_id\` integer REFERENCES mcp_codes(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`mcp_tokens_id\` integer REFERENCES mcp_tokens(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_trial_recipes_id_idx\` ON \`payload_locked_documents_rels\` (\`trial_recipes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_trial_media_id_idx\` ON \`payload_locked_documents_rels\` (\`trial_media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_mcp_clients_id_idx\` ON \`payload_locked_documents_rels\` (\`mcp_clients_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_mcp_codes_id_idx\` ON \`payload_locked_documents_rels\` (\`mcp_codes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_mcp_tokens_id_idx\` ON \`payload_locked_documents_rels\` (\`mcp_tokens_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`trial_recipes\`;`)
  await db.run(sql`DROP TABLE \`trial_media\`;`)
  await db.run(sql`DROP TABLE \`mcp_clients\`;`)
  await db.run(sql`DROP TABLE \`mcp_codes\`;`)
  await db.run(sql`DROP TABLE \`mcp_tokens\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`owners_id\` integer,
  	\`recipes_id\` integer,
  	\`members_id\` integer,
  	\`member_sessions_id\` integer,
  	\`member_native_grants_id\` integer,
  	\`member_workbenches_id\` integer,
  	\`kitchen_formulas_id\` integer,
  	\`kitchen_revisions_id\` integer,
  	\`recipe_ratings_id\` integer,
  	\`recipe_rating_replies_id\` integer,
  	\`recipe_reviews_id\` integer,
  	\`recipe_review_replies_id\` integer,
  	\`articles_id\` integer,
  	\`categories_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`owners_id\`) REFERENCES \`owners\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipes_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`members_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`member_sessions_id\`) REFERENCES \`member_sessions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`member_native_grants_id\`) REFERENCES \`member_native_grants\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`member_workbenches_id\`) REFERENCES \`member_workbenches\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`kitchen_formulas_id\`) REFERENCES \`kitchen_formulas\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`kitchen_revisions_id\`) REFERENCES \`kitchen_revisions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_ratings_id\`) REFERENCES \`recipe_ratings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_rating_replies_id\`) REFERENCES \`recipe_rating_replies\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_reviews_id\`) REFERENCES \`recipe_reviews\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_review_replies_id\`) REFERENCES \`recipe_review_replies\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "owners_id", "recipes_id", "members_id", "member_sessions_id", "member_native_grants_id", "member_workbenches_id", "kitchen_formulas_id", "kitchen_revisions_id", "recipe_ratings_id", "recipe_rating_replies_id", "recipe_reviews_id", "recipe_review_replies_id", "articles_id", "categories_id", "media_id") SELECT "id", "order", "parent_id", "path", "owners_id", "recipes_id", "members_id", "member_sessions_id", "member_native_grants_id", "member_workbenches_id", "kitchen_formulas_id", "kitchen_revisions_id", "recipe_ratings_id", "recipe_rating_replies_id", "recipe_reviews_id", "recipe_review_replies_id", "articles_id", "categories_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_owners_id_idx\` ON \`payload_locked_documents_rels\` (\`owners_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipes_id_idx\` ON \`payload_locked_documents_rels\` (\`recipes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_members_id_idx\` ON \`payload_locked_documents_rels\` (\`members_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_member_sessions_id_idx\` ON \`payload_locked_documents_rels\` (\`member_sessions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_member_native_grants_id_idx\` ON \`payload_locked_documents_rels\` (\`member_native_grants_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_member_workbenches_id_idx\` ON \`payload_locked_documents_rels\` (\`member_workbenches_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_kitchen_formulas_id_idx\` ON \`payload_locked_documents_rels\` (\`kitchen_formulas_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_kitchen_revisions_id_idx\` ON \`payload_locked_documents_rels\` (\`kitchen_revisions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_ratings_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_ratings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_rating_replies_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_rating_replies_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_reviews_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_reviews_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_review_replies_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_review_replies_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
}
