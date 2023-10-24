import { Link } from 'src/types/Link'

type UnresolvedLink = {
  slug: string
  type: string
  title: string
  url: string
  links?: UnresolvedLink[]
}

const linkResolver = async (linkData: UnresolvedLink, language: string, context: any): Promise<null | Link> => {
  // console.log("LinkResolver", linkData.type, linkData.slug);

  switch (linkData && linkData.type) {
    case 'links': {
      return context.nodeModel
        .runQuery({
          query: {
            filter: {
              fields: {
                collection: {
                  eq: 'headers',
                },
                slug: {
                  eq: `/${language}/${linkData.slug}/`,
                },
              },
            },
          },
          firstOnly: true,
          type: 'MarkdownRemark',
        })
        .then(async (page: any) => {
          if (!page) return Promise.resolve(null)
          if (!linkData.links || linkData.links.length === 0) return Promise.resolve(null)

          const promises = linkData.links.map((i: UnresolvedLink) => {
            return linkResolver(i, language, context)
          })

          const links = await Promise.all(promises).then(links => {
            return links.filter((item): item is Link => item !== null)
          })

          const link: Link = {
            type: linkData.type,
            title: page.frontmatter.title,
            url: '',
            links: links,
          }

          return Promise.resolve(link)
        })
    }

    case 'header': {
      return context.nodeModel
        .runQuery({
          query: {
            filter: {
              fields: {
                collection: {
                  eq: 'headers',
                },
                slug: {
                  eq: `/${language}/${linkData.slug}/`,
                },
              },
            },
          },
          firstOnly: true,
          type: 'MarkdownRemark',
        })
        .then((page: any) => {
          if (!page) return null

          return {
            type: linkData.type,
            title: page.frontmatter.title,
            url: '#',
            links: [],
          }
        })
    }

    case 'link': {
      return context.nodeModel
        .runQuery({
          query: {
            filter: {
              fields: {
                collection: {
                  eq: 'links',
                },
                slug: {
                  eq: `/${language}/${linkData.slug}/`,
                },
              },
            },
          },
          firstOnly: true,
          type: 'MarkdownRemark',
        })
        .then((page: any) => {
          if (!page) return null

          return {
            type: linkData.type,
            title: page.frontmatter.title,
            url: page.frontmatter.url,
            links: [],
          }
        })
    }

    case 'page': {
      return context.nodeModel
        .runQuery({
          query: {
            filter: {
              fields: {
                collection: {
                  eq: 'pages',
                },
                slug: {
                  eq: `/${language}/${linkData.slug}/`,
                },
              },
            },
          },
          firstOnly: true,
          type: 'MarkdownRemark',
        })
        .then((page: any) => {
          if (!page) return null

          return {
            type: linkData.type,
            title: page.frontmatter.title,
            url: page.fields.slug,
            links: [],
          }
        })
    }
  }

  return Promise.resolve(null)
}

export const links = {
  type: '[Link]',
  resolve: (source: any, { language }: any, context: any, info: any) => {
    const links = source[info.fieldName]

    if (!links) return []

    const promises = links.map((linkData: UnresolvedLink) => {
      return linkResolver(linkData, language, context)
    })

    return Promise.all(promises).then(links => {
      return links.filter(link => !!link)
    })
  },
  args: {
    language: {
      type: 'String!',
    },
  },
}

// Singular link resolver
export const link = {
  type: 'Link',
  resolve: (source: any, { language }: any, context: any, info: any) => {
    return linkResolver(source, language, context)
  },
  args: {
    language: {
      type: 'String!',
    },
  },
}
