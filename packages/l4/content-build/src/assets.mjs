import { readFileSync, realpathSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isAbsolute, relative, resolve } from 'node:path'

export function isInside(path, root) {
  const rel = relative(root, path)
  return rel === '' || (rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel))
}

/** Local filenames must stay inside the supplied image directory, including symlinks. */
function imageVersion(imagesDir, file, source) {
  if (typeof file !== 'string' || !file || /[\\%?#\u0000]/.test(file) || file.split('/').includes('..')) {
    throw new Error(`${source}: invalid local image ${JSON.stringify(file)}`)
  }
  const path = resolve(imagesDir, file)
  if (!isInside(path, imagesDir)) throw new Error(`${source}: image escapes images directory: ${file}`)
  try {
    if (!isInside(realpathSync(path), realpathSync(imagesDir))) throw new Error('symlink escapes images directory')
    if (!statSync(path).isFile()) throw new Error('expected an image file')
    return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8)
  } catch (error) {
    throw new Error(`${source}: image ${file}: ${error.message}`, { cause: error })
  }
}

function versionBlocks(blocks, imagesDir, source) {
  return blocks.map((block) => {
    if (block.type === 'section') return {
      ...block,
      columns: block.columns.map((column) => ({ ...column, blocks: versionBlocks(column.blocks, imagesDir, source) })),
    }
    if (block.type !== 'image') return block
    return { ...block, images: block.images.map((image) => {
      // Existing content permits remote HTTP images and data images. Neither is read by the build.
      if (/^https?:\/\//i.test(image.src) || image.src.startsWith('data:image/')) return image
      const file = image.src.startsWith('/images/') ? image.src.slice('/images/'.length) : image.src
      return { ...image, imageHash: imageVersion(imagesDir, file, source) }
    }) }
  })
}

export function versionContent(content, imagesDir, collection) {
  const source = `${collection}/${content.slug}`
  return {
    ...content,
    imageHash: content.image ? imageVersion(imagesDir, content.image, source) : '',
    blocks: versionBlocks(content.blocks, imagesDir, source),
    ...(collection === 'recipes' ? { methodOptions: content.methodOptions.map((method) => ({
      ...method, blocks: versionBlocks(method.blocks, imagesDir, source),
    })) } : {}),
  }
}
