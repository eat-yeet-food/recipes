import * as migration_20260912_104559_initial from './20260912_104559_initial';
import * as migration_20260912_111359_shared_blocks from './20260912_111359_shared_blocks';
import * as migration_20260912_115557_named_content_fields from './20260912_115557_named_content_fields';

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
    name: '20260912_115557_named_content_fields'
  },
];
