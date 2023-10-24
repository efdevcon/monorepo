import { GatsbyNode } from 'gatsby'
import { onCreateNode as onCreateNodePlugin } from './onCreateNode'
import { createPages as createPagesPlugin } from './createPages'
import { onCreatePage as onCreatePagePlugin } from './onCreatePage'
import { sourceNodes as sourceNodesPlugin } from './sourceNodes'
import { createSchemaCustomization as createSchemaCustomizationPlugin } from './create-schema-customization/createSchemaCustomization'
import { createResolvers as createResolversPlugin } from './createResolvers'

export const onCreateNode: GatsbyNode['onCreateNode'] = onCreateNodePlugin
export const createPages: GatsbyNode['createPages'] = createPagesPlugin
export const onCreatePage: GatsbyNode['onCreatePage'] = onCreatePagePlugin
export const sourceNodes: GatsbyNode['sourceNodes'] = sourceNodesPlugin
export const createResolvers: any = createResolversPlugin
export const createSchemaCustomization: any = createSchemaCustomizationPlugin // Type issue: https://github.com/gatsbyjs/gatsby/issues/27096

// Ordering doesn't matter since we're using scoped/prefixed classes, which means we can safely ignore order (prevents warnings in build step)
// https://stackoverflow.com/questions/63124432/how-do-i-configure-mini-css-extract-plugin-in-gatsby
const ignoreCSSOrder = ({ stage, actions, getConfig }: any) => {
  const config = getConfig()
  const miniCssExtractPlugin = config.plugins.find((plugin: any) => plugin.constructor.name === 'MiniCssExtractPlugin')
  if (miniCssExtractPlugin) {
    miniCssExtractPlugin.options.ignoreOrder = true
  }
  actions.replaceWebpackConfig(config)
}

export const onCreateWebpackConfig = (args: any) => {
  ignoreCSSOrder(args)
}
