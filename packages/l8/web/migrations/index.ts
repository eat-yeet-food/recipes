import * as migration_20260912_104559_initial from './20260912_104559_initial';
import * as migration_20260912_111359_shared_blocks from './20260912_111359_shared_blocks';
import * as migration_20260912_115557_named_content_fields from './20260912_115557_named_content_fields';
import * as migration_20260921_110936_recipe_ratings from './20260921_110936_recipe_ratings';
import * as migration_20260922_103348_recipe_rating_reviews from './20260922_103348_recipe_rating_reviews';
import * as migration_20260922_111220_recipe_rating_identities_and_replies from './20260922_111220_recipe_rating_identities_and_replies';
import * as migration_20260927_122353_member_accounts from './20260927_122353_member_accounts';

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
    name: '20260927_122353_member_accounts'
  },
];
