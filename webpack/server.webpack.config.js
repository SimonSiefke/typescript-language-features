const withDefaults = require('./shared.webpack.config')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin

module.exports = withDefaults({
  context: path.join(__dirname, '../packages/server'),
  entry: {
    serverMain: './src/serverMain.ts'
  },
  optimization: {
    splitChunks: {
      minSize: 0,
      cacheGroups: {
        'vscode-dependencies': {
          test: /node_modules\/(vscode|semver)/,
          chunks: 'all',
          name: 'vscode-dependencies'
        },
        dependencies: {
          test: /node_modules\/(source-map|source-map-support|typescript)/,
          chunks: 'all',
          name: 'dependencies'
        }
      }
    }
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '../dist', 'packages/server/dist')
  }
  // plugins: [new BundleAnalyzerPlugin()],
})
