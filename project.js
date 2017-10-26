const path = require('path');
const debug = require('debug')('project');
const NPMModules = require('./npm-modules');
const Lambda = require('./lambda');
const Gateway = require('./gateway');
const Queue = require('promise-queue');
const AWS = require('aws-sdk');
const uuid = require('uuid').v1;
const fs = require('fs');



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
			account: null,
		}, aws);

		this.gatewayName = `${name||this.package.name}-v${version||this.package.version}`;
		this.gatewayVersion = new Date().toJSON(); 
		this.gateway = new Gateway(this);
		this.schemaPath = path.resolve(this.buildDirectory, 'api.json');

		this._buildQueue = new Queue(concurency);
		this._deployQueue = new Queue(concurency);

		this._stsSDK = new AWS.STS({
			apiVersion: '2011-06-15',
			credentials: new AWS.SharedIniFileCredentials({profile: this.aws.profile}),
			region: this.aws.region,
		});

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


	fetchAWSAccountNumber () {
		if (this.aws.account) {
			return Promise.resolve(this.aws.account);
		}

		debug('fetching aws account number');
		return this._stsSDK.getCallerIdentity({}).promise().then(({Account}) => {

			debug('fetching aws account number finished');
			this.aws.account = Account;
			return this;

		});
	}


	linkLambdaPermissions () {

		if (!this.gateway.awsId) {
			throw new Error(`Must deploy gateway before linking lambda permissions!`);
		}

		return this.fetchAWSAccountNumber().then(() => {

			const permissionsWork = this.gateway.usingLambdas.map(info => {

				const { method, path } = info;
				const gatewayId = this.gateway.awsId;
				const gatewayName = this.gatewayName;
				const debugMethod = method.toUpperCase();

				debug(`${debugMethod} ${path}: give permission to ` +
					`Lambda ${info.lambda.debugName}`);

				return info.lambda.addInvokePermission({method, path, gatewayId, gatewayName})
					.then(() => {
						debug(`${debugMethod} ${path}: give permission to ` +
							`Lambda ${info.lambda.debugName} finsihed`);
					});

			});
			return Promise.all(permissionsWork).then(() => this);

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
				return this.gateway
					.run()
					.then(schema => {
						fs.writeFileSync(this.schemaPath, JSON.stringify(schema, null, 4));
					});
			})
			.then(() => {
				console.log('\nDEPLOY GATEWAY');
				return this.gateway.deploy();
			})
			.then(() => {
				console.log('\nLINKING LAMBDA PERMISSIONS');
				return this.linkLambdaPermissions();
			})
			.then(() => {
				console.log();
				return this;
			});

	}


	publish (stage) {

		console.log(`PUBLISHING GATEWAY`);
		return this.gateway.publish(stage).then(() => {
			console.log();			
			return this;
		});

	}

}



module.exports = LambdaProject;