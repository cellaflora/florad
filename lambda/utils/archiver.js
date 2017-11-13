const CONSTANT = new Date('2017-10-17T18:23:35.534Z');
const glob = require('glob');
const archiver = require('archiver');
const es = require('event-stream');
const once = require('lodash/once');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');



function find (cwd) {

	return new Promise((resolve, reject) => {
		glob('**',
			{ stat: false, dot: true, cwd: cwd,},
			(error, files) => error? reject(error): resolve(files.sort()));
	});
	
};


exports.archive = function archive (from, to) {

	let completed = false;
	const prefix = path.basename(from);

	const output = fs.createWriteStream(to);
	// concurrency must be serial to give determenistic results
	const archive = archiver('zip', { statConcurrency: 1, zlib: { level: 9 } });

	let size = 0;
	const shasum = crypto.createHash('sha256');
	const doSum = chunk => {
		if (Buffer.isBuffer(chunk)) {
			size += chunk.length;
			shasum.update(chunk);
		}
		return chunk;
	};

	archive.pipe(es.mapSync(doSum)).pipe(output);


	return new Promise((resolve, reject) => {

		resolve = once(resolve);
		reject = once(reject);

		output.on('close', () => {
			const hash = shasum.digest('base64');
			resolve(hash);
		});

		archive.on('warning', error => {

			if (error.code === 'ENOENT') {
				console.error(error);
				return;
			}
			output.destroy();
			reject(error);

		});

		archive.on('error', error => {
			output.destroy();
			reject(error);
		});

		find(from).then(files => {

			files.forEach(file => {
				// date must be constant to give determenistic results
				const entry = { name: file, prefix, date: CONSTANT };
				archive.file(path.join(from, file), entry);
			});

			archive.finalize();

		})
		.catch(issue => {
			output.destroy();
			reject(issue);
		});

	});

};


exports.load = function load (from) {

	return new Promise((resolve, reject) => {

		fs.readFile(from, (error, buffer) => {

			if (error) {
				reject(error);
				return;
			}

			const shasum = crypto.createHash('sha256');
			shasum.update(buffer);
			const hash = shasum.digest('base64');

			resolve({buffer, hash});

		});

	});

};