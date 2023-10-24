export const profileResolver = {
  type: '[Profile]',
  resolve: (source: any, { language }: any, context: any) => {
    let profiles = []
    if (source['curators']) profiles = source['curators']
    if (source['speakers']) profiles = source['speakers']

    let lang = 'en'
    if (language) lang = language

    const filter: any = {
      fields: {
        collection: {
          eq: 'profiles',
        },
      },
      frontmatter: {
        name: {
          in: profiles,
        },
      },
    }

    if (lang) {
      filter.fields.lang = {
        eq: lang,
      }
    }

    return context.nodeModel
      .runQuery({
        query: {
          filter,
        },
        type: 'MarkdownRemark',
      })
      .then((items: any) => {
        return items.map((i: any) => {
          return {
            id: i.id,
            slug: i.fields.slug,
            lang: i.fields.lang,
            name: i.frontmatter.name,
            role: i.frontmatter.role,
            description: i.frontmatter.description,
            imageUrl: i.frontmatter.imageUrl,
          }
        })
      })
  },
  args: {
    language: 'String',
  },
}
