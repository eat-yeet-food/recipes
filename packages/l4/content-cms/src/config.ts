import {
  buildConfig,
  type Access,
  type CollectionConfig,
  type Field,
} from 'payload'
import {
  sqliteD1Adapter,
  type SQLiteAdapterArgs,
} from '@payloadcms/db-d1-sqlite'
import { contentBlocks, methodOptions } from './blocks'
import { contentDetails, authoredField } from './authored-fields'
import { seoShape } from '@eat-yeet/l4-content-model/field-shapes'
import { r2Storage, type R2StorageOptions } from '@payloadcms/storage-r2'

export const deny: Access = () => false
export const isOwner = (user: any, email = process.env.OWNER_EMAIL) =>
  Boolean(email && user?.collection === 'owners' && user.email === email)
export const owner = ({ req }: { req: { user?: unknown } }) => isOwner(req.user)
export const published: Access = ({ req }) =>
  isOwner(req.user) || { status: { equals: 'published' } }
const text = (name: string, extra = {}): Field => ({
  name,
  type: 'text',
  ...extra,
})
const managedFields: Field[] = [
  text('sourceId', {
    required: true,
    unique: true,
    index: true,
    access: { read: owner },
    admin: { hidden: true },
  }),
  text('sourceHash', {
    required: true,
    access: { read: owner },
    admin: { hidden: true },
  }),
  text('gitRevision', { access: { read: owner }, admin: { hidden: true } }),
  {
    name: 'status',
    type: 'select',
    required: true,
    options: ['draft', 'published', 'archived'],
    defaultValue: 'draft',
  },
  {
    name: 'content',
    type: 'json',
    required: true,
    admin: {
      hidden: true,
      description:
        'Validated Git-authored content. Change the source YAML and run content:sync.',
    },
  },
  { name: 'seo', type: 'json', admin: { hidden: true } },
]
const access = {
  admin: owner,
  create: deny,
  read: published,
  update: deny,
  delete: deny,
  readVersions: owner,
}
const contentCollection = (slug: string): CollectionConfig => ({
  slug,
  access,
  admin: {
    useAsTitle: 'title',
    description: 'Read-only Git-managed content',
    hideAPIURL: true,
    defaultColumns: ['title', 'status', 'updatedAt'],
  },
  versions: { maxPerDoc: 20 },
  fields: [
    text('title', { required: true }),
    text('slug', { required: true, unique: true }),
    ...managedFields,
    ...(slug === 'categories'
      ? []
      : [
          contentDetails(slug),
          {
            type: 'tabs',
            tabs: [
              { label: 'Content blocks', fields: [contentBlocks()] },
              ...(slug === 'recipes'
                ? [{ label: 'Recipe methods', fields: [methodOptions] }]
                : []),
              {
                label: 'SEO & sharing',
                fields: [
                  authoredField('searchAppearance', seoShape, 'seo', true),
                ],
              },
            ],
          } as Field,
        ]),
  ].map((field) => ({
    ...field,
    admin: { ...('admin' in field ? field.admin : {}), readOnly: true },
  })) as Field[],
})
export function createCMSConfig(
  bindings: {
    D1: SQLiteAdapterArgs['binding']
    R2: R2StorageOptions['bucket']
  },
  options: {
    secret: string
    origin: string
    migrationDir: string
    push?: boolean
  },
) {
  if (!options.secret || options.secret.length < 32)
    throw new Error('Run pnpm local:setup before starting Payload')
  return buildConfig({
    secret: options.secret,
    serverURL: options.origin,
    csrf: [options.origin],
    cors: [options.origin],
    graphQL: { disable: true },
    telemetry: false,
    admin: {
      user: 'owners',
      autoLogin: false,
      meta: {
        titleSuffix: ' | Eat / Yeet content',
        robots: { index: false, follow: false },
      },
    },
    logger: {
      level: 'warn',
      info() {},
      debug() {},
      trace() {},
      warn: console.warn,
      error: console.error,
      fatal: console.error,
      silent() {},
    } as any,
    db: sqliteD1Adapter({
      binding: bindings.D1,
      push: options.push ?? false,
      migrationDir: options.migrationDir,
    }),
    collections: [
      {
        slug: 'owners',
        hooks: {
          beforeLogin: [
            ({ user }) => {
              if (!isOwner(user)) throw new Error('Owner access required')
              return user
            },
          ],
        },
        admin: { useAsTitle: 'email' },
        auth: {
          tokenExpiration: 7200,
          maxLoginAttempts: 5,
          lockTime: 600000,
          useSessions: true,
          removeTokenFromResponses: true,
          cookies: {
            sameSite: 'Lax',
            secure: options.origin.startsWith('https:'),
          },
        },
        access: {
          admin: owner,
          create: deny,
          read: owner,
          update: deny,
          delete: deny,
        },
        fields: [],
      },
      contentCollection('recipes'),
      contentCollection('articles'),
      contentCollection('categories'),
      {
        slug: 'media',
        access: {
          ...access,
          read: ({ req }) => isOwner(req.user) || { public: { equals: true } },
        },
        admin: {
          useAsTitle: 'filename',
          description: 'Derived from Git source images; no browser uploads.',
        },
        upload: {
          disableLocalStorage: true,
          mimeTypes: ['image/avif', 'image/webp', 'image/jpeg', 'image/png'],
          filesRequiredOnCreate: true,
        },
        fields: [
          text('sourceId', { required: true, unique: true }),
          { name: 'public', type: 'checkbox', defaultValue: false },
          text('alt'),
          { name: 'manifest', type: 'json', required: true },
        ],
      },
    ],
    globals: [
      {
        slug: 'site',
        access: { read: () => true, update: deny, readVersions: owner },
        versions: { max: 20 },
        fields: [
          text('sourceHash', { access: { read: owner } }),
          text('gitRevision', { access: { read: owner } }),
          { name: 'content', type: 'json', required: true },
        ],
      },
    ],
    plugins: [r2Storage({ bucket: bindings.R2, collections: { media: true } })],
    typescript: { autoGenerate: false },
  })
}
