import { GatsbyNode } from 'gatsby'
import { createFilePath } from 'gatsby-source-filesystem'
import { createFileNodeFromBuffer } from 'gatsby-source-filesystem'
import fs from 'fs'
import path from 'path'

const fileCache = {} as any

// This is normally done by transformer-sharp, but transformer-sharp doesn't work with custom resolvers - loading the images and creating file nodes manually instead:
const resolveImage = async (dependencies: any, node: any) => {
  if (typeof node.frontmatter.image !== 'string') return null

  const imagePath = path.resolve(node.fileAbsolutePath, '..', node.frontmatter.image)

  if (fileCache[imagePath]) return fileCache[imagePath]

  let buffer

  try {
    buffer = await fs.promises.readFile(imagePath)
  } catch (e) {
    return null
  }

  if (!buffer) return null

  const imageName = node.frontmatter.image.split('/').pop().split('.')[0]

  fileCache[imagePath] = createFileNodeFromBuffer({
    buffer: buffer,
    name: imageName,
    ...dependencies,
  })

  return fileCache[imagePath]
}

interface NodeFrontmatter {
  title: string
  parent: string
}

export const onCreateNode: GatsbyNode['onCreateNode'] = async (args) => {
  const { node, getNode, actions } = args;
  const { createNodeField, createNode } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const frontmatter = node.frontmatter as NodeFrontmatter
    const collection = getNode(node.parent || '').sourceInstanceName
    const slug = createFilePath({ node, getNode, basePath: `pages` })
    const paths = slug.split('/').filter(String)
    const lang = paths[0]
    const id = paths[1]

    createNodeField({
      node,
      name: 'collection',
      value: collection,
    })

    createNodeField({
      node,
      name: 'lang',
      value: lang,
    })

    createNodeField({
      node,
      name: 'id',
      value: id,
    })

    if (collection === 'pages') {
      const level = frontmatter.parent ? 1 : 0
      const parent = frontmatter.parent ? '/' + lang + '/' + frontmatter.parent + '/' : ''

      createNodeField({
        node,
        name: 'level',
        value: level,
      })

      createNodeField({
        node,
        name: 'parent',
        value: parent,
      })
    }

    let formattedSlug = slug
    if (collection === 'blogs') {
      formattedSlug = '/blog' + slug
    }
    if (collection === 'dips') {
      formattedSlug = `/${lang}/dips/${slug.split('/')[2].toLowerCase()}/` // /en/dips/dip-0/
    }
    if (collection === 'news') {
      formattedSlug = `/${lang}/news/${slug.split('/')[2].toLowerCase()}/` // /en/news/something
    }
    if (collection === 'playlists') {
      formattedSlug = '/archive/playlists' + slug

      const paths = slug.split('/').filter(String)
      createNodeField({
        node,
        name: 'id',
        value: paths[0],
      })
    }
    if (collection === 'videos') {
      formattedSlug = '/archive/watch' + slug

      const videoPath = slug.slice(1, -1) + '/index'

      const imageFileNode = await resolveImage({ createNode, ...args }, node)

      if (imageFileNode) {
        createNodeField({
          node,
          name: 'image',
          value: imageFileNode
        })
      }

      createNodeField({
        node,
        name: 'path',
        value: videoPath,
      })
    }

    createNodeField({
      node,
      name: 'slug',
      value: formattedSlug,
    })
  }
}
