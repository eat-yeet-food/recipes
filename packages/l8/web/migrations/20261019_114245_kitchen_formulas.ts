import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

// Additive only: Test Kitchen formula/revision tables and nullable lock columns.
// The previous Worker never reads them; member_workbenches stays in place.
export const onlineCompatible = true

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`kitchen_formulas\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`formula_id\` text NOT NULL,
  	\`member_id\` integer NOT NULL,
  	\`recipe_slug\` text NOT NULL,
  	\`family\` text NOT NULL,
  	\`name\` text NOT NULL,
  	\`name_key\` text NOT NULL,
  	\`state\` text NOT NULL,
  	\`notes\` text,
  	\`revision\` numeric DEFAULT 1 NOT NULL,
  	\`deleted_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`member_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`kitchen_formulas_formula_id_idx\` ON \`kitchen_formulas\` (\`formula_id\`);`)
  await db.run(sql`CREATE INDEX \`kitchen_formulas_member_idx\` ON \`kitchen_formulas\` (\`member_id\`);`)
  await db.run(sql`CREATE INDEX \`kitchen_formulas_recipe_slug_idx\` ON \`kitchen_formulas\` (\`recipe_slug\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`kitchen_formulas_name_key_idx\` ON \`kitchen_formulas\` (\`name_key\`);`)
  await db.run(sql`CREATE INDEX \`kitchen_formulas_updated_at_idx\` ON \`kitchen_formulas\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`kitchen_formulas_created_at_idx\` ON \`kitchen_formulas\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`kitchen_revisions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`formula_id\` integer NOT NULL,
  	\`member_id\` integer NOT NULL,
  	\`name\` text NOT NULL,
  	\`state\` text NOT NULL,
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`formula_id\`) REFERENCES \`kitchen_formulas\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`member_id\`) REFERENCES \`members\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`kitchen_revisions_formula_idx\` ON \`kitchen_revisions\` (\`formula_id\`);`)
  await db.run(sql`CREATE INDEX \`kitchen_revisions_member_idx\` ON \`kitchen_revisions\` (\`member_id\`);`)
  await db.run(sql`CREATE INDEX \`kitchen_revisions_updated_at_idx\` ON \`kitchen_revisions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`kitchen_revisions_created_at_idx\` ON \`kitchen_revisions\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`kitchen_formulas_id\` integer REFERENCES kitchen_formulas(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`kitchen_revisions_id\` integer REFERENCES kitchen_revisions(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_kitchen_formulas_id_idx\` ON \`payload_locked_documents_rels\` (\`kitchen_formulas_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_kitchen_revisions_id_idx\` ON \`payload_locked_documents_rels\` (\`kitchen_revisions_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`kitchen_formulas\`;`)
  await db.run(sql`DROP TABLE \`kitchen_revisions\`;`)
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
  	\`member_workbenches_id\` integer,
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
  	FOREIGN KEY (\`member_workbenches_id\`) REFERENCES \`member_workbenches\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_ratings_id\`) REFERENCES \`recipe_ratings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_rating_replies_id\`) REFERENCES \`recipe_rating_replies\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_reviews_id\`) REFERENCES \`recipe_reviews\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_review_replies_id\`) REFERENCES \`recipe_review_replies\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "owners_id", "recipes_id", "members_id", "member_sessions_id", "member_workbenches_id", "recipe_ratings_id", "recipe_rating_replies_id", "recipe_reviews_id", "recipe_review_replies_id", "articles_id", "categories_id", "media_id") SELECT "id", "order", "parent_id", "path", "owners_id", "recipes_id", "members_id", "member_sessions_id", "member_workbenches_id", "recipe_ratings_id", "recipe_rating_replies_id", "recipe_reviews_id", "recipe_review_replies_id", "articles_id", "categories_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_member_workbenches_id_idx\` ON \`payload_locked_documents_rels\` (\`member_workbenches_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_ratings_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_ratings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_rating_replies_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_rating_replies_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_reviews_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_reviews_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_review_replies_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_review_replies_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
}
