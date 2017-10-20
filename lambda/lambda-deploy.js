const debug = require('debug')('deploy');


class LambdaDeploy {

	constructor (lambda) {
		this.lambda = lambda;
	}


	deploy ({force = false}) {

		const lambda = this.lambda;
		const fetchVersions = this.lambda.fetchVersions();

		fetchVersions.then(() => {

			// should we deploy?
			const isFirstDeploy = lambda.versions.length === 0;

			if (!isFirstDeploy && !force) {

				const isNewiest = lambda.versions.every(prev => {
					if (prev.hash === lambda.version.hash && !prev.arn.endsWith('$LATEST')) {
						lambda.version = prev;
						return false;
					}
					return true;
				});

				if (!isNewiest) {

					debug(`found previous versions of ${lambda.debugName}`);
					debug(`skipping ${lambda.debugName} deploy (${lambda.version.arn})`);
					return Promise.resolve(lambda);

				}

			}

			return isFirstDeploy
				? lambda.createFunction(lambda.archive)
				: lambda.updateFunctionCode(lambda.archive);

		});

		return fetchVersions;

	}

}



module.exports = LambdaDeploy;