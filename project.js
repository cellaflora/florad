const path = require('path');
const debug = require('debug')('project');
const NPMModules = require('./npm-modules');
const Lambda = require('./lambda');
const Gateway = require('./gateway');
const Queue = require('promise-queue');



class LambdaProject {

	constructor ({
		name = null,
		version = null,
		projectDirectory,
		buildDirectory,
		aws = {},
		concurency = 4})
	{

		Object.assign(this, {projectDirectory, buildDirectory});
		this.moduleDirectory = path.resolve(this.projectDirectory, 'node_modules');
		this.muduleBinDirectory = path.resolve(this.moduleDirectory, '.bin');
		this.packagePath = path.resolve(this.projectDirectory, 'package.json');
		this.package = require(this.packagePath);
		this._cache = {};

		this.version = this.package.version;
		this.repository = this.package.repository;
		this.author = this.package.author;
		this.license = this.package.license;
		this.lambdas = [];

		this.aws = Object.assign({
			profile: 'default',
			region: 'us-east-1',
			deployBucket: null,
		}, aws);

		this.gatewayName = `${name||this.package.name}-${version||this.package.version}`;
		this.gatewayVersion = new Date().toJSON(); 
		this.gateway = new Gateway(this);

		this._buildQueue = new Queue(concurency);
		this._deployQueue = new Queue(concurency);

	}


	dependencyTree () {

		debug(`fetching dependencies tree`);
		return NPMModules.dependencyTree(this.moduleDirectory, true).then(tree => {
			debug(`fetching dependencies tree finished`);
			return tree;
		});

	}


	npmWhichBin (command) {
		return path.resolve(path.resolve(this.muduleBinDirectory, command));
	}


	defineLambda (definition) {
		this.lambdas.push(new Lambda(this, definition));
	}


	build () {

		console.log('BUILD LAMBDAS');
		const lambdas = this.lambdas;
		const queue = this._buildQueue;
		const doLambdaBuild = Promise.all(lambdas.map(l => queue.add(() => l.build())));
		return doLambdaBuild.then(() => {
			console.log();
			return this;
		});

	}


	deploy () {

		console.log('DEPLOY LAMBDAS');
		const lambdas = this.lambdas;
		const queue = this._buildQueue;
		const doLambdaDeploy = Promise.all(lambdas.map(l => queue.add(() => l.deploy())));

		return doLambdaDeploy
			.then(() => {
				console.log('\nBUILD GATEWAY');
				return this.gateway.run()
			})
			.then(() => {
				console.log('\nDEPLOY GATEWAY');
				return this.gateway.deploy();
			})
			.then(() => {
				console.log('');
				return this;
			});

	}

}



module.exports = LambdaProject;