const Lambda = require('../../lambda');



module.exports = function (project) {

	project.lambdas = [];

	project.defineLambda = def => {
		project.lambdas.push(new Lambda(project, def))
	};

	project.task('lambda:build', configure => {

		project.lambdas.forEach(lambda => {

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

		return project.lambdas.map(lambda => () => lambda.build());

	});


	project.task('lambda:deploy', configure => {

		return project.lambdas.map(lambda => (...args) => lambda.deploy(...args));

	});

};