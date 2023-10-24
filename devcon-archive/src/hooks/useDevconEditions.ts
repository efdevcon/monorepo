import { useStaticQuery, graphql } from 'gatsby'
import { DevconEdition } from 'src/types/DevconEdition'

export const useDevconEditions = (): Array<DevconEdition> => {
  const data = useStaticQuery(graphql`
    query {
      events: allMarkdownRemark(filter: { fields: { collection: { eq: "devcon" } } }) {
        nodes {
          id
          frontmatter {
            number
            title
            description
            location
            startDate
            endDate
            image {
              childImageSharp {
                gatsbyImageData(layout: FULL_WIDTH)
              }
            }
            image_1 {
              childImageSharp {
                gatsbyImageData(layout: FULL_WIDTH)
              }
            }
            image_2 {
              childImageSharp {
                gatsbyImageData(layout: FULL_WIDTH)
              }
            }
            image_3 {
              childImageSharp {
                gatsbyImageData(layout: FULL_WIDTH)
              }
            }
            image_title {
              childImageSharp {
                gatsbyImageData(layout: FULL_WIDTH)
              }
            }
            urls {
              title
              url
            }
          }
          fields {
            collection
            slug
          }
        }
      }
    }
  `)

  const editions = data.events.nodes.map((i: any) => mapToDevconEdition(i)) as Array<DevconEdition>
  return editions.sort((a, b) => (a.number < b.number ? 1 : -1))
}

function mapToDevconEdition(source: any): DevconEdition {
  const event = {
    id: source.id,
    number: source.frontmatter.number,
    title: source.frontmatter.title,
    description: source.frontmatter.description,
    location: source.frontmatter.location,
    imageUrl: source.frontmatter.imageUrl,
    image: source.frontmatter.image,
    image1: source.frontmatter.image_1,
    image2: source.frontmatter.image_2,
    image3:source.frontmatter.image_3,
    imageTitle: source.frontmatter.image_title,
    links: source.frontmatter.urls
      ? source.frontmatter.urls.map((i: any) => {
          return { title: i.title, url: i.url }
        })
      : [],
  } as DevconEdition

  if (source.frontmatter.startDate) {
    event.startDate = new Date(source.frontmatter.startDate)
  }
  if (source.frontmatter.endDate) {
    event.endDate = new Date(source.frontmatter.endDate)
  }

  return event
}
