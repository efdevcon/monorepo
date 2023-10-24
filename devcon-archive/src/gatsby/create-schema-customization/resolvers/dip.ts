export const dip = (direction: string) => ({
  type: 'String',
  resolve: (source: any, { language }: any, context: any) => {
    const currentDIPNumber = source.DIP

    const isFirstDIP = currentDIPNumber === 0

    if (isFirstDIP && direction === 'prev') {
      return `/${language}/dips/`
    }

    return context.nodeModel
      .runQuery({
        query: {
          filter: {
            fields: {
              collection: {
                eq: 'dips',
              },
              lang: {
                eq: language,
              },
            },
            // frontmatter: {
            //   DIP: {
            //     eq: currentDIPNumber + (direction === 'next' ? 1 : -1)
            //   }
            // }
          },
        },
        // firstOnly: true,
        type: 'MarkdownRemark',
      })
      .then((DIPs: any) => {
        // DIPs don't necessarily exist sequentially, so we can't just check the prev/next DIP by number (e.g. DIP 7 could be missing, while DIP 6 and 8 exist)
        // We have to query all DIPs and then traverse until we find the next/prev one, rather than immediately querying for the next DIP number
        let DIPToLinkTo: any

        DIPs.forEach((DIP: any) => {
          const DIPNumber = DIP.frontmatter.DIP

          if (direction === 'next') {
            if (DIPNumber > currentDIPNumber) {
              if (typeof DIPToLinkTo === 'undefined') {
                DIPToLinkTo = DIP
              } else if (DIPNumber < DIPToLinkTo.frontmatter.DIP) {
                DIPToLinkTo = DIP
              }
            }
          } else {
            if (DIPNumber < currentDIPNumber) {
              if (typeof DIPToLinkTo === 'undefined') {
                DIPToLinkTo = DIP
              } else if (DIPNumber > DIPToLinkTo.frontmatter.DIP) {
                DIPToLinkTo = DIP
              }
            }
          }
        })

        if (DIPToLinkTo) {
          return DIPToLinkTo.fields.slug
        }

        return null
      })
  },
  args: {
    language: {
      type: 'String!',
    },
  },
})
