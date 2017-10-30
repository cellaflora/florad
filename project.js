const ProjectAWS = require('./project-aws');
const path = require('path');
const debug = require('./debug')('project');
const NPMModules = require('./npm-modules');
const Lambda = require('./lambda');
const Gateway = require('./gateway');
const Queue = require('promise-queue');
const uuid = require('uuid').v1;
const fs = require('fs');



class LambdaProject extends ProjectAWS {

	constructor ({
		name = null,
		version = null,
		projectDirectory,
		buildDirectory,
		aws = {},
		concurency = 4})
	{
		const packagePath = path.resolve(projectDirectory, 'package.json');
		const packageJson = require(packagePath);

		super(name || packageJson.name, aws);

		Object.assign(this, {projectDirectory, buildDirectory});
		this.moduleDirectory = path.resolve(this.projectDirectory, 'node_modules');
		this.muduleBinDirectory = path.resolve(this.moduleDirectory, '.bin');
		this.packagePath = packagePath;
		this.package = packageJson;
		
		this.version = this.package.version;
		this.repository = this.package.repository;
		this.author = this.package.author;
		this.license = this.package.license;
		this.lambdas = [];

		this.gatewayName = `${name||this.package.name}-v${version||this.package.version}`;
		this.gatewayVersion = new Date().toJSON(); 
		this.gateway = new Gateway(this);
		this.schemaPath = path.resolve(this.buildDirectory, 'api.json');

		this._cache = {};
		this._buildQueue = new Queue(concurency);
		this._deployQueue = new Queue(concurency);

		this._hasFetchedConfig = false;
		this.config = new _Config();

	}


	dependencyTree () {

		debug(`${this.name}: fetching dependencies tree`);
		return NPMModules.dependencyTree(this.moduleDirectory, true).then(tree => {
			debug(`${this.name}: fetching dependencies tree finished`);
			return tree;
		});

	}


	defineLambda (definition) {
		this.lambdas.push(new Lambda(this, definition));
	}


	configure () {

		if (this._hasFetchedConfig) {
			return Promise.resolve(this.config);
		}


		const configKey = 'config.json';
		this._hasFetchedConfig = true;
		debug(`${this.name}: fetching configuration`);

		return this.fetchFromS3('config.json')
			.then(response => {

				if (response.ContentType !== 'application/json') {
					console.error(`Warning: Config s3 ${configKey} was not application/json.`);
					return;
				}

				try {
					this.config = new _Config(JSON.parse(response.Body));
				}
				catch (issue) {
					console.error(`Warning: Config s3 ${configKey} could not be parsed.`);
					return;
				}
				return this.config;

			})
			.catch(issue => {

				if (issue.code == 'NoSuchKey') {
					console.error(`Warning: No config found at s3 ${configKey}.\n`);
					return this.config;
				}
				return Promise.reject(issue);

			});

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


	linkLambdaPermissions () {

		if (!this.gateway.awsId) {
			throw new Error(`Must deploy gateway before linking lambda permissions!`);
		}

		debug(`${this.name}: fetching aws account number`);

		return this.fetchAccountNumber().then(() => {

			debug(`${this.name}: fetching aws account number finished`);
			const permissionsWork = this.gateway.usingLambdas.map(info => {

				const { method, path } = info;
				const gatewayId = this.gateway.awsId;
				const gatewayName = this.gatewayName;
				const debugMethod = method.toUpperCase();

				debug(`${this.name}: ${debugMethod} ${path}: give permission to ` +
					`Lambda ${info.lambda.debugName}`);

				return info.lambda.addInvokePermission({method, path, gatewayId, gatewayName})
					.then(() => {
						debug(`${this.name}: ${debugMethod} ${path}: give permission to ` +
							`Lambda ${info.lambda.debugName} finsihed`);
					});

			});
			return Promise.all(permissionsWork).then(() => this);

		});

	}


	deploy (options) {

		console.log('DEPLOY LAMBDAS');
		const lambdas = this.lambdas;
		const queue = this._buildQueue;
		const doLambdaDeploy = Promise.all(lambdas.map(l => queue.add(() => l.deploy(options))));

		if (this.gateway.isEmpty) {
			return Promise.resolve(this);
		}

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



class _Config {

	constructor (config = {}) {

		this.environment = Object.assign({}, config.environment);
		this.defaults = Object.assign({}, config.defaults);
		this.defaults.lambda = Object.assign({}, this.defaults.lambda);

	}

}



module.exports = LambdaProject;