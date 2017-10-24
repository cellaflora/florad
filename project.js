const path = require('path');
const debug = require('debug')('project');
const NPMModules = require('./npm-modules');
const Lambda = require('./lambda');
const Gateway = require('./gateway');
const Queue = require('promise-queue');



class LambdaProject {

	constructor ({
		name,
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

		this.apiName = `${name}-${this.package.version}`;

		const lambdaExtension = gateway => {
			gateway.lambda = name => {
				return (req, res)  => {

					const lambda = this.lambdas.filter(l => l.name === name)[0];
					if (!lambda) {
						throw new Error(`Lambda middleware could not find ${name}`);
					}

					const arn = lambda.version.arn;
					if (!arn) {
						throw new Error(`Lambda middleware could not find ${name} arn. ` +
							`Be sure to deploy lambda first!`);
					}

					req.when('application/json').accepts({ template: '#/templates/mock' });
					req.integrates({
						type: gateway.constants.Lambda,
						uri: `arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/${arn}/lambda-arn/invocations`
					});
					res.when('default').responds({
						status: 200,
						model: '#/definitions/Empty',
					});

				}
			};
		};

		this.gateway = new Gateway(this.apiName, new Date().toJSON(), [lambdaExtension]);

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

		debug('BUILD LAMBDAS');
		const lambdas = this.lambdas;
		const queue = this._buildQueue;
		const doLambdaBuild = Promise.all(lambdas.map(l => queue.add(() => l.build())));

		return doLambdaBuild
			.then(() => {
				debug('BUILD GATEWAY');
				return this.gateway.run()
			})
			.then(() => this);

	}


	deploy () {

		debug('DEPLOY LAMBDAS');
		const lambdas = this.lambdas;
		const queue = this._buildQueue;
		const doLambdaDeploy = Promise.all(lambdas.map(l => queue.add(() => l.deploy())));

		return doLambdaDeploy
			.then(() => {
				debug('FINISHED');
				return this;
			});
	}

}



module.exports = LambdaProject;