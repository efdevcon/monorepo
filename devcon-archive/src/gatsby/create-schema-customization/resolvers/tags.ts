export const tagsResolver = {
  type: '[Tag]',
  resolve: (source: any, { language }: any, context: any) => {
    const pageTags = source['tags']
    if (!pageTags) return []

    const filter: any = {
      fields: {
        collection: {
          eq: 'tags',
        },
        id: {
          in: pageTags,
        },
      },
    }
    if (language) {
      filter.fields.lang = {
        eq: language,
      }
    }

    return context.nodeModel
      .runQuery({
        query: {
          filter,
        },
        type: 'MarkdownRemark',
      })
      .then((tags: any) => {
        return tags.map((i: any) => {
          return {
            id: i.id,
            slug: i.fields.id,
            title: i.frontmatter.title,
            lang: i.fields.lang,
          }
        })
      })
  },
  args: {
    language: {
      type: 'String',
    },
  },
}

export const tagCountResolver = {
  type: 'Int',
  resolve: (source: any) => {
    const pageTags = source['tags']
    if (!pageTags) return 0
    return pageTags.length
  },
}
