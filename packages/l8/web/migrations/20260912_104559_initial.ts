import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`owners_sessions\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`created_at\` text,
    \`expires_at\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`owners\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`owners_sessions_order_idx\` ON \`owners_sessions\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`owners_sessions_parent_id_idx\` ON \`owners_sessions\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`owners\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`email\` text NOT NULL,
    \`reset_password_token\` text,
    \`reset_password_expiration\` text,
    \`salt\` text,
    \`hash\` text,
    \`login_attempts\` numeric DEFAULT 0,
    \`lock_until\` text
  );
  `)
  await db.run(
    sql`CREATE INDEX \`owners_updated_at_idx\` ON \`owners\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`owners_created_at_idx\` ON \`owners\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE UNIQUE INDEX \`owners_email_idx\` ON \`owners\` (\`email\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`slug\` text NOT NULL,
    \`source_id\` text NOT NULL,
    \`source_hash\` text NOT NULL,
    \`git_revision\` text,
    \`status\` text DEFAULT 'draft' NOT NULL,
    \`content\` text NOT NULL,
    \`seo\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX \`recipes_slug_idx\` ON \`recipes\` (\`slug\`);`,
  )
  await db.run(
    sql`CREATE UNIQUE INDEX \`recipes_source_id_idx\` ON \`recipes\` (\`source_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_updated_at_idx\` ON \`recipes\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_created_at_idx\` ON \`recipes\` (\`created_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`parent_id\` integer,
    \`version_title\` text NOT NULL,
    \`version_slug\` text NOT NULL,
    \`version_source_id\` text NOT NULL,
    \`version_source_hash\` text NOT NULL,
    \`version_git_revision\` text,
    \`version_status\` text DEFAULT 'draft' NOT NULL,
    \`version_content\` text NOT NULL,
    \`version_seo\` text,
    \`version_updated_at\` text,
    \`version_created_at\` text,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_parent_idx\` ON \`_recipes_v\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_version_version_slug_idx\` ON \`_recipes_v\` (\`version_slug\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_version_version_source_id_idx\` ON \`_recipes_v\` (\`version_source_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_version_version_updated_at_idx\` ON \`_recipes_v\` (\`version_updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_version_version_created_at_idx\` ON \`_recipes_v\` (\`version_created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_created_at_idx\` ON \`_recipes_v\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_updated_at_idx\` ON \`_recipes_v\` (\`updated_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`slug\` text NOT NULL,
    \`source_id\` text NOT NULL,
    \`source_hash\` text NOT NULL,
    \`git_revision\` text,
    \`status\` text DEFAULT 'draft' NOT NULL,
    \`content\` text NOT NULL,
    \`seo\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX \`articles_slug_idx\` ON \`articles\` (\`slug\`);`,
  )
  await db.run(
    sql`CREATE UNIQUE INDEX \`articles_source_id_idx\` ON \`articles\` (\`source_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_updated_at_idx\` ON \`articles\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_created_at_idx\` ON \`articles\` (\`created_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`parent_id\` integer,
    \`version_title\` text NOT NULL,
    \`version_slug\` text NOT NULL,
    \`version_source_id\` text NOT NULL,
    \`version_source_hash\` text NOT NULL,
    \`version_git_revision\` text,
    \`version_status\` text DEFAULT 'draft' NOT NULL,
    \`version_content\` text NOT NULL,
    \`version_seo\` text,
    \`version_updated_at\` text,
    \`version_created_at\` text,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_parent_idx\` ON \`_articles_v\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_slug_idx\` ON \`_articles_v\` (\`version_slug\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_source_id_idx\` ON \`_articles_v\` (\`version_source_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_updated_at_idx\` ON \`_articles_v\` (\`version_updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_created_at_idx\` ON \`_articles_v\` (\`version_created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_created_at_idx\` ON \`_articles_v\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_updated_at_idx\` ON \`_articles_v\` (\`updated_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`categories\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text NOT NULL,
    \`slug\` text NOT NULL,
    \`source_id\` text NOT NULL,
    \`source_hash\` text NOT NULL,
    \`git_revision\` text,
    \`status\` text DEFAULT 'draft' NOT NULL,
    \`content\` text NOT NULL,
    \`seo\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX \`categories_slug_idx\` ON \`categories\` (\`slug\`);`,
  )
  await db.run(
    sql`CREATE UNIQUE INDEX \`categories_source_id_idx\` ON \`categories\` (\`source_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`categories_updated_at_idx\` ON \`categories\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`categories_created_at_idx\` ON \`categories\` (\`created_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`_categories_v\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`parent_id\` integer,
    \`version_title\` text NOT NULL,
    \`version_slug\` text NOT NULL,
    \`version_source_id\` text NOT NULL,
    \`version_source_hash\` text NOT NULL,
    \`version_git_revision\` text,
    \`version_status\` text DEFAULT 'draft' NOT NULL,
    \`version_content\` text NOT NULL,
    \`version_seo\` text,
    \`version_updated_at\` text,
    \`version_created_at\` text,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_categories_v_parent_idx\` ON \`_categories_v\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_version_version_slug_idx\` ON \`_categories_v\` (\`version_slug\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_version_version_source_id_idx\` ON \`_categories_v\` (\`version_source_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_version_version_updated_at_idx\` ON \`_categories_v\` (\`version_updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_version_version_created_at_idx\` ON \`_categories_v\` (\`version_created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_created_at_idx\` ON \`_categories_v\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_updated_at_idx\` ON \`_categories_v\` (\`updated_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`media\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`source_id\` text NOT NULL,
    \`public\` integer DEFAULT false,
    \`alt\` text,
    \`manifest\` text NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`url\` text,
    \`thumbnail_u_r_l\` text,
    \`filename\` text,
    \`mime_type\` text,
    \`filesize\` numeric,
    \`width\` numeric,
    \`height\` numeric,
    \`focal_x\` numeric,
    \`focal_y\` numeric
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX \`media_source_id_idx\` ON \`media\` (\`source_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`,
  )
  await db.run(sql`CREATE TABLE \`payload_kv\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text NOT NULL,
    \`data\` text NOT NULL
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`,
  )
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`global_slug\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`owners_id\` integer,
    \`recipes_id\` integer,
    \`articles_id\` integer,
    \`categories_id\` integer,
    \`media_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`owners_id\`) REFERENCES \`owners\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`recipes_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_owners_id_idx\` ON \`payload_locked_documents_rels\` (\`owners_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_recipes_id_idx\` ON \`payload_locked_documents_rels\` (\`recipes_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`order\` integer,
    \`parent_id\` integer NOT NULL,
    \`path\` text NOT NULL,
    \`owners_id\` integer,
    FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`owners_id\`) REFERENCES \`owners\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_owners_id_idx\` ON \`payload_preferences_rels\` (\`owners_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text,
    \`batch\` numeric,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`,
  )
  await db.run(sql`CREATE TABLE \`site\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`source_hash\` text,
    \`git_revision\` text,
    \`content\` text NOT NULL,
    \`updated_at\` text,
    \`created_at\` text
  );
  `)
  await db.run(sql`CREATE TABLE \`_site_v\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`version_source_hash\` text,
    \`version_git_revision\` text,
    \`version_content\` text NOT NULL,
    \`version_updated_at\` text,
    \`version_created_at\` text,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_site_v_created_at_idx\` ON \`_site_v\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_site_v_updated_at_idx\` ON \`_site_v\` (\`updated_at\`);`,
  )
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`owners_sessions\`;`)
  await db.run(sql`DROP TABLE \`owners\`;`)
  await db.run(sql`DROP TABLE \`recipes\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v\`;`)
  await db.run(sql`DROP TABLE \`articles\`;`)
  await db.run(sql`DROP TABLE \`_articles_v\`;`)
  await db.run(sql`DROP TABLE \`categories\`;`)
  await db.run(sql`DROP TABLE \`_categories_v\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`site\`;`)
  await db.run(sql`DROP TABLE \`_site_v\`;`)
}
