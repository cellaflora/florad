const Zip = require("adm-zip");
const constant = new Date('2017-10-17T18:23:35.534Z');
const crypto = require('crypto');
const fs = require('fs');
const debug = require('debug')('package');



class LambdaPackage {

	constructor (lambda) {
		this.lambda = lambda;
	}


	package () {

		const lambda = this.lambda;

		debug(`archiving ${lambda.debugName} to ${lambda.archivePath}`);

		const zip = new Zip();
		zip.addLocalFolder(lambda.buildDirectory);
		zip.getEntries().forEach(e => e.header.time = constant);

		const shasum = crypto.createHash('sha256');
		const buffer = zip.toBuffer();
		shasum.update(buffer);

		zip.writeZip(lambda.archivePath);

		debug(`archiving ${lambda.debugName} to ${lambda.archivePath} finished`);

		lambda.version.hash = shasum.digest('base64');
		lambda.archive = buffer;

		return Promise.resolve(lambda);

	}


	static loadPackage (lambda) {

		return new Promise((resolve, reject) => {

			debug(`loading ${lambda.archivePath} for ${lambda.debugName}`);
			fs.readFile(lambda.archivePath, (error, buffer) => {

				debug(`loading ${lambda.archivePath} for ${lambda.debugName} finished`);
				if (error) {
					reject(error);
					return;
				}

				const shasum = crypto.createHash('sha256');
				shasum.update(buffer);

				lambda.version.hash = shasum.digest('base64');
				lambda.archive = buffer;
				resolve(lambda);

			});
		});

	}

}



module.exports = LambdaPackage;