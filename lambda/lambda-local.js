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

		this.webpack = typeof this.params === 'function'
			? this.params
			: config => config;

		this.hasBeenCompiled = false;
		this.hasBeenLinked = false;
		this.hasBeenPackaged = false;

	}


	compile () {

		const compliler = new LambdaCompiler(this);
		return compliler.run().then(() => {
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


	deploy ({force = false} = {force: false}) {

		let archive = Promise.resolve();
		if (!this.hasBeenPackaged && fs.existsSync(this.archivePath)) {
			archive = LambdaPackage.loadPackage(this);
		}
		else if (!this.hasBeenPackaged) {
			throw new Error(`Lambda ${this.debugName} must be packaged first!`);
		}

		const deployer = new LambdaDeploy(this);
		return archive.then(() => deployer.deploy({force})).then(() => {
			this.archive = null;
			return this;
		});

	}

}



module.exports = LambdaLocal;