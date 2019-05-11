'use strict';

const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {

  entry: './src/index.js',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: './',
    filename: 'project.bundle.js'
  },

  module: {
    rules: [{
      test: [/\.vert$/, /\.frag$/],
      use: 'raw-loader'
    }]
  },

  plugins: [

    new webpack.DefinePlugin({
      'CANVAS_RENDERER': JSON.stringify(true),
      'WEBGL_RENDERER': JSON.stringify(true)
    }),
    new CopyWebpackPlugin([
      { from: 'public' },
    ]),
  ]

};
