const { merge } = require('webpack-merge');
const webpack = require('webpack');
const base = require('./webpack.config.base.js');

module.exports = (env, argv) =>
	merge(base(env, argv), {
		devtool: 'eval-source-map',
		plugins: [
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify('development'),
				'process.env.HASH': Date.now(),
			}),
		],

		// watcher
		devServer: {
			static: {
				directory: './dist',
			},
			hot: true,
			port: 80,
		},
	});
