import * as migration_20260912_104559_initial from './20260912_104559_initial';
import * as migration_20260912_111359_shared_blocks from './20260912_111359_shared_blocks';
import * as migration_20260912_115557_named_content_fields from './20260912_115557_named_content_fields';
import * as migration_20260921_110936_recipe_ratings from './20260921_110936_recipe_ratings';
import * as migration_20260922_103348_recipe_rating_reviews from './20260922_103348_recipe_rating_reviews';
import * as migration_20260922_111220_recipe_rating_identities_and_replies from './20260922_111220_recipe_rating_identities_and_replies';
import * as migration_20260927_122353_member_accounts from './20260927_122353_member_accounts';
import * as migration_20261019_114245_kitchen_formulas from './20261019_114245_kitchen_formulas';
import * as migration_20261104_005309_sourdough_bulk_temperature from './20261104_005309_sourdough_bulk_temperature';
import * as migration_20261104_202227_sourdough_bench_minutes from './20261104_202227_sourdough_bench_minutes';
import * as migration_20261105_123019_sourdough_preshape_and_shape from './20261105_123019_sourdough_preshape_and_shape';
import * as migration_20261110_133831_recipe_time_labels from './20261110_133831_recipe_time_labels';
import * as migration_20261111_010506_recipe_step_uses from './20261111_010506_recipe_step_uses';
import * as migration_20261111_173221_member_native_grants from './20261111_173221_member_native_grants';

export const migrations = [
  {
    up: migration_20260912_104559_initial.up,
    down: migration_20260912_104559_initial.down,
    name: '20260912_104559_initial',
  },
  {
    up: migration_20260912_111359_shared_blocks.up,
    down: migration_20260912_111359_shared_blocks.down,
    name: '20260912_111359_shared_blocks',
  },
  {
    up: migration_20260912_115557_named_content_fields.up,
    down: migration_20260912_115557_named_content_fields.down,
    name: '20260912_115557_named_content_fields',
  },
  {
    up: migration_20260921_110936_recipe_ratings.up,
    down: migration_20260921_110936_recipe_ratings.down,
    name: '20260921_110936_recipe_ratings',
  },
  {
    up: migration_20260922_103348_recipe_rating_reviews.up,
    down: migration_20260922_103348_recipe_rating_reviews.down,
    name: '20260922_103348_recipe_rating_reviews',
  },
  {
    up: migration_20260922_111220_recipe_rating_identities_and_replies.up,
    down: migration_20260922_111220_recipe_rating_identities_and_replies.down,
    name: '20260922_111220_recipe_rating_identities_and_replies',
  },
  {
    up: migration_20260927_122353_member_accounts.up,
    down: migration_20260927_122353_member_accounts.down,
    name: '20260927_122353_member_accounts',
  },
  {
    up: migration_20261019_114245_kitchen_formulas.up,
    down: migration_20261019_114245_kitchen_formulas.down,
    name: '20261019_114245_kitchen_formulas',
  },
  {
    up: migration_20261104_005309_sourdough_bulk_temperature.up,
    down: migration_20261104_005309_sourdough_bulk_temperature.down,
    name: '20261104_005309_sourdough_bulk_temperature',
  },
  {
    up: migration_20261104_202227_sourdough_bench_minutes.up,
    down: migration_20261104_202227_sourdough_bench_minutes.down,
    name: '20261104_202227_sourdough_bench_minutes',
  },
  {
    up: migration_20261105_123019_sourdough_preshape_and_shape.up,
    down: migration_20261105_123019_sourdough_preshape_and_shape.down,
    name: '20261105_123019_sourdough_preshape_and_shape',
  },
  {
    up: migration_20261110_133831_recipe_time_labels.up,
    down: migration_20261110_133831_recipe_time_labels.down,
    name: '20261110_133831_recipe_time_labels',
  },
  {
    up: migration_20261111_010506_recipe_step_uses.up,
    down: migration_20261111_010506_recipe_step_uses.down,
    name: '20261111_010506_recipe_step_uses',
  },
  {
    up: migration_20261111_173221_member_native_grants.up,
    down: migration_20261111_173221_member_native_grants.down,
    name: '20261111_173221_member_native_grants'
  },
];
