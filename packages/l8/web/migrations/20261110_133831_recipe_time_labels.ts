import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

// Additive nullable text columns for optional time display text; older Workers ignore them.
export const onlineCompatible = true

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_prep_label\` text;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_cook_label\` text;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_total_label\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_prep_label\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_cook_label\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_total_label\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_prep_label\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_cook_label\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_total_label\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_prep_label\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_cook_label\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_total_label\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_prep_label\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_cook_label\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_total_label\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_prep_label\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_cook_label\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_total_label\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_prep_label\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_cook_label\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_total_label\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_prep_label\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_cook_label\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_total_label\`;`)
}
