import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`recipes_blocks_markdown\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_markdown_order_idx\` ON \`recipes_blocks_markdown\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_markdown_parent_id_idx\` ON \`recipes_blocks_markdown\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_markdown_path_idx\` ON \`recipes_blocks_markdown\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_image_images\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`src\` text NOT NULL,
    \`alt\` text NOT NULL,
    \`caption\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_image\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_image_images_order_idx\` ON \`recipes_blocks_image_images\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_image_images_parent_id_idx\` ON \`recipes_blocks_image_images\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_image\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`layout_mode\` text,
    \`layout_aspect\` text,
    \`layout_columns\` numeric,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_image_order_idx\` ON \`recipes_blocks_image\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_image_parent_id_idx\` ON \`recipes_blocks_image\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_image_path_idx\` ON \`recipes_blocks_image\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_callout\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`tone\` text,
    \`html\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_callout_order_idx\` ON \`recipes_blocks_callout\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_callout_parent_id_idx\` ON \`recipes_blocks_callout\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_callout_path_idx\` ON \`recipes_blocks_callout\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_steps_items_order_idx\` ON \`recipes_blocks_steps_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_steps_items_parent_id_idx\` ON \`recipes_blocks_steps_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`heading_level\` numeric,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_steps_order_idx\` ON \`recipes_blocks_steps\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_steps_parent_id_idx\` ON \`recipes_blocks_steps\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_steps_path_idx\` ON \`recipes_blocks_steps\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_comparison_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_comparison\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_columns_order_idx\` ON \`recipes_blocks_comparison_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_columns_parent_id_idx\` ON \`recipes_blocks_comparison_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_comparison_rows_values\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_comparison_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_rows_values_order_idx\` ON \`recipes_blocks_comparison_rows_values\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_rows_values_parent_id_idx\` ON \`recipes_blocks_comparison_rows_values\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_comparison_rows\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_comparison\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_rows_order_idx\` ON \`recipes_blocks_comparison_rows\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_rows_parent_id_idx\` ON \`recipes_blocks_comparison_rows\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_comparison\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_order_idx\` ON \`recipes_blocks_comparison\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_parent_id_idx\` ON \`recipes_blocks_comparison\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_comparison_path_idx\` ON \`recipes_blocks_comparison\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_footnotes_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`url\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_footnotes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_footnotes_items_order_idx\` ON \`recipes_blocks_footnotes_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_footnotes_items_parent_id_idx\` ON \`recipes_blocks_footnotes_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_footnotes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_footnotes_order_idx\` ON \`recipes_blocks_footnotes\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_footnotes_parent_id_idx\` ON \`recipes_blocks_footnotes\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_footnotes_path_idx\` ON \`recipes_blocks_footnotes\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe_equipment_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_recipe_equipment\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_equipment_items_order_idx\` ON \`recipes_blocks_recipe_equipment_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_equipment_items_parent_id_idx\` ON \`recipes_blocks_recipe_equipment_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe_equipment\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_equipment_order_idx\` ON \`recipes_blocks_recipe_equipment\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_equipment_parent_id_idx\` ON \`recipes_blocks_recipe_equipment\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe_ingredients_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_recipe_ingredients\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_ingredients_items_order_idx\` ON \`recipes_blocks_recipe_ingredients_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_ingredients_items_parent_id_idx\` ON \`recipes_blocks_recipe_ingredients_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe_ingredients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_ingredients_order_idx\` ON \`recipes_blocks_recipe_ingredients\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_ingredients_parent_id_idx\` ON \`recipes_blocks_recipe_ingredients\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_recipe_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_steps_items_order_idx\` ON \`recipes_blocks_recipe_steps_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_steps_items_parent_id_idx\` ON \`recipes_blocks_recipe_steps_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_steps_order_idx\` ON \`recipes_blocks_recipe_steps\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_steps_parent_id_idx\` ON \`recipes_blocks_recipe_steps\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe_notes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_notes_order_idx\` ON \`recipes_blocks_recipe_notes\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_notes_parent_id_idx\` ON \`recipes_blocks_recipe_notes\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe_tips\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_tips_order_idx\` ON \`recipes_blocks_recipe_tips\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_tips_parent_id_idx\` ON \`recipes_blocks_recipe_tips\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_recipe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_order_idx\` ON \`recipes_blocks_recipe\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_parent_id_idx\` ON \`recipes_blocks_recipe\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_recipe_path_idx\` ON \`recipes_blocks_recipe\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_youtube\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`video_id\` text NOT NULL,
    \`title\` text NOT NULL,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_youtube_order_idx\` ON \`recipes_blocks_youtube\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_youtube_parent_id_idx\` ON \`recipes_blocks_youtube\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_youtube_path_idx\` ON \`recipes_blocks_youtube\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_section_2_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_section_2\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_2_columns_order_idx\` ON \`recipes_blocks_section_2_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_2_columns_parent_id_idx\` ON \`recipes_blocks_section_2_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_section_2\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`layout\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_2_order_idx\` ON \`recipes_blocks_section_2\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_2_parent_id_idx\` ON \`recipes_blocks_section_2\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_2_path_idx\` ON \`recipes_blocks_section_2\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_section_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes_blocks_section\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_columns_order_idx\` ON \`recipes_blocks_section_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_columns_parent_id_idx\` ON \`recipes_blocks_section_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_blocks_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`layout\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_order_idx\` ON \`recipes_blocks_section\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_parent_id_idx\` ON \`recipes_blocks_section\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_blocks_section_path_idx\` ON \`recipes_blocks_section\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`recipes_method_options\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`method_id\` text NOT NULL,
    \`metadata\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`recipes_method_options_order_idx\` ON \`recipes_method_options\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`recipes_method_options_parent_id_idx\` ON \`recipes_method_options\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_markdown\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_markdown_order_idx\` ON \`_recipes_v_blocks_markdown\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_markdown_parent_id_idx\` ON \`_recipes_v_blocks_markdown\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_markdown_path_idx\` ON \`_recipes_v_blocks_markdown\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_image_images\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`src\` text NOT NULL,
    \`alt\` text NOT NULL,
    \`caption\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_image\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_image_images_order_idx\` ON \`_recipes_v_blocks_image_images\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_image_images_parent_id_idx\` ON \`_recipes_v_blocks_image_images\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_image\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`layout_mode\` text,
    \`layout_aspect\` text,
    \`layout_columns\` numeric,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_image_order_idx\` ON \`_recipes_v_blocks_image\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_image_parent_id_idx\` ON \`_recipes_v_blocks_image\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_image_path_idx\` ON \`_recipes_v_blocks_image\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_callout\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`tone\` text,
    \`html\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_callout_order_idx\` ON \`_recipes_v_blocks_callout\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_callout_parent_id_idx\` ON \`_recipes_v_blocks_callout\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_callout_path_idx\` ON \`_recipes_v_blocks_callout\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_steps_items_order_idx\` ON \`_recipes_v_blocks_steps_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_steps_items_parent_id_idx\` ON \`_recipes_v_blocks_steps_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`heading_level\` numeric,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_steps_order_idx\` ON \`_recipes_v_blocks_steps\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_steps_parent_id_idx\` ON \`_recipes_v_blocks_steps\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_steps_path_idx\` ON \`_recipes_v_blocks_steps\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_comparison_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_comparison\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_columns_order_idx\` ON \`_recipes_v_blocks_comparison_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_columns_parent_id_idx\` ON \`_recipes_v_blocks_comparison_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_comparison_rows_values\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_comparison_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_rows_values_order_idx\` ON \`_recipes_v_blocks_comparison_rows_values\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_rows_values_parent_id_idx\` ON \`_recipes_v_blocks_comparison_rows_values\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_comparison_rows\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_comparison\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_rows_order_idx\` ON \`_recipes_v_blocks_comparison_rows\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_rows_parent_id_idx\` ON \`_recipes_v_blocks_comparison_rows\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_comparison\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_order_idx\` ON \`_recipes_v_blocks_comparison\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_parent_id_idx\` ON \`_recipes_v_blocks_comparison\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_comparison_path_idx\` ON \`_recipes_v_blocks_comparison\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_footnotes_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`url\` text NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_footnotes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_footnotes_items_order_idx\` ON \`_recipes_v_blocks_footnotes_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_footnotes_items_parent_id_idx\` ON \`_recipes_v_blocks_footnotes_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_footnotes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_footnotes_order_idx\` ON \`_recipes_v_blocks_footnotes\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_footnotes_parent_id_idx\` ON \`_recipes_v_blocks_footnotes\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_footnotes_path_idx\` ON \`_recipes_v_blocks_footnotes\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe_equipment_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_recipe_equipment\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_equipment_items_order_idx\` ON \`_recipes_v_blocks_recipe_equipment_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_equipment_items_parent_id_idx\` ON \`_recipes_v_blocks_recipe_equipment_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe_equipment\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_equipment_order_idx\` ON \`_recipes_v_blocks_recipe_equipment\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_equipment_parent_id_idx\` ON \`_recipes_v_blocks_recipe_equipment\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe_ingredients_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_recipe_ingredients\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_ingredients_items_order_idx\` ON \`_recipes_v_blocks_recipe_ingredients_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_ingredients_items_parent_id_idx\` ON \`_recipes_v_blocks_recipe_ingredients_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe_ingredients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_ingredients_order_idx\` ON \`_recipes_v_blocks_recipe_ingredients\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_ingredients_parent_id_idx\` ON \`_recipes_v_blocks_recipe_ingredients\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_recipe_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_steps_items_order_idx\` ON \`_recipes_v_blocks_recipe_steps_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_steps_items_parent_id_idx\` ON \`_recipes_v_blocks_recipe_steps_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_steps_order_idx\` ON \`_recipes_v_blocks_recipe_steps\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_steps_parent_id_idx\` ON \`_recipes_v_blocks_recipe_steps\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe_notes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_notes_order_idx\` ON \`_recipes_v_blocks_recipe_notes\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_notes_parent_id_idx\` ON \`_recipes_v_blocks_recipe_notes\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe_tips\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_tips_order_idx\` ON \`_recipes_v_blocks_recipe_tips\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_tips_parent_id_idx\` ON \`_recipes_v_blocks_recipe_tips\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_recipe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_order_idx\` ON \`_recipes_v_blocks_recipe\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_parent_id_idx\` ON \`_recipes_v_blocks_recipe\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_recipe_path_idx\` ON \`_recipes_v_blocks_recipe\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_youtube\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`video_id\` text NOT NULL,
    \`title\` text NOT NULL,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_youtube_order_idx\` ON \`_recipes_v_blocks_youtube\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_youtube_parent_id_idx\` ON \`_recipes_v_blocks_youtube\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_youtube_path_idx\` ON \`_recipes_v_blocks_youtube\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_section_2_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_section_2\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_2_columns_order_idx\` ON \`_recipes_v_blocks_section_2_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_2_columns_parent_id_idx\` ON \`_recipes_v_blocks_section_2_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_section_2\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`layout\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_2_order_idx\` ON \`_recipes_v_blocks_section_2\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_2_parent_id_idx\` ON \`_recipes_v_blocks_section_2\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_2_path_idx\` ON \`_recipes_v_blocks_section_2\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_section_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v_blocks_section\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_columns_order_idx\` ON \`_recipes_v_blocks_section_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_columns_parent_id_idx\` ON \`_recipes_v_blocks_section_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_blocks_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`layout\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_order_idx\` ON \`_recipes_v_blocks_section\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_parent_id_idx\` ON \`_recipes_v_blocks_section\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_blocks_section_path_idx\` ON \`_recipes_v_blocks_section\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_recipes_v_version_method_options\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`method_id\` text NOT NULL,
    \`metadata\` text NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recipes_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_recipes_v_version_method_options_order_idx\` ON \`_recipes_v_version_method_options\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_recipes_v_version_method_options_parent_id_idx\` ON \`_recipes_v_version_method_options\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_markdown\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_markdown_order_idx\` ON \`articles_blocks_markdown\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_markdown_parent_id_idx\` ON \`articles_blocks_markdown\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_markdown_path_idx\` ON \`articles_blocks_markdown\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_image_images\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`src\` text NOT NULL,
    \`alt\` text NOT NULL,
    \`caption\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_image\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_image_images_order_idx\` ON \`articles_blocks_image_images\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_image_images_parent_id_idx\` ON \`articles_blocks_image_images\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_image\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`layout_mode\` text,
    \`layout_aspect\` text,
    \`layout_columns\` numeric,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_image_order_idx\` ON \`articles_blocks_image\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_image_parent_id_idx\` ON \`articles_blocks_image\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_image_path_idx\` ON \`articles_blocks_image\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_callout\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`tone\` text,
    \`html\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_callout_order_idx\` ON \`articles_blocks_callout\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_callout_parent_id_idx\` ON \`articles_blocks_callout\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_callout_path_idx\` ON \`articles_blocks_callout\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_steps_items_order_idx\` ON \`articles_blocks_steps_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_steps_items_parent_id_idx\` ON \`articles_blocks_steps_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`heading_level\` numeric,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_steps_order_idx\` ON \`articles_blocks_steps\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_steps_parent_id_idx\` ON \`articles_blocks_steps\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_steps_path_idx\` ON \`articles_blocks_steps\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_comparison_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_comparison\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_columns_order_idx\` ON \`articles_blocks_comparison_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_columns_parent_id_idx\` ON \`articles_blocks_comparison_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_comparison_rows_values\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_comparison_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_rows_values_order_idx\` ON \`articles_blocks_comparison_rows_values\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_rows_values_parent_id_idx\` ON \`articles_blocks_comparison_rows_values\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_comparison_rows\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`label\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_comparison\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_rows_order_idx\` ON \`articles_blocks_comparison_rows\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_rows_parent_id_idx\` ON \`articles_blocks_comparison_rows\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_comparison\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_order_idx\` ON \`articles_blocks_comparison\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_parent_id_idx\` ON \`articles_blocks_comparison\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_comparison_path_idx\` ON \`articles_blocks_comparison\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_footnotes_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`url\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_footnotes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_footnotes_items_order_idx\` ON \`articles_blocks_footnotes_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_footnotes_items_parent_id_idx\` ON \`articles_blocks_footnotes_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_footnotes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`title\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_footnotes_order_idx\` ON \`articles_blocks_footnotes\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_footnotes_parent_id_idx\` ON \`articles_blocks_footnotes\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_footnotes_path_idx\` ON \`articles_blocks_footnotes\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe_equipment_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_recipe_equipment\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_equipment_items_order_idx\` ON \`articles_blocks_recipe_equipment_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_equipment_items_parent_id_idx\` ON \`articles_blocks_recipe_equipment_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe_equipment\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_equipment_order_idx\` ON \`articles_blocks_recipe_equipment\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_equipment_parent_id_idx\` ON \`articles_blocks_recipe_equipment\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe_ingredients_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_recipe_ingredients\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_ingredients_items_order_idx\` ON \`articles_blocks_recipe_ingredients_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_ingredients_items_parent_id_idx\` ON \`articles_blocks_recipe_ingredients_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe_ingredients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_ingredients_order_idx\` ON \`articles_blocks_recipe_ingredients\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_ingredients_parent_id_idx\` ON \`articles_blocks_recipe_ingredients\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_recipe_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_steps_items_order_idx\` ON \`articles_blocks_recipe_steps_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_steps_items_parent_id_idx\` ON \`articles_blocks_recipe_steps_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_steps_order_idx\` ON \`articles_blocks_recipe_steps\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_steps_parent_id_idx\` ON \`articles_blocks_recipe_steps\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe_notes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_notes_order_idx\` ON \`articles_blocks_recipe_notes\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_notes_parent_id_idx\` ON \`articles_blocks_recipe_notes\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe_tips\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`html\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_tips_order_idx\` ON \`articles_blocks_recipe_tips\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_tips_parent_id_idx\` ON \`articles_blocks_recipe_tips\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_recipe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_order_idx\` ON \`articles_blocks_recipe\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_parent_id_idx\` ON \`articles_blocks_recipe\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_recipe_path_idx\` ON \`articles_blocks_recipe\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_youtube\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`video_id\` text NOT NULL,
    \`title\` text NOT NULL,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_youtube_order_idx\` ON \`articles_blocks_youtube\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_youtube_parent_id_idx\` ON \`articles_blocks_youtube\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_youtube_path_idx\` ON \`articles_blocks_youtube\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_section_2_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_section_2\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_2_columns_order_idx\` ON \`articles_blocks_section_2_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_2_columns_parent_id_idx\` ON \`articles_blocks_section_2_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_section_2\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`layout\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_2_order_idx\` ON \`articles_blocks_section_2\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_2_parent_id_idx\` ON \`articles_blocks_section_2\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_2_path_idx\` ON \`articles_blocks_section_2\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_section_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles_blocks_section\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_columns_order_idx\` ON \`articles_blocks_section_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_columns_parent_id_idx\` ON \`articles_blocks_section_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`articles_blocks_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`layout\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_order_idx\` ON \`articles_blocks_section\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_parent_id_idx\` ON \`articles_blocks_section\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`articles_blocks_section_path_idx\` ON \`articles_blocks_section\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_markdown\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_markdown_order_idx\` ON \`_articles_v_blocks_markdown\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_markdown_parent_id_idx\` ON \`_articles_v_blocks_markdown\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_markdown_path_idx\` ON \`_articles_v_blocks_markdown\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_image_images\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`src\` text NOT NULL,
    \`alt\` text NOT NULL,
    \`caption\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_image\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_image_images_order_idx\` ON \`_articles_v_blocks_image_images\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_image_images_parent_id_idx\` ON \`_articles_v_blocks_image_images\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_image\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`layout_mode\` text,
    \`layout_aspect\` text,
    \`layout_columns\` numeric,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_image_order_idx\` ON \`_articles_v_blocks_image\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_image_parent_id_idx\` ON \`_articles_v_blocks_image\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_image_path_idx\` ON \`_articles_v_blocks_image\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_callout\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`tone\` text,
    \`html\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_callout_order_idx\` ON \`_articles_v_blocks_callout\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_callout_parent_id_idx\` ON \`_articles_v_blocks_callout\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_callout_path_idx\` ON \`_articles_v_blocks_callout\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_steps_items_order_idx\` ON \`_articles_v_blocks_steps_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_steps_items_parent_id_idx\` ON \`_articles_v_blocks_steps_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`heading_level\` numeric,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_steps_order_idx\` ON \`_articles_v_blocks_steps\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_steps_parent_id_idx\` ON \`_articles_v_blocks_steps\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_steps_path_idx\` ON \`_articles_v_blocks_steps\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_comparison_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_comparison\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_columns_order_idx\` ON \`_articles_v_blocks_comparison_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_columns_parent_id_idx\` ON \`_articles_v_blocks_comparison_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_comparison_rows_values\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_comparison_rows\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_rows_values_order_idx\` ON \`_articles_v_blocks_comparison_rows_values\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_rows_values_parent_id_idx\` ON \`_articles_v_blocks_comparison_rows_values\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_comparison_rows\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`label\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_comparison\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_rows_order_idx\` ON \`_articles_v_blocks_comparison_rows\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_rows_parent_id_idx\` ON \`_articles_v_blocks_comparison_rows\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_comparison\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_order_idx\` ON \`_articles_v_blocks_comparison\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_parent_id_idx\` ON \`_articles_v_blocks_comparison\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_comparison_path_idx\` ON \`_articles_v_blocks_comparison\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_footnotes_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`url\` text NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_footnotes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_footnotes_items_order_idx\` ON \`_articles_v_blocks_footnotes_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_footnotes_items_parent_id_idx\` ON \`_articles_v_blocks_footnotes_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_footnotes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_footnotes_order_idx\` ON \`_articles_v_blocks_footnotes\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_footnotes_parent_id_idx\` ON \`_articles_v_blocks_footnotes\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_footnotes_path_idx\` ON \`_articles_v_blocks_footnotes\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe_equipment_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_recipe_equipment\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_equipment_items_order_idx\` ON \`_articles_v_blocks_recipe_equipment_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_equipment_items_parent_id_idx\` ON \`_articles_v_blocks_recipe_equipment_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe_equipment\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_equipment_order_idx\` ON \`_articles_v_blocks_recipe_equipment\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_equipment_parent_id_idx\` ON \`_articles_v_blocks_recipe_equipment\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe_ingredients_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_recipe_ingredients\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_ingredients_items_order_idx\` ON \`_articles_v_blocks_recipe_ingredients_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_ingredients_items_parent_id_idx\` ON \`_articles_v_blocks_recipe_ingredients_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe_ingredients\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_ingredients_order_idx\` ON \`_articles_v_blocks_recipe_ingredients\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_ingredients_parent_id_idx\` ON \`_articles_v_blocks_recipe_ingredients\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe_steps_items\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`item_id\` text NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_recipe_steps\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_steps_items_order_idx\` ON \`_articles_v_blocks_recipe_steps_items\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_steps_items_parent_id_idx\` ON \`_articles_v_blocks_recipe_steps_items\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe_steps\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`section_id\` text NOT NULL,
    \`title\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_steps_order_idx\` ON \`_articles_v_blocks_recipe_steps\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_steps_parent_id_idx\` ON \`_articles_v_blocks_recipe_steps\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe_notes\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_notes_order_idx\` ON \`_articles_v_blocks_recipe_notes\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_notes_parent_id_idx\` ON \`_articles_v_blocks_recipe_notes\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe_tips\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`html\` text,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_recipe\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_tips_order_idx\` ON \`_articles_v_blocks_recipe_tips\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_tips_parent_id_idx\` ON \`_articles_v_blocks_recipe_tips\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_recipe\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_order_idx\` ON \`_articles_v_blocks_recipe\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_parent_id_idx\` ON \`_articles_v_blocks_recipe\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_recipe_path_idx\` ON \`_articles_v_blocks_recipe\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_youtube\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`video_id\` text NOT NULL,
    \`title\` text NOT NULL,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_youtube_order_idx\` ON \`_articles_v_blocks_youtube\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_youtube_parent_id_idx\` ON \`_articles_v_blocks_youtube\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_youtube_path_idx\` ON \`_articles_v_blocks_youtube\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_section_2_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_section_2\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_2_columns_order_idx\` ON \`_articles_v_blocks_section_2_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_2_columns_parent_id_idx\` ON \`_articles_v_blocks_section_2_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_section_2\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`layout\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_2_order_idx\` ON \`_articles_v_blocks_section_2\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_2_parent_id_idx\` ON \`_articles_v_blocks_section_2\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_2_path_idx\` ON \`_articles_v_blocks_section_2\` (\`_path\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_section_columns\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_uuid\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v_blocks_section\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_columns_order_idx\` ON \`_articles_v_blocks_section_columns\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_columns_parent_id_idx\` ON \`_articles_v_blocks_section_columns\` (\`_parent_id\`);`,
  )
  await db.run(sql`CREATE TABLE \`_articles_v_blocks_section\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_path\` text NOT NULL,
    \`id\` integer PRIMARY KEY NOT NULL,
    \`layout\` text,
    \`_uuid\` text,
    \`block_name\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`_articles_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_order_idx\` ON \`_articles_v_blocks_section\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_parent_id_idx\` ON \`_articles_v_blocks_section\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_articles_v_blocks_section_path_idx\` ON \`_articles_v_blocks_section\` (\`_path\`);`,
  )
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`recipes_blocks_markdown\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_image_images\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_image\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_callout\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_comparison_columns\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_comparison_rows_values\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_comparison_rows\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_comparison\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_footnotes_items\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_footnotes\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe_equipment_items\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe_equipment\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe_ingredients_items\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe_ingredients\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe_steps_items\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe_steps\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe_notes\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe_tips\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_recipe\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_youtube\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_section_2_columns\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_section_2\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_section_columns\`;`)
  await db.run(sql`DROP TABLE \`recipes_blocks_section\`;`)
  await db.run(sql`DROP TABLE \`recipes_method_options\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_markdown\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_image_images\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_image\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_callout\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_comparison_columns\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_comparison_rows_values\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_comparison_rows\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_comparison\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_footnotes_items\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_footnotes\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe_equipment_items\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe_equipment\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe_ingredients_items\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe_ingredients\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe_steps_items\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe_steps\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe_notes\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe_tips\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_recipe\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_youtube\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_section_2_columns\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_section_2\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_section_columns\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_blocks_section\`;`)
  await db.run(sql`DROP TABLE \`_recipes_v_version_method_options\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_markdown\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_image_images\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_image\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_callout\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_comparison_columns\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_comparison_rows_values\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_comparison_rows\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_comparison\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_footnotes_items\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_footnotes\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe_equipment_items\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe_equipment\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe_ingredients_items\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe_ingredients\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe_steps_items\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe_steps\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe_notes\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe_tips\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_recipe\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_youtube\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_section_2_columns\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_section_2\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_section_columns\`;`)
  await db.run(sql`DROP TABLE \`articles_blocks_section\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_markdown\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_image_images\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_image\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_callout\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_steps_items\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_steps\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_comparison_columns\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_comparison_rows_values\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_comparison_rows\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_comparison\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_footnotes_items\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_footnotes\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe_equipment_items\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe_equipment\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe_ingredients_items\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe_ingredients\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe_steps_items\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe_steps\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe_notes\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe_tips\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_recipe\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_youtube\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_section_2_columns\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_section_2\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_section_columns\`;`)
  await db.run(sql`DROP TABLE \`_articles_v_blocks_section\`;`)
}
