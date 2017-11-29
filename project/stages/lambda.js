const Lambda = require('../../lambda');



module.exports = function (project) {

	project.lambdas = [];

	project.defineLambda = def => {
		project.lambdas.push(new Lambda(project, def))
	};


	const setConfigurationOnLambdas = function(lambdas, configure) {
		lambdas.forEach(lambda => {

			if (configure && configure.hasOwnProperty('environment')) {
				Object.assign(lambda.environment, configure.environment);
			}

			if (configure &&
				configure.hasOwnProperty('defaults') &&
				configure.defaults.hasOwnProperty('lambda'))
			{
				lambda.mergeConfiguration(configure.defaults.lambda);
			}

		});
	}

	project.task('lambda:build', configure => {

		setConfigurationOnLambdas(project.lambdas, configure);

		return project.lambdas.map(lambda => () => lambda.build());

	});


	project.task('lambda:deploy', configure => {

		setConfigurationOnLambdas(project.lambdas, configure);

		return project.lambdas.map(lambda => (...args) => lambda.deploy(...args));

	});

};
