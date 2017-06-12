var webpack = require('webpack');

module.exports = {
  entry: './index.js',

  output: {
    filename: 'bundle.js',
    publicPath: ''
  },

  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader?presets[]=es2015&presets[]=react' },
      { test: /\.css$/, loader: "style-loader!css-loader" },
      { test: /\.(html|eot|svg|ttf|woff|woff2)$/, loader: "file-loader?name=[name].[ext]" }
    ]
  },

	plugins: [
    new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery"
    })
	]
}
