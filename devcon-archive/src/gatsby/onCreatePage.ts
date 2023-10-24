import { GatsbyNode } from 'gatsby'

export const onCreatePage: GatsbyNode['onCreatePage'] = ({ page, actions }) => {
  const { createPage } = actions

  // Wildcard /app pages for client-side rendering
  if (page.path.match(/^\/app/)) {
    page.matchPath = `/app/*`

    createPage(page)
  }

  // const { createPage, deletePage } = actions
  // // Detects the index page, not sure where news lives yet
  // // if (['/', '/en/', '/es/'].includes(page.path)) {
  // if (['/en/hero', '/es/hero'].includes(page.path)) {
  //   deletePage(page)
  //   createPage({
  //     ...page,
  //     context: {
  //       ...page.context,
  //       withNews: true,
  //     },
  //   })
  // } else {
  //   deletePage(page)
  //   createPage({
  //     ...page,
  //     context: {
  //       ...page.context,
  //       withNews: false,
  //     },
  //   })
  // }
}
