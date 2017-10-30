const webpack = require('webpack');
const keys = require('lodash/keys');
const clone = require('lodash/clone');
const debug = require('../debug')('compiler');



class LambdaCompiler {

	constructor (lambda) {

		this.lambda = lambda;
		this.webpackConfig = {
			entry: lambda.path,
			target: 'node',
			output: {
				path: lambda.buildDirectory,
				library: lambda.name,
				libraryTarget: 'commonjs2',
				filename: `${lambda.name}.js`,
			},
			module: {
				loaders: [{
					test: /\.js$/,
					exclude: /node_modules/,
					loader: 'babel-loader',
					query: { presets: ['babel-preset-env'] }
				}],
			},
			plugins: [],
			externals: [],
		};

	}


	run () {

		const isModule = req => /^(\/|\.\/|\.\.\/|.*!)/.exec(req) === null;
		const externals = {};

		let config = clone(this.webpackConfig);
		if (typeof this.lambda.prewebpack === 'function') {
			config = this.lambda.prewebpack(config);
		}
		config.externals = clone(this.webpackConfig.externals);
		config.plugins = clone(this.webpackConfig.plugins);

		config.externals.push((context, request, callback) => {

				if (isModule(request)) {

					debug(`${this.lambda.debugName}: found external '${request}' durring build`);
					externals[request] = null;
					return callback(null, request);

				}
				return callback();

		});

		const env = this.lambda.environment;
		keys(env).forEach(name => {

			env[name] = JSON.stringify(env[name]);
			debug(`${this.lambda.debugName}: define ${name}=${env[name]}`);

		});
		config.plugins.push(new webpack.DefinePlugin(env))

		const compiler = new webpack(config);
		return new Promise((resolve, reject) => {

			debug(`${this.lambda.debugName}: building lambda (${this.lambda.path})`);
			compiler.run((error, stats) => {

				debug(`${this.lambda.debugName}: finished lambda`);
				if (error) {
					reject(error);
					return;
				}
				this.lambda.externals = keys(externals);
				resolve(this.lambda);

			});

		});

	}

}



module.exports = LambdaCompiler;