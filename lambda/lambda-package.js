const constant = new Date('2017-10-17T18:23:35.534Z');
const crypto = require('crypto');
const fs = require('fs');
const debug = require('../utils/debug')('package');
const archiver = require('archiver');
const path = require('path');
const es = require('event-stream');
const glob = require('glob');



class LambdaPackage {

	constructor (lambda) {
		this.lambda = lambda;
	}


	files () {

		return new Promise((resolve, reject) => {
			glob('**', {
				stat: false,
				dot: true,
				cwd: this.lambda.buildDirectory,
			}, (error, files) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(files);
			});
		});

	}


	package () {

		const lambda = this.lambda;

		debug(`${lambda.debugName}: archiving to ${lambda.archivePath}`);

		const archive = this.files().then(files => {
			return new Promise((resolve, reject) => {

				let finished = false;
				const prefix = path.basename(lambda.buildDirectory);
				const output = fs.createWriteStream(lambda.archivePath);
				const archive = archiver('zip', {
					statConcurrency: 1, // keep archiving determenistic
					zlib: { level: 9}
				});
				const shasum = crypto.createHash('sha256');

				archive.pipe(es.mapSync(chunk => {
					if (Buffer.isBuffer) { shasum.update(chunk) }
					return chunk;
				})).pipe(output);

				output.on('close', () => {
					if (!finished) {

						finished = true;
						lambda.version.hash = shasum.digest('base64');
						debug(`${lambda.debugName}: archiving to ${lambda.archivePath} finished`);
						resolve(lambda);

					}
				});

				archive.on('warning', error => {

					if (error.code === 'ENOENT') {
						console.error(error);
						return;
					}
					finished = true;
					output.destroy();
					reject(error);

				});

				archive.on('error', error => {

					finished = true;
					output.destroy();
					reject(error);

				});

				files.sort(); // keep archiving determenistic
				files.forEach(file => {
					const entry = {
						name: file,
						prefix,
						date: constant, // keep archiving determenistic
					};
					archive.file(path.join(lambda.buildDirectory, file), entry);
				});

				archive.finalize();

			});
		});

		return archive;

	}


	static loadPackage (lambda, performHash = true) {

		return new Promise((resolve, reject) => {

			debug(`${lambda.debugName}: loading ${lambda.archivePath}`);
			fs.readFile(lambda.archivePath, (error, buffer) => {

				debug(`${lambda.debugName}: loading ${lambda.archivePath} finished`);
				if (error) {
					reject(error);
					return;
				}

				if (performHash) {
					const shasum = crypto.createHash('sha256');
					shasum.update(buffer);
					lambda.version.hash = shasum.digest('base64');
				}

				lambda.archive = buffer;
				resolve(lambda);

			});
		});

	}

}



module.exports = LambdaPackage;