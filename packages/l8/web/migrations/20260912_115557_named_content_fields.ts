import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`recipes_detail_courses_89dce7b891\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_courses_89dce7b891_order_idx\` ON \`recipes_detail_courses_89dce7b891\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_courses_89dce7b891_parent_id_idx\` ON \`recipes_detail_courses_89dce7b891\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_cuisines_03c0016553\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_cuisines_03c0016553_order_idx\` ON \`recipes_detail_cuisines_03c0016553\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_cuisines_03c0016553_parent_id_idx\` ON \`recipes_detail_cuisines_03c0016553\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_methods_aa63fe5941\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_methods_aa63fe5941_order_idx\` ON \`recipes_detail_methods_aa63fe5941\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_methods_aa63fe5941_parent_id_idx\` ON \`recipes_detail_methods_aa63fe5941\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_restrictions_e135853dad\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_restrictions_e135853dad_order_idx\` ON \`recipes_detail_restrictions_e135853dad\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_restrictions_e135853dad_parent_id_idx\` ON \`recipes_detail_restrictions_e135853dad\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_occasions_5f8a1cb9f5\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_occasions_5f8a1cb9f5_order_idx\` ON \`recipes_detail_occasions_5f8a1cb9f5\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_occasions_5f8a1cb9f5_parent_id_idx\` ON \`recipes_detail_occasions_5f8a1cb9f5\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_ingredientType_ce90e84b99\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_ingredientType_ce90e84b99_order_idx\` ON \`recipes_detail_ingredientType_ce90e84b99\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_ingredientType_ce90e84b99_parent_id_idx\` ON \`recipes_detail_ingredientType_ce90e84b99\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_allowedMethods_e9d2cf84ab\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_learning_35ee544dbe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_allowedMethods_e9d2cf84ab_order_idx\` ON \`recipes_detail_allowedMethods_e9d2cf84ab\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_allowedMethods_e9d2cf84ab_parent_id_idx\` ON \`recipes_detail_allowedMethods_e9d2cf84ab\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_methodArticles_f332250a82\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_learning_35ee544dbe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_methodArticles_f332250a82_order_idx\` ON \`recipes_detail_methodArticles_f332250a82\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_methodArticles_f332250a82_parent_id_idx\` ON \`recipes_detail_methodArticles_f332250a82\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_methods_ac3073be05\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_learning_35ee544dbe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_methods_ac3073be05_order_idx\` ON \`recipes_detail_methods_ac3073be05\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_methods_ac3073be05_parent_id_idx\` ON \`recipes_detail_methods_ac3073be05\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_methodArticles_9531ba1ac6\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_learning_35ee544dbe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_methodArticles_9531ba1ac6_order_idx\` ON \`recipes_detail_methodArticles_9531ba1ac6\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_methodArticles_9531ba1ac6_parent_id_idx\` ON \`recipes_detail_methodArticles_9531ba1ac6\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_handling_ba06b71cd4\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_article\` text,
    \`value_label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_learning_35ee544dbe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_handling_ba06b71cd4_order_idx\` ON \`recipes_detail_handling_ba06b71cd4\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_handling_ba06b71cd4_parent_id_idx\` ON \`recipes_detail_handling_ba06b71cd4\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_rangeF_4ffb3a84e1\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_learning_35ee544dbe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_rangeF_4ffb3a84e1_order_idx\` ON \`recipes_detail_rangeF_4ffb3a84e1\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_rangeF_4ffb3a84e1_parent_id_idx\` ON \`recipes_detail_rangeF_4ffb3a84e1\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_learning_35ee544dbe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`authored_fields\` text,
    \`mixing_authored_fields\` text,
    \`mixing_default_method\` text,
    \`mixing_target_development\` text,
    \`mixing_article\` text,
    \`dough_strength_authored_fields\` text,
    \`dough_strength_article\` text,
    \`final_dough_temperature_authored_fields\` text,
    \`final_dough_temperature_target_f\` numeric,
    \`final_dough_temperature_reason\` text,
    \`final_dough_temperature_article\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_learning_35ee544dbe_order_idx\` ON \`recipes_detail_learning_35ee544dbe\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_learning_35ee544dbe_parent_id_idx\` ON \`recipes_detail_learning_35ee544dbe\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_hiddenIngredie_8c90e2c6e0\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_workbench_41ada5b4f0\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_hiddenIngredie_8c90e2c6e0_order_idx\` ON \`recipes_detail_hiddenIngredie_8c90e2c6e0\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_hiddenIngredie_8c90e2c6e0_parent_id_idx\` ON \`recipes_detail_hiddenIngredie_8c90e2c6e0\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_perPieceIngred_a6f1a043cb\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value_authored_fields\` text,
    \`value_quantity\` numeric,
    \`value_unit\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_workbench_41ada5b4f0\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_perPieceIngred_a6f1a043cb_order_idx\` ON \`recipes_detail_perPieceIngred_a6f1a043cb\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_perPieceIngred_a6f1a043cb_parent_id_idx\` ON \`recipes_detail_perPieceIngred_a6f1a043cb\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_diametersInche_013c6972e8\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_workbench_41ada5b4f0\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_diametersInche_013c6972e8_order_idx\` ON \`recipes_detail_diametersInche_013c6972e8\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_diametersInche_013c6972e8_parent_id_idx\` ON \`recipes_detail_diametersInche_013c6972e8\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_initialMinutes_a096d9cdd6\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_workbench_41ada5b4f0\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_initialMinutes_a096d9cdd6_order_idx\` ON \`recipes_detail_initialMinutes_a096d9cdd6\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_initialMinutes_a096d9cdd6_parent_id_idx\` ON \`recipes_detail_initialMinutes_a096d9cdd6\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_flour_7d8371de67\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_name\` text,
    \`value_percent\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_workbench_41ada5b4f0\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_flour_7d8371de67_order_idx\` ON \`recipes_detail_flour_7d8371de67\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_flour_7d8371de67_parent_id_idx\` ON \`recipes_detail_flour_7d8371de67\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_flour_7d01cad495\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_name\` text,
    \`value_percent\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_workbench_41ada5b4f0\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_flour_7d01cad495_order_idx\` ON \`recipes_detail_flour_7d01cad495\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_flour_7d01cad495_parent_id_idx\` ON \`recipes_detail_flour_7d01cad495\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_folds_472b3261f9\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_at_minutes\` numeric,
    \`value_method\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_workbench_41ada5b4f0\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_folds_472b3261f9_order_idx\` ON \`recipes_detail_folds_472b3261f9\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_folds_472b3261f9_parent_id_idx\` ON \`recipes_detail_folds_472b3261f9\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_flour_87475040fa\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_name\` text,
    \`value_percent\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_recommendedFor_1354afc7b3\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_flour_87475040fa_order_idx\` ON \`recipes_detail_flour_87475040fa\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_flour_87475040fa_parent_id_idx\` ON \`recipes_detail_flour_87475040fa\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_flour_ba4184f608\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_name\` text,
    \`value_percent\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_recommendedFor_1354afc7b3\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_flour_ba4184f608_order_idx\` ON \`recipes_detail_flour_ba4184f608\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_flour_ba4184f608_parent_id_idx\` ON \`recipes_detail_flour_ba4184f608\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_folds_4d84c9b806\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_at_minutes\` numeric,
    \`value_method\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_recommendedFor_1354afc7b3\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_folds_4d84c9b806_order_idx\` ON \`recipes_detail_folds_4d84c9b806\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_folds_4d84c9b806_parent_id_idx\` ON \`recipes_detail_folds_4d84c9b806\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_recommendedFor_1354afc7b3\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value_authored_fields\` text,
    \`value_family\` text,
    \`value_hydration_percent\` numeric,
    \`value_salt_percent\` numeric,
    \`value_oil_percent\` numeric,
    \`value_sugar_percent\` numeric,
    \`value_malt_percent\` numeric,
    \`value_yeast_percent\` numeric,
    \`value_levain_percent\` numeric,
    \`value_starter_authored_fields\` text,
    \`value_starter_hydration_percent\` numeric,
    \`value_process_authored_fields\` text,
    \`value_process_mixing_method\` text,
    \`value_process_fold_method\` text,
    \`value_process_autolyse_minutes\` numeric,
    \`value_process_salt_delay_minutes\` numeric,
    \`value_process_bulk_minutes\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_detail_workbench_41ada5b4f0\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_recommendedFor_1354afc7b3_order_idx\` ON \`recipes_detail_recommendedFor_1354afc7b3\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_recommendedFor_1354afc7b3_parent_id_idx\` ON \`recipes_detail_recommendedFor_1354afc7b3\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_workbench_41ada5b4f0\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`authored_fields\` text,
    \`authored_id\` text,
    \`config_authored_fields\` text,
    \`config_default_input_mode\` text,
    \`config_dough_ingredient_section_id\` text,
    \`config_per_piece_ingredient_label\` text,
    \`config_pizza_sizing_authored_fields\` text,
    \`config_pizza_sizing_reference_diameter_inches\` numeric,
    \`config_pizza_sizing_reference_ball_weight_grams\` numeric,
    \`config_initial_water_percent\` numeric,
    \`config_spiral_mixer_authored_fields\` text,
    \`config_spiral_mixer_name\` text,
    \`config_spiral_mixer_initial_rpm\` numeric,
    \`config_spiral_mixer_target_temperature_f\` numeric,
    \`config_spiral_mixer_salt_rpm\` numeric,
    \`config_spiral_mixer_salt_minutes\` numeric,
    \`config_spiral_mixer_finish_rpm\` numeric,
    \`config_spiral_mixer_finish_minutes\` numeric,
    \`config_process_sections_authored_fields\` text,
    \`config_process_sections_autolyse\` text,
    \`config_process_sections_bulk\` text,
    \`config_process_sections_levain\` text,
    \`config_default_selection_authored_fields\` text,
    \`config_default_selection_version\` numeric,
    \`config_default_selection_method_id\` text,
    \`config_default_selection_batch_authored_fields\` text,
    \`config_default_selection_batch_count\` numeric,
    \`config_default_selection_batch_piece_weight_grams\` numeric,
    \`config_default_selection_batch_diameter_inches\` numeric,
    \`config_default_selection_batch_piece_label\` text,
    \`config_default_selection_formula_authored_fields\` text,
    \`config_default_selection_formula_family\` text,
    \`config_default_selection_formula_hydration_percent\` numeric,
    \`config_default_selection_formula_salt_percent\` numeric,
    \`config_default_selection_formula_oil_percent\` numeric,
    \`config_default_selection_formula_sugar_percent\` numeric,
    \`config_default_selection_formula_malt_percent\` numeric,
    \`config_default_selection_formula_yeast_percent\` numeric,
    \`config_default_selection_formula_levain_percent\` numeric,
    \`config_default_selection_formula_starter_authored_fields\` text,
    \`config_default_selection_formula_starter_hydration_percent\` numeric,
    \`config_default_selection_formula_process_authored_fields\` text,
    \`config_default_selection_formula_process_mixing_method\` text,
    \`config_default_selection_formula_process_fold_method\` text,
    \`config_default_selection_formula_process_autolyse_minutes\` numeric,
    \`config_default_selection_formula_process_salt_delay_minutes\` numeric,
    \`config_default_selection_formula_process_bulk_minutes\` numeric,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_workbench_41ada5b4f0_order_idx\` ON \`recipes_detail_workbench_41ada5b4f0\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_workbench_41ada5b4f0_parent_id_idx\` ON \`recipes_detail_workbench_41ada5b4f0\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recipes_detail_mediaReference_ee91fbb695\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recipes_detail_mediaReference_ee91fbb695_order_idx\` ON \`recipes_detail_mediaReference_ee91fbb695\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`recipes_detail_mediaReference_ee91fbb695_parent_id_idx\` ON \`recipes_detail_mediaReference_ee91fbb695\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_courses_27fede470f_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_courses_27fede470f_v_order_idx\` ON \`__recipes_v_ver_courses_27fede470f_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_courses_27fede470f_v_parent_id_idx\` ON \`__recipes_v_ver_courses_27fede470f_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_cuisines_e7af201786_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_cuisines_e7af201786_v_order_idx\` ON \`__recipes_v_ver_cuisines_e7af201786_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_cuisines_e7af201786_v_parent_id_idx\` ON \`__recipes_v_ver_cuisines_e7af201786_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_methods_c18ef7c494_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_methods_c18ef7c494_v_order_idx\` ON \`__recipes_v_ver_methods_c18ef7c494_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_methods_c18ef7c494_v_parent_id_idx\` ON \`__recipes_v_ver_methods_c18ef7c494_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_restrictions_43537adb94_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_restrictions_43537adb94_v_order_idx\` ON \`__recipes_v_ver_restrictions_43537adb94_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_restrictions_43537adb94_v_parent_id_idx\` ON \`__recipes_v_ver_restrictions_43537adb94_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_occasions_a14a33d37d_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_occasions_a14a33d37d_v_order_idx\` ON \`__recipes_v_ver_occasions_a14a33d37d_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_occasions_a14a33d37d_v_parent_id_idx\` ON \`__recipes_v_ver_occasions_a14a33d37d_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_ingredientType_ac142d5fa4_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_ingredientType_ac142d5fa4_v_order_idx\` ON \`__recipes_v_ver_ingredientType_ac142d5fa4_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_ingredientType_ac142d5fa4_v_parent_id_idx\` ON \`__recipes_v_ver_ingredientType_ac142d5fa4_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_allowedMethods_5936414586_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_learning_b98cb7078c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_allowedMethods_5936414586_v_order_idx\` ON \`___recipes_v_ve_allowedMethods_5936414586_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_allowedMethods_5936414586_v_parent_id_idx\` ON \`___recipes_v_ve_allowedMethods_5936414586_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_methodArticles_1b4c163f31_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_learning_b98cb7078c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_methodArticles_1b4c163f31_v_order_idx\` ON \`___recipes_v_ve_methodArticles_1b4c163f31_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_methodArticles_1b4c163f31_v_parent_id_idx\` ON \`___recipes_v_ve_methodArticles_1b4c163f31_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_methods_b8c0d15aeb_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_learning_b98cb7078c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_methods_b8c0d15aeb_v_order_idx\` ON \`___recipes_v_ve_methods_b8c0d15aeb_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_methods_b8c0d15aeb_v_parent_id_idx\` ON \`___recipes_v_ve_methods_b8c0d15aeb_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_methodArticles_9587fbfbb5_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_learning_b98cb7078c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_methodArticles_9587fbfbb5_v_order_idx\` ON \`___recipes_v_ve_methodArticles_9587fbfbb5_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_methodArticles_9587fbfbb5_v_parent_id_idx\` ON \`___recipes_v_ve_methodArticles_9587fbfbb5_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_handling_66acff6bd7_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_article\` text,
    \`value_label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_learning_b98cb7078c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_handling_66acff6bd7_v_order_idx\` ON \`___recipes_v_ve_handling_66acff6bd7_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_handling_66acff6bd7_v_parent_id_idx\` ON \`___recipes_v_ve_handling_66acff6bd7_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_rangeF_b688472d7f_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_learning_b98cb7078c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_rangeF_b688472d7f_v_order_idx\` ON \`___recipes_v_ve_rangeF_b688472d7f_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_rangeF_b688472d7f_v_parent_id_idx\` ON \`___recipes_v_ve_rangeF_b688472d7f_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_learning_b98cb7078c_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`authored_fields\` text,
    \`mixing_authored_fields\` text,
    \`mixing_default_method\` text,
    \`mixing_target_development\` text,
    \`mixing_article\` text,
    \`dough_strength_authored_fields\` text,
    \`dough_strength_article\` text,
    \`final_dough_temperature_authored_fields\` text,
    \`final_dough_temperature_target_f\` numeric,
    \`final_dough_temperature_reason\` text,
    \`final_dough_temperature_article\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_learning_b98cb7078c_v_order_idx\` ON \`__recipes_v_ver_learning_b98cb7078c_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_learning_b98cb7078c_v_parent_id_idx\` ON \`__recipes_v_ver_learning_b98cb7078c_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_hiddenIngredie_fd52cdb541_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_workbench_8e6955f37c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_hiddenIngredie_fd52cdb541_v_order_idx\` ON \`___recipes_v_ve_hiddenIngredie_fd52cdb541_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_hiddenIngredie_fd52cdb541_v_parent_id_idx\` ON \`___recipes_v_ve_hiddenIngredie_fd52cdb541_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_perPieceIngred_ee6ff96a26_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value_authored_fields\` text,
    \`value_quantity\` numeric,
    \`value_unit\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_workbench_8e6955f37c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_perPieceIngred_ee6ff96a26_v_order_idx\` ON \`___recipes_v_ve_perPieceIngred_ee6ff96a26_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_perPieceIngred_ee6ff96a26_v_parent_id_idx\` ON \`___recipes_v_ve_perPieceIngred_ee6ff96a26_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_diametersInche_9077073f49_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_workbench_8e6955f37c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_diametersInche_9077073f49_v_order_idx\` ON \`___recipes_v_ve_diametersInche_9077073f49_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_diametersInche_9077073f49_v_parent_id_idx\` ON \`___recipes_v_ve_diametersInche_9077073f49_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_initialMinutes_9c0ea35770_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_workbench_8e6955f37c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_initialMinutes_9c0ea35770_v_order_idx\` ON \`___recipes_v_ve_initialMinutes_9c0ea35770_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_initialMinutes_9c0ea35770_v_parent_id_idx\` ON \`___recipes_v_ve_initialMinutes_9c0ea35770_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_flour_63c5ff4b14_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_name\` text,
    \`value_percent\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_workbench_8e6955f37c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_flour_63c5ff4b14_v_order_idx\` ON \`___recipes_v_ve_flour_63c5ff4b14_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_flour_63c5ff4b14_v_parent_id_idx\` ON \`___recipes_v_ve_flour_63c5ff4b14_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_flour_cfb0cef89f_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_name\` text,
    \`value_percent\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_workbench_8e6955f37c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_flour_cfb0cef89f_v_order_idx\` ON \`___recipes_v_ve_flour_cfb0cef89f_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_flour_cfb0cef89f_v_parent_id_idx\` ON \`___recipes_v_ve_flour_cfb0cef89f_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_folds_f0cda9ac37_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_at_minutes\` numeric,
    \`value_method\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_workbench_8e6955f37c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_folds_f0cda9ac37_v_order_idx\` ON \`___recipes_v_ve_folds_f0cda9ac37_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_folds_f0cda9ac37_v_parent_id_idx\` ON \`___recipes_v_ve_folds_f0cda9ac37_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`____recipes_v_v_flour_a97a5a9d8f_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_name\` text,
    \`value_percent\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`___recipes_v_ve_recommendedFor_3fce3b5801_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`____recipes_v_v_flour_a97a5a9d8f_v_order_idx\` ON \`____recipes_v_v_flour_a97a5a9d8f_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`____recipes_v_v_flour_a97a5a9d8f_v_parent_id_idx\` ON \`____recipes_v_v_flour_a97a5a9d8f_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`____recipes_v_v_flour_05bae63022_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_name\` text,
    \`value_percent\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`___recipes_v_ve_recommendedFor_3fce3b5801_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`____recipes_v_v_flour_05bae63022_v_order_idx\` ON \`____recipes_v_v_flour_05bae63022_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`____recipes_v_v_flour_05bae63022_v_parent_id_idx\` ON \`____recipes_v_v_flour_05bae63022_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`____recipes_v_v_folds_ee860490a7_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value_authored_fields\` text,
    \`value_authored_id\` text,
    \`value_at_minutes\` numeric,
    \`value_method\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`___recipes_v_ve_recommendedFor_3fce3b5801_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`____recipes_v_v_folds_ee860490a7_v_order_idx\` ON \`____recipes_v_v_folds_ee860490a7_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`____recipes_v_v_folds_ee860490a7_v_parent_id_idx\` ON \`____recipes_v_v_folds_ee860490a7_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`___recipes_v_ve_recommendedFor_3fce3b5801_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value_authored_fields\` text,
    \`value_family\` text,
    \`value_hydration_percent\` numeric,
    \`value_salt_percent\` numeric,
    \`value_oil_percent\` numeric,
    \`value_sugar_percent\` numeric,
    \`value_malt_percent\` numeric,
    \`value_yeast_percent\` numeric,
    \`value_levain_percent\` numeric,
    \`value_starter_authored_fields\` text,
    \`value_starter_hydration_percent\` numeric,
    \`value_process_authored_fields\` text,
    \`value_process_mixing_method\` text,
    \`value_process_fold_method\` text,
    \`value_process_autolyse_minutes\` numeric,
    \`value_process_salt_delay_minutes\` numeric,
    \`value_process_bulk_minutes\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`__recipes_v_ver_workbench_8e6955f37c_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_recommendedFor_3fce3b5801_v_order_idx\` ON \`___recipes_v_ve_recommendedFor_3fce3b5801_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`___recipes_v_ve_recommendedFor_3fce3b5801_v_parent_id_idx\` ON \`___recipes_v_ve_recommendedFor_3fce3b5801_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_workbench_8e6955f37c_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`authored_fields\` text,
    \`authored_id\` text,
    \`config_authored_fields\` text,
    \`config_default_input_mode\` text,
    \`config_dough_ingredient_section_id\` text,
    \`config_per_piece_ingredient_label\` text,
    \`config_pizza_sizing_authored_fields\` text,
    \`config_pizza_sizing_reference_diameter_inches\` numeric,
    \`config_pizza_sizing_reference_ball_weight_grams\` numeric,
    \`config_initial_water_percent\` numeric,
    \`config_spiral_mixer_authored_fields\` text,
    \`config_spiral_mixer_name\` text,
    \`config_spiral_mixer_initial_rpm\` numeric,
    \`config_spiral_mixer_target_temperature_f\` numeric,
    \`config_spiral_mixer_salt_rpm\` numeric,
    \`config_spiral_mixer_salt_minutes\` numeric,
    \`config_spiral_mixer_finish_rpm\` numeric,
    \`config_spiral_mixer_finish_minutes\` numeric,
    \`config_process_sections_authored_fields\` text,
    \`config_process_sections_autolyse\` text,
    \`config_process_sections_bulk\` text,
    \`config_process_sections_levain\` text,
    \`config_default_selection_authored_fields\` text,
    \`config_default_selection_version\` numeric,
    \`config_default_selection_method_id\` text,
    \`config_default_selection_batch_authored_fields\` text,
    \`config_default_selection_batch_count\` numeric,
    \`config_default_selection_batch_piece_weight_grams\` numeric,
    \`config_default_selection_batch_diameter_inches\` numeric,
    \`config_default_selection_batch_piece_label\` text,
    \`config_default_selection_formula_authored_fields\` text,
    \`config_default_selection_formula_family\` text,
    \`config_default_selection_formula_hydration_percent\` numeric,
    \`config_default_selection_formula_salt_percent\` numeric,
    \`config_default_selection_formula_oil_percent\` numeric,
    \`config_default_selection_formula_sugar_percent\` numeric,
    \`config_default_selection_formula_malt_percent\` numeric,
    \`config_default_selection_formula_yeast_percent\` numeric,
    \`config_default_selection_formula_levain_percent\` numeric,
    \`config_default_selection_formula_starter_authored_fields\` text,
    \`config_default_selection_formula_starter_hydration_percent\` numeric,
    \`config_default_selection_formula_process_authored_fields\` text,
    \`config_default_selection_formula_process_mixing_method\` text,
    \`config_default_selection_formula_process_fold_method\` text,
    \`config_default_selection_formula_process_autolyse_minutes\` numeric,
    \`config_default_selection_formula_process_salt_delay_minutes\` numeric,
    \`config_default_selection_formula_process_bulk_minutes\` numeric,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_workbench_8e6955f37c_v_order_idx\` ON \`__recipes_v_ver_workbench_8e6955f37c_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_workbench_8e6955f37c_v_parent_id_idx\` ON \`__recipes_v_ver_workbench_8e6955f37c_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__recipes_v_ver_mediaReference_e3beaebc5e_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_mediaReference_e3beaebc5e_v_order_idx\` ON \`__recipes_v_ver_mediaReference_e3beaebc5e_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__recipes_v_ver_mediaReference_e3beaebc5e_v_parent_id_idx\` ON \`__recipes_v_ver_mediaReference_e3beaebc5e_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`articles_detai_tags_6d4a8f56aa\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`articles_detai_tags_6d4a8f56aa_order_idx\` ON \`articles_detai_tags_6d4a8f56aa\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`articles_detai_tags_6d4a8f56aa_parent_id_idx\` ON \`articles_detai_tags_6d4a8f56aa\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`articles_detai_mediaReference_9ee5154e92\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`articles_detai_mediaReference_9ee5154e92_order_idx\` ON \`articles_detai_mediaReference_9ee5154e92\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`articles_detai_mediaReference_9ee5154e92_parent_id_idx\` ON \`articles_detai_mediaReference_9ee5154e92\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__articles_v_ve_tags_0550810969_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__articles_v_ve_tags_0550810969_v_order_idx\` ON \`__articles_v_ve_tags_0550810969_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__articles_v_ve_tags_0550810969_v_parent_id_idx\` ON \`__articles_v_ve_tags_0550810969_v\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`__articles_v_ve_mediaReference_b90c9c3355_v\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`key\` text,
    \`value\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`__articles_v_ve_mediaReference_b90c9c3355_v_order_idx\` ON \`__articles_v_ve_mediaReference_b90c9c3355_v\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`__articles_v_ve_mediaReference_b90c9c3355_v_parent_id_idx\` ON \`__articles_v_ve_mediaReference_b90c9c3355_v\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_label\` text;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_description\` text;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_prep_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_cook_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_total_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_yield_amount\` text;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` ADD \`details_yield_unit\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_description\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_image\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_created\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_order\` numeric;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_category\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_prep_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_cook_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_total_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_yield_amount\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_yield_unit\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_default_method\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_search_text\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`details_image_hash\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`search_appearance_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`search_appearance_title\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`search_appearance_description\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`search_appearance_image\` text;`)
  await db.run(sql`ALTER TABLE \`recipes\` ADD \`search_appearance_noindex\` integer;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_label\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_description\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_prep_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_cook_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_total_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_yield_amount\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` ADD \`details_yield_unit\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_description\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_image\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_created\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_order\` numeric;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_category\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_prep_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_cook_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_total_minutes\` numeric;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_yield_amount\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_yield_unit\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_default_method\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_search_text\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_details_image_hash\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_search_appearance_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_search_appearance_title\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_search_appearance_description\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_search_appearance_image\` text;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` ADD \`version_search_appearance_noindex\` integer;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_description\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_image\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_created\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_order\` numeric;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_type\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_category\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_search_text\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`details_image_hash\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`search_appearance_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`search_appearance_title\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`search_appearance_description\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`search_appearance_image\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`search_appearance_noindex\` integer;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_description\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_image\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_created\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_order\` numeric;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_type\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_category\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_search_text\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_details_image_hash\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_search_appearance_authored_fields\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_search_appearance_title\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_search_appearance_description\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_search_appearance_image\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_search_appearance_noindex\` integer;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`recipes_detail_courses_89dce7b891\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_cuisines_03c0016553\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_methods_aa63fe5941\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_restrictions_e135853dad\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_occasions_5f8a1cb9f5\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_ingredientType_ce90e84b99\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_allowedMethods_e9d2cf84ab\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_methodArticles_f332250a82\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_methods_ac3073be05\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_methodArticles_9531ba1ac6\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_handling_ba06b71cd4\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_rangeF_4ffb3a84e1\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_learning_35ee544dbe\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_hiddenIngredie_8c90e2c6e0\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_perPieceIngred_a6f1a043cb\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_diametersInche_013c6972e8\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_initialMinutes_a096d9cdd6\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_flour_7d8371de67\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_flour_7d01cad495\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_folds_472b3261f9\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_flour_87475040fa\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_flour_ba4184f608\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_folds_4d84c9b806\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_recommendedFor_1354afc7b3\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_workbench_41ada5b4f0\`;`)
  await db.run(sql`DROP TABLE \`recipes_detail_mediaReference_ee91fbb695\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_courses_27fede470f_v\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_cuisines_e7af201786_v\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_methods_c18ef7c494_v\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_restrictions_43537adb94_v\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_occasions_a14a33d37d_v\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_ingredientType_ac142d5fa4_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_allowedMethods_5936414586_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_methodArticles_1b4c163f31_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_methods_b8c0d15aeb_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_methodArticles_9587fbfbb5_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_handling_66acff6bd7_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_rangeF_b688472d7f_v\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_learning_b98cb7078c_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_hiddenIngredie_fd52cdb541_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_perPieceIngred_ee6ff96a26_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_diametersInche_9077073f49_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_initialMinutes_9c0ea35770_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_flour_63c5ff4b14_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_flour_cfb0cef89f_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_folds_f0cda9ac37_v\`;`)
  await db.run(sql`DROP TABLE \`____recipes_v_v_flour_a97a5a9d8f_v\`;`)
  await db.run(sql`DROP TABLE \`____recipes_v_v_flour_05bae63022_v\`;`)
  await db.run(sql`DROP TABLE \`____recipes_v_v_folds_ee860490a7_v\`;`)
  await db.run(sql`DROP TABLE \`___recipes_v_ve_recommendedFor_3fce3b5801_v\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_workbench_8e6955f37c_v\`;`)
  await db.run(sql`DROP TABLE \`__recipes_v_ver_mediaReference_e3beaebc5e_v\`;`)
  await db.run(sql`DROP TABLE \`articles_detai_tags_6d4a8f56aa\`;`)
  await db.run(sql`DROP TABLE \`articles_detai_mediaReference_9ee5154e92\`;`)
  await db.run(sql`DROP TABLE \`__articles_v_ve_tags_0550810969_v\`;`)
  await db.run(sql`DROP TABLE \`__articles_v_ve_mediaReference_b90c9c3355_v\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_label\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_description\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_prep_minutes\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_cook_minutes\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_total_minutes\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_yield_amount\`;`)
  await db.run(sql`ALTER TABLE \`recipes_method_options\` DROP COLUMN \`details_yield_unit\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_description\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_image\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_created\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_order\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_category\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_prep_minutes\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_cook_minutes\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_total_minutes\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_yield_amount\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_yield_unit\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_default_method\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_search_text\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`details_image_hash\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`search_appearance_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`search_appearance_title\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`search_appearance_description\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`search_appearance_image\`;`)
  await db.run(sql`ALTER TABLE \`recipes\` DROP COLUMN \`search_appearance_noindex\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_label\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_description\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_prep_minutes\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_cook_minutes\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_total_minutes\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_yield_amount\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v_version_method_options\` DROP COLUMN \`details_yield_unit\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_description\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_image\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_created\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_order\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_category\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_prep_minutes\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_cook_minutes\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_total_minutes\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_yield_amount\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_yield_unit\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_default_method\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_search_text\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_details_image_hash\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_search_appearance_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_search_appearance_title\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_search_appearance_description\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_search_appearance_image\`;`)
  await db.run(sql`ALTER TABLE \`_recipes_v\` DROP COLUMN \`version_search_appearance_noindex\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_description\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_image\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_created\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_order\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_type\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_category\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_search_text\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`details_image_hash\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`search_appearance_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`search_appearance_title\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`search_appearance_description\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`search_appearance_image\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`search_appearance_noindex\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_description\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_image\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_created\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_order\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_type\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_category\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_search_text\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_details_image_hash\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_search_appearance_authored_fields\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_search_appearance_title\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_search_appearance_description\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_search_appearance_image\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_search_appearance_noindex\`;`)
}
