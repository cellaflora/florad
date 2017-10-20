const webpack = require('webpack');
const keys = require('lodash/keys');
const clone = require('lodash/clone');
const debug = require('debug')('compiler');



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
		const config = clone(this.webpackConfig);
		config.externals = clone(this.webpackConfig.externals);

		config.externals.push((context, request, callback) => {

				if (isModule(request)) {

					debug(`found external '${request}' durring ${this.lambda.debugName} build`);
					externals[request] = null;
					return callback(null, request);

				}
				return callback();

		});

		const compiler = new webpack(config);
		return new Promise((resolve, reject) => {

			debug(`building lambda ${this.lambda.debugName} (${this.lambda.path})`);
			compiler.run((error, stats) => {

				debug(`finished lambda ${this.lambda.debugName}`);
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