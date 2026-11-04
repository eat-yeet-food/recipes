import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

// Additive nullable columns; older Workers ignore them and newer ones treat null as no rests.
export const onlineCompatible = true

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`recipes_detail_recommendedFor_1354afc7b3\` ADD \`value_process_bench_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`recipes_detail_workbench_41ada5b4f0\` ADD \`config_default_selection_formula_process_bench_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`___recipes_v_ve_recommendedFor_3fce3b5801_v\` ADD \`value_process_bench_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`__recipes_v_ver_workbench_8e6955f37c_v\` ADD \`config_default_selection_formula_process_bench_minutes\` numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`recipes_detail_recommendedFor_1354afc7b3\` DROP COLUMN \`value_process_bench_minutes\`;`)
  await db.run(sql`ALTER TABLE \`recipes_detail_workbench_41ada5b4f0\` DROP COLUMN \`config_default_selection_formula_process_bench_minutes\`;`)
  await db.run(sql`ALTER TABLE \`___recipes_v_ve_recommendedFor_3fce3b5801_v\` DROP COLUMN \`value_process_bench_minutes\`;`)
  await db.run(sql`ALTER TABLE \`__recipes_v_ver_workbench_8e6955f37c_v\` DROP COLUMN \`config_default_selection_formula_process_bench_minutes\`;`)
}
