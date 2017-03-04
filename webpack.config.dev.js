const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = {
  // devtool: 'eval-source-map',
  // 進入點，從哪裡開始包。可用相對路徑
  entry: './web_src/index.js',
  // 包完要放到哪裡
  output: {
    // path 一定要用絕對路徑
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    // url-loader & file-loader 會使用這個位置
    publicPath: './',
  },
  module: {
    rules: [
      {
        use: 'babel-loader',
        exclude: /node_modules/,
        test: /\.js$/,
      },
      {
        use: ['style-loader', 'css-loader'],
        // loader: ExtractTextPlugin.extract({
        //   loader: 'css-loader',
        // }),
        test: /\.css$/,
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/,
        use: [
          {
            loader: 'url-loader',
            options: { limit: 40000 }, // byte
          },
          'image-webpack-loader',
        ],
      },
      {
        test: /\.(woff2?|eot|ttf)$/,
        use: [
          {
            loader: 'url-loader',
            options: { limit: 40000 }, // byte
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    // new ExtractTextPlugin('[name].css'),
    new HtmlWebpackPlugin({
      template: './web_src/index.html',
    }),
  ],
};

module.exports = config;
