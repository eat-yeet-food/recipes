import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

// Additive only: new member/review tables and nullable lock/preference columns.
// The previous Worker ignores them; retired rating tables remain untouched.
export const onlineCompatible = true

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`members\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`display_name\` text NOT NULL,
  	\`display_name_confirmed\` integer DEFAULT false,
  	\`google_subject\` text,
  	\`has_password\` integer DEFAULT false,
  	\`email_window_start\` text,
  	\`email_count\` numeric DEFAULT 0,
  	\`email_sent_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`_verified\` integer,
  	\`_verificationtoken\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`members_google_subject_idx\` ON \`members\` (\`google_subject\`);`)
  await db.run(sql`CREATE INDEX \`members_updated_at_idx\` ON \`members\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`members_created_at_idx\` ON \`members\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`members_email_idx\` ON \`members\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`member_sessions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`token_hash\` text NOT NULL,
  	\`member_id\` integer NOT NULL,
  	\`expires_at\` text NOT NULL,
  	\`revoked_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`member_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`member_sessions_token_hash_idx\` ON \`member_sessions\` (\`token_hash\`);`)
  await db.run(sql`CREATE INDEX \`member_sessions_member_idx\` ON \`member_sessions\` (\`member_id\`);`)
  await db.run(sql`CREATE INDEX \`member_sessions_updated_at_idx\` ON \`member_sessions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`member_sessions_created_at_idx\` ON \`member_sessions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`member_workbenches\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`workbench_key\` text NOT NULL,
  	\`member_id\` integer NOT NULL,
  	\`scope\` text NOT NULL,
  	\`store\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`member_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`member_workbenches_workbench_key_idx\` ON \`member_workbenches\` (\`workbench_key\`);`)
  await db.run(sql`CREATE INDEX \`member_workbenches_member_idx\` ON \`member_workbenches\` (\`member_id\`);`)
  await db.run(sql`CREATE INDEX \`member_workbenches_updated_at_idx\` ON \`member_workbenches\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`member_workbenches_created_at_idx\` ON \`member_workbenches\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`recipe_reviews\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`review_key\` text NOT NULL,
  	\`recipe_id\` integer NOT NULL,
  	\`member_id\` integer NOT NULL,
  	\`score\` numeric NOT NULL,
  	\`review_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`recipe_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`member_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`recipe_reviews_review_key_idx\` ON \`recipe_reviews\` (\`review_key\`);`)
  await db.run(sql`CREATE INDEX \`recipe_reviews_recipe_idx\` ON \`recipe_reviews\` (\`recipe_id\`);`)
  await db.run(sql`CREATE INDEX \`recipe_reviews_member_idx\` ON \`recipe_reviews\` (\`member_id\`);`)
  await db.run(sql`CREATE INDEX \`recipe_reviews_updated_at_idx\` ON \`recipe_reviews\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`recipe_reviews_created_at_idx\` ON \`recipe_reviews\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`recipe_review_replies\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`recipe_id\` integer NOT NULL,
  	\`review_id\` integer NOT NULL,
  	\`member_id\` integer NOT NULL,
  	\`body\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`recipe_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`review_id\`) REFERENCES \`recipe_reviews\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`member_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`recipe_review_replies_recipe_idx\` ON \`recipe_review_replies\` (\`recipe_id\`);`)
  await db.run(sql`CREATE INDEX \`recipe_review_replies_review_idx\` ON \`recipe_review_replies\` (\`review_id\`);`)
  await db.run(sql`CREATE INDEX \`recipe_review_replies_member_idx\` ON \`recipe_review_replies\` (\`member_id\`);`)
  await db.run(sql`CREATE INDEX \`recipe_review_replies_updated_at_idx\` ON \`recipe_review_replies\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`recipe_review_replies_created_at_idx\` ON \`recipe_review_replies\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`members_id\` integer REFERENCES members(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`member_sessions_id\` integer REFERENCES member_sessions(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`member_workbenches_id\` integer REFERENCES member_workbenches(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`recipe_reviews_id\` integer REFERENCES recipe_reviews(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`recipe_review_replies_id\` integer REFERENCES recipe_review_replies(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_members_id_idx\` ON \`payload_locked_documents_rels\` (\`members_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_member_sessions_id_idx\` ON \`payload_locked_documents_rels\` (\`member_sessions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_member_workbenches_id_idx\` ON \`payload_locked_documents_rels\` (\`member_workbenches_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_reviews_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_reviews_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_review_replies_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_review_replies_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_preferences_rels\` ADD \`members_id\` integer REFERENCES members(id);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_members_id_idx\` ON \`payload_preferences_rels\` (\`members_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`members\`;`)
  await db.run(sql`DROP TABLE \`member_sessions\`;`)
  await db.run(sql`DROP TABLE \`member_workbenches\`;`)
  await db.run(sql`DROP TABLE \`recipe_reviews\`;`)
  await db.run(sql`DROP TABLE \`recipe_review_replies\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`owners_id\` integer,
  	\`recipes_id\` integer,
  	\`recipe_ratings_id\` integer,
  	\`recipe_rating_replies_id\` integer,
  	\`articles_id\` integer,
  	\`categories_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`owners_id\`) REFERENCES \`owners\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipes_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_ratings_id\`) REFERENCES \`recipe_ratings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_rating_replies_id\`) REFERENCES \`recipe_rating_replies\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "owners_id", "recipes_id", "recipe_ratings_id", "recipe_rating_replies_id", "articles_id", "categories_id", "media_id") SELECT "id", "order", "parent_id", "path", "owners_id", "recipes_id", "recipe_ratings_id", "recipe_rating_replies_id", "articles_id", "categories_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_owners_id_idx\` ON \`payload_locked_documents_rels\` (\`owners_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipes_id_idx\` ON \`payload_locked_documents_rels\` (\`recipes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_ratings_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_ratings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_rating_replies_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_rating_replies_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`owners_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`owners_id\`) REFERENCES \`owners\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_preferences_rels\`("id", "order", "parent_id", "path", "owners_id") SELECT "id", "order", "parent_id", "path", "owners_id" FROM \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_preferences_rels\` RENAME TO \`payload_preferences_rels\`;`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_owners_id_idx\` ON \`payload_preferences_rels\` (\`owners_id\`);`)
}
