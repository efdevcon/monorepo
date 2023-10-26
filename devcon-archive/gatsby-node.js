const path = require('path')

exports.onCreateWebpackConfig = ({ stage, actions, getConfig }) => {
  // Get the current webpack config
  const config = getConfig()

  // Custom modifications to the webpack config
  actions.setWebpackConfig({
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        lib: path.resolve(__dirname, '..', 'lib'),
      },
      modules: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, 'src'), 'node_modules'],
    },
  })
}
