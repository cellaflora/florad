const fs = require('fs');
const debug = require('../utils/debug')('deploy');


class LambdaDeploy {

	constructor (lambda) {
		this.lambda = lambda;
	}


	deploy ({force = false, useS3 = false}) {

		const lambda = this.lambda;
		const fetchVersions = lambda.fetchVersions();

		const doDeploy = fetchVersions.then(() => {

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

					debug(`${lambda.debugName}: found previous versions`);
					debug(`${lambda.debugName}: skipping deploy (${lambda.version.arn})`);
					return Promise.resolve(this);

				}

			}

			if (useS3) {

				const stream = fs.createReadStream(lambda.archivePath);
				return lambda.uploadToS3(stream).then(() => {
					return isFirstDeploy
						? lambda.createFunction()
						: lambda.updateFunctionCode()
							.then(() => lambda.updateConfiguration());
				});	

			}

			return isFirstDeploy
				? lambda.createFunction(lambda.archive)
				: lambda.updateFunctionCode(lambda.archive)
					.then(() => lambda.updateConfiguration());

		});

		return doDeploy;

	}

}



module.exports = LambdaDeploy;