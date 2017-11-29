const webpack = require('webpack');
const keys = require('lodash/keys');
const clone = require('lodash/clone');
const debug = require('../../utils/debug')('compiler');



class LambdaCompiler {

	static webpackConfig (lambda) {

		return {
			entry: lambda.paths.entry,
			target: 'node',
			output: {
				path: lambda.paths.lambda,
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


	static compile (lambda) {

		const isModule = req =>
			/^(\/|\.\/|\.\.\/|.*!)/.exec(req) === null &&
			require.resolve(req) != req;

		const externals = {};

		let config = LambdaCompiler.webpackConfig(lambda);

		if (typeof lambda.prewebpack === 'function') {
			config = lambda.prewebpack(config);
		}

		config.externals = clone(config.externals);
		config.plugins = clone(config.plugins);


		config.externals.push((context, request, callback) => {

				if (isModule(request)) {

					debug(`${lambda.debugName}: found external '${request}' durring build`);
					externals[request] = null;
					return callback(null, request);

				}
				return callback();

		});


		const env = lambda.environment;
		keys(env).forEach(name => {

			env[name] = JSON.stringify(env[name]);
			debug(`${lambda.debugName}: define ${name}=${env[name]}`);

		});
		config.plugins.push(new webpack.DefinePlugin(env));


		return new Promise((resolve, reject) => {

			new webpack(config).run((error, stats) => {

				if (error) {
					reject(error);
					return;
				}
				resolve({ externals: keys(externals) });

			});

		});

	}

}



module.exports = LambdaCompiler;