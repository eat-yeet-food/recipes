import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`recipe_rating_replies\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`recipe_id\` integer NOT NULL,
  	\`rating_id\` integer NOT NULL,
  	\`poster_key\` text NOT NULL,
  	\`poster_name\` text NOT NULL,
  	\`poster_email\` text NOT NULL,
  	\`body\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`recipe_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`rating_id\`) REFERENCES \`recipe_ratings\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`recipe_rating_replies_recipe_idx\` ON \`recipe_rating_replies\` (\`recipe_id\`);`)
  await db.run(sql`CREATE INDEX \`recipe_rating_replies_rating_idx\` ON \`recipe_rating_replies\` (\`rating_id\`);`)
  await db.run(sql`CREATE INDEX \`recipe_rating_replies_poster_key_idx\` ON \`recipe_rating_replies\` (\`poster_key\`);`)
  await db.run(sql`CREATE INDEX \`recipe_rating_replies_updated_at_idx\` ON \`recipe_rating_replies\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`recipe_rating_replies_created_at_idx\` ON \`recipe_rating_replies\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`recipe_ratings\` ADD \`reviewer_name\` text;`)
  await db.run(sql`ALTER TABLE \`recipe_ratings\` ADD \`reviewer_email\` text;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`recipe_rating_replies_id\` integer REFERENCES recipe_rating_replies(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_rating_replies_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_rating_replies_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`recipe_rating_replies\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`owners_id\` integer,
  	\`recipes_id\` integer,
  	\`recipe_ratings_id\` integer,
  	\`articles_id\` integer,
  	\`categories_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`owners_id\`) REFERENCES \`owners\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipes_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recipe_ratings_id\`) REFERENCES \`recipe_ratings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "owners_id", "recipes_id", "recipe_ratings_id", "articles_id", "categories_id", "media_id") SELECT "id", "order", "parent_id", "path", "owners_id", "recipes_id", "recipe_ratings_id", "articles_id", "categories_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_owners_id_idx\` ON \`payload_locked_documents_rels\` (\`owners_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipes_id_idx\` ON \`payload_locked_documents_rels\` (\`recipes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recipe_ratings_id_idx\` ON \`payload_locked_documents_rels\` (\`recipe_ratings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`ALTER TABLE \`recipe_ratings\` DROP COLUMN \`reviewer_name\`;`)
  await db.run(sql`ALTER TABLE \`recipe_ratings\` DROP COLUMN \`reviewer_email\`;`)
}
