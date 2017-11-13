const fs = require('fs');


class LambdaDeploy {

	static deploy (lambda, {force = false, useS3 = false}) {

		if (!force && lambda.version.isResolved && !lambda.version.isNewiest) {
			return Promise.resolve(false);
		}

		let preamble = Promise.resolve();
		if (useS3) {

			const stream = fs.createReadStream(lambda.paths.archive);
			preamble = lambda.uploadToS3(stream);

		}

		return preamble.then(() => 
			lambda.version.isFirstDeployed
				? lambda.createFunction(lambda.archive)
				: lambda.updateFunctionCode(lambda.archive)
		).then(() => true);

	}

}



module.exports = LambdaDeploy;