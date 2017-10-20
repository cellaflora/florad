const AWS =  require('aws-sdk');
const pick = require('lodash/pick');
const debug = require('debug')('lambda');



class LambdaAWS {

	constructor (project, params) {

		this.project = project;
		this.configuration = pick(params, ['name', 'runtime', 'role']);
		this.name = params.name;
		this.debugName = this.name.toUpperCase();
		this.versions = [];
		this.version = { arn: null, hash: null, lastModified: null };

		const profile = project.aws.profile;
		const region = project.aws.region;


		const lambdaSDK = new AWS.Lambda({
			apiVersion: '2015-03-31',
			credentials: new AWS.SharedIniFileCredentials({profile}),
			region,
		});
		Object.defineProperty(this, 'lambdaSDK', { get: () => lambdaSDK });

	}


	fetchVersions () {

		const run = (name, marker = null, versions = []) => {

			const params = { FunctionName: name, Marker: marker, MaxItems: 100 };
			return this.lambdaSDK.listVersionsByFunction(params).promise()
				.then(({NextMarker, Versions}) => {

					Versions.forEach(({FunctionArn, CodeSha256, LastModified}) => versions.push({
						arn: FunctionArn,
						hash: CodeSha256,
						lastModified: new Date(LastModified),
					}));
					if (NextMarker == null) {
						return versions.sort((a, b) => b.lastModified - a.lastModified);
					}
					return run(name, NextMarker, versions);

				})
				.catch(issue => {
					return issue.code === 'ResourceNotFoundException'
						? Promise.resolve([])
						: Promise.reject(issue);
				});

		}

		debug(`fetch previous versions of ${this.debugName}`);
		return run(this.name).then(versions => {

			debug(`fetch previous versions of ${this.debugName} finshed`);
			this._hasFetchedVersions = true;
			this.versions = versions;
			return this;

		});

	}


	createFunction (archive) {

		const create = {
			Code: {ZipFile: archive},
			FunctionName: this.name,
			Handler: `${this.name}.handler`,
			Description: `Function ${this.name}`,
			Publish: true,
			Role: this.configuration.role,
			Runtime: this.configuration.runtime
		};

		debug(`Deploying ${this.debugName}`);
		return this.lambdaSDK.createFunction(create).promise()
			.then(({FunctionArn, CodeSha256, LastModified}) => {

				debug(`Lambda ${this.debugName} has been deployed (${FunctionArn})`);
				this.version = {
					arn: FunctionArn,
					hash: CodeSha256,
					lastModified: new Date(LastModified),
				};
				return this;

			});

	}


	updateFunctionCode (archive) {

		const update = {
			FunctionName: this.name,
			Publish: true,
			ZipFile: archive,
		};

		debug(`Deploying ${this.debugName}`);

		return this.lambdaSDK.updateFunctionCode(update).promise()
			.then(({FunctionArn, CodeSha256, LastModified}) => {

				debug(`Lambda ${this.debugName} has been deployed (${FunctionArn})`);
				this.version = {
					arn: FunctionArn,
					hash: CodeSha256,
					lastModified: new Date(LastModified),
				};
				return this;

			});

	}


}



module.exports = LambdaAWS;