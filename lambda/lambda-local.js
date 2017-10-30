const path = require('path');
const fs = require('fs');
const Project = require('../project');
const LambdaCompiler = require('./lambda-compiler');
const LambdaLink = require('./lambda-link');
const LambdaPackage = require('./lambda-package');
const LambdaAWS = require('./lambda-aws');
const LambdaDeploy = require('./lambda-deploy');




class LambdaLocal extends LambdaAWS {

	constructor (project, params) {

		super(project, params);

		this.path = require.resolve(params.path);
		this.buildDirectory = path.resolve(this.project.buildDirectory, this.name);
		this.modulesDirectory = path.resolve(this.buildDirectory, 'node_modules');
		this.packagePath = path.resolve(this.buildDirectory, 'package.json');
		this.archivePath = path.resolve(this.project.buildDirectory, `${this.name}.zip`);
		this.externals = [];
		this.archive = null;
		this.environment = {};

		this.prewebpack = typeof params.prewebpack === 'function'
			? params.prewebpack
			: config => config;

		this.prenpm = typeof params.prenpm === 'function'
			? params.prenpm
			: config => config;

		this.prelambda = typeof params.prelambda === 'function'
			? params.prelambda
			: config => config;

		this.hasBeenCompiled = false;
		this.hasBeenLinked = false;
		this.hasBeenPackaged = false;

	}


	configure () {
		return this.project.configure().then(config => {
			Object.assign(this.configuration, config.defaults.lambda);
			Object.assign(this.environment, config.environment);
		});
	}


	compile () {

		const doConfig = this.configure();
		const compiler = new LambdaCompiler(this);

		return doConfig.then(() => compiler.run()).then(() => {
			this.hasBeenCompiled = true;
			return this;
		});

	}


	link () {

		if (!this.hasBeenCompiled) {
			throw new Error(`Lambda ${this.debugName} must be compiled first!`);
		}

		const linker = new LambdaLink(this);
		return linker.install().then(() => {
			this.hasBeenLinked = true;
			return this;
		});

	}


	package () {

		if (!this.hasBeenLinked) {
			throw new Error(`Lambda ${this.debugName} must be compiled and linked first!`);
		}

		const packager = new LambdaPackage(this);
		return packager.package().then(() => {
			this.hasBeenPackaged = true;
			return this;
		});

	}


	build () {
		return this.compile()
			.then(() => this.link())
			.then(() => this.package());
	}


	deploy (options = {}) {

		const { force, useS3 } = Object.assign({force: false, useS3: false}, options);

		if (!fs.existsSync(this.archivePath)) {
			throw new Error(`Lambda ${this.debugName} must be packaged first!`);
		}

		let doArchive = Promise.resolve();
		if (!useS3) {
			doArchive = LambdaPackage.loadPackage(this);
		}

		const doConfig = doArchive.then(() => this.configure());

		const deployer = new LambdaDeploy(this);
		return doConfig
			.then(() => deployer.deploy({force, useS3}))
			.then(() => {
				this.archive = null;
				return this;
			});

	}

}



module.exports = LambdaLocal;