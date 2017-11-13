const AWSLambda = require('./aws-lambda');
const fs = require('fs');
const pick = require('lodash/pick');
const LambdaVersion = require('./lambda-version');
const debug = require('../utils/debug')('lambda');

const {
	LambdaCompiler,
	LambdaLink,
	LambdaPackage,
	LambdaDeploy,
} = require('./actions');




class ProjectLambda extends AWSLambda {

	constructor (project, info) {

		info.paths = {
			entry: project.resolvePath(info.entry),
			build: project.paths.build,
		};

		info.project = pick(project, ['version', 'repository', 'author', 'license', 'paths']);
		info.aws = pick(project.aws, ['region', 'credentials', 'bucket']);

		super(info);

		this.hasBeenCompiled = false;
		this.hasBeenLinked = false;
		this.hasBeenPackaged = false;

	}


	compile () {

		debug(`${this.debugName}: building lambda (${this.paths.entry})`);

		return LambdaCompiler.compile(this).then(({externals}) => {

			this.externals = externals;
			this.hasBeenCompiled = true;

			return this;

		});

	}


	link () {

		if (!this.hasBeenCompiled) {
			throw new Error(`Lambda ${this.debugName} must be compiled first!`);
		}

		return LambdaLink.install(this).then(() => {
			this.hasBeenLinked = true;
			return this;
		});

	}


	package () {

		debug(`${this.debugName}: archiving package "${this.paths.archive}"`);

		if (!this.hasBeenLinked) {
			throw new Error(`Lambda ${this.debugName} must be compiled and linked first!`);
		}

		const work = [];
		work.push(LambdaPackage.package(this.paths.lambda, this.paths.archive));

		return Promise.all(work).then(() => {

			this.hasBeenPackaged = true;
			return this;

		});

	}


	build () {
		return this.compile()
			.then(() => this.link())
			.then(() => this.package());
	}


	deploy ({force = false, useS3 = false} = {force: false, useS3: false}) {

		debug(`${this.debugName}: deploying "${this.paths.archive}"`);

		if (!fs.existsSync(this.paths.archive)) {
			throw new Error(`Lambda ${this.debugName} must be packaged first!`);
		}


		const work = [
			LambdaPackage.load(this.paths.archive),
			this.fetchVersions()
		];


		return Promise.all(work).then(([{buffer, hash}, versions]) => {

			this.version = new LambdaVersion({hash});
			this.version.resolveWith(versions);

			if (!useS3) {
				this.archive = buffer;
			}

			return LambdaDeploy.deploy(this, {force, useS3}).then(deployed => {

				if (!deployed) {
					debug(`${this.debugName}: already deployed (${this.version.arn})`);
				}
				this.archive = null;
				return this;

			});

		});

	}

}



module.exports = ProjectLambda;