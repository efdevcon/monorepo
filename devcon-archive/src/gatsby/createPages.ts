import { GatsbyNode, CreatePagesArgs, Actions } from 'gatsby'
import path from 'path'

const languages = ['en', 'es']
const defaultLang = 'en'
const english = require(`../content/i18n/en.json`)
const spanish = require(`../content/i18n/es.json`)

export const createPages: GatsbyNode['createPages'] = async (args: CreatePagesArgs) => {
  console.log('createPages', languages, 'default', defaultLang)

  await createPlaylistPages(args)
  await createVideoPages(args)

  // await indexArchive(args)
}

async function createPlaylistPages({ actions, graphql, reporter }: CreatePagesArgs) {
  const result: any = await graphql(`
    query {
      playlists: allMarkdownRemark(filter: { fields: { collection: { eq: "playlists" } } }) {
        nodes {
          fields {
            collection
            slug
          }
          frontmatter {
            tags
          }
        }
      }
    }
  `)

  if (result.errors) {
    reporter.panicOnBuild(`Error while running playlist query.`)
    return
  }

  result.data.playlists.nodes.forEach((node: any) => {
    createDynamicPage(actions, node.fields.slug, 'playlist', 'en', '', node.frontmatter.tags)
  })
}

async function createVideoPages({ actions, graphql, reporter }: CreatePagesArgs) {
  const result: any = await graphql(`
    query {
      playlists: allMarkdownRemark(filter: { fields: { collection: { eq: "videos" } } }) {
        nodes {
          fields {
            collection
            slug
          }
          frontmatter {
            tags
          }
        }
      }
    }
  `)

  if (result.errors) {
    reporter.panicOnBuild(`Error while running playlist query.`)
    return
  }

  result.data.playlists.nodes.forEach((node: any) => {
    createDynamicPage(actions, node.fields.slug, 'video', 'en', '', node.frontmatter.tags)
  })
}

async function indexArchive({ actions, graphql, reporter }: CreatePagesArgs) {
 // Elastic Search is no longer used. Fetch from Devcon API instead.
}

function createDynamicPage(
  actions: Actions,
  slug: string,
  template: string,
  lang: string,
  tag: string = '',
  tags: string[]
): void {
  if (template === 'none') return

  // console.log("Creating page", slug, 'with template:', template, lang);
  const { createPage } = actions

  const tagsRegex = (() => {
    if (tags) {
      const asString = tags.reduce((acc, tag) => {
        if (acc === '') return `${tag}`

        return `${acc}|${tag}`
      }, '')

      // Just returning a regex that won't match anything since an empty regex matches everything with the graphql regex operator
      if (asString === '') return '/^abc12345/'

      return `/${asString}/`
    }
  })()

  createPage({
    path: slug,
    component: path.resolve(`./src/components/domain/page-templates/${template}.tsx`),
    context: {
      tags: tagsRegex, // Can't pass arrays as arguments to the graphql query, so have to use regex to simulate the in operator
      slug: slug,
      tag: tag,
      lang: lang,
      language: lang, // Merge with lang (language is better because gatsby-intl-plugin writes to the language key)
      intl: {
        language: lang,
        languages: languages,
        messages: lang === 'es' ? spanish : english,
        routed: true,
        redirect: false,
      },
    },
  })
}
