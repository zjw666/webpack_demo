const path = require('path');
const MyPlugin = require('./plugins/myPlugins');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    chunkFilename: '[name].bundle.js',
    publicPath: './dist/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: path.resolve(__dirname, 'loaders/myLoader.js'),
            options: {
              funcName: 'myLog'
            }
          }
        ]
      }
    ]
  },
  plugins: [new MyPlugin()]
};