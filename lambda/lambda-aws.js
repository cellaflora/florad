const AWS =  require('aws-sdk');
const pick = require('lodash/pick');
const keys = require('lodash/keys');
const diff = require('lodash/difference');
const cap = require('lodash/upperFirst');
const debug = require('../debug')('lambda');
const replaceParams = (s, _with) => s.replace(/\{([\s\S]+?)\}/g, _with);
const lambdaParams = ['runtime', 'role', 'memorySize', 'timeout', 'vpcConfig'];



class LambdaAWS {

	static awsConfig (config) {

		const awsConfig = {};
		lambdaParams.forEach(name => {
			if (config.hasOwnProperty(name)) {

				let param = config[name];
				if (name === 'vpcConfig') {

					const vpc = {};
					vpc['SubnetIds'] = param['subnetIds'];
					vpc['SecurityGroupIds'] = param['securityGroupIds'];
					param = vpc;

				}

				awsConfig[cap(name)] = param;

			}
		});
		return awsConfig;

	}


	constructor (project, params) {

		this.project = project;
		this.configuration = pick(params, lambdaParams);
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


		const s3SDK = new AWS.S3({
			apiVersion: '2006-03-01',
			credentials: new AWS.SharedIniFileCredentials({profile}),
			region,
		});
		Object.defineProperty(this, 's3SDK', { get: () => s3SDK });

	}


	fetchVersions () {

		const run = (name, marker = null, versions = []) => {

			const params = { FunctionName: name, Marker: marker, MaxItems: 100 };
			return this.lambdaSDK.listVersionsByFunction(params).promise()
				.then(({ NextMarker, Versions }) => {

					Versions.forEach(({FunctionArn, CodeSha256, LastModified}) => {

						return versions.push({
							arn: FunctionArn,
							hash: CodeSha256,
							lastModified: new Date(LastModified)
						});

					});

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

		debug(`${this.debugName}: fetch previous versions`);
		return run(this.name).then(versions => {

			debug(`${this.debugName}: fetch previous versions finshed`);
			this._hasFetchedVersions = true;
			this.versions = versions;
			return this;

		});

	}


	createFunction (archive) {

		if (!archive && !this.project.aws.bucket) {
			throw new Error(`To update lambda, you must either provide `+
				`an archive or define S3 project bucket!`);
		}

		let create = {
			Code: {ZipFile: archive},
			FunctionName: this.name,
			Handler: `${this.name}.handler`,
			Description: `Function ${this.name}`,
			Publish: true,
		};

		Object.assign(create, LambdaAWS.awsConfig(this.configuration));

		if (!archive) {

			const code = create.Code;
			delete code.ZipFile;
			code.S3Bucket = this.project.aws.bucket;
			code.S3Key = `${this.name}.zip`;

		}

		if (typeof this.prelambda === 'function') {
			create = this.prelambda(create);
		}

		debug(`${this.debugName}: deploying`);
		return this.lambdaSDK.createFunction(create).promise()
			.then(({FunctionArn, CodeSha256, LastModified}) => {

				debug(`${this.debugName}: has been deployed (${FunctionArn})`);
				this.version = {
					arn: FunctionArn,
					hash: CodeSha256,
					lastModified: new Date(LastModified),
				};
				return this;

			});

	}


	updateFunctionCode (archive) {

		if (!archive && !this.project.aws.bucket) {
			throw new Error(`To update lambda, you must either provide `+
				`an archive or define S3 project bucket!`);
		}

		const update = {
			FunctionName: this.name,
			Publish: true,
			ZipFile: archive,
		};

		if (!archive) {

			delete update.ZipFile;
			update.S3Bucket = this.project.aws.bucket;
			update.S3Key = `${this.name}.zip`;

		}

		debug(`${this.debugName}: deploying`);

		return this.lambdaSDK.updateFunctionCode(update).promise()
			.then(({FunctionArn, CodeSha256, LastModified}) => {

				debug(`${this.debugName}: has been deployed (${FunctionArn})`);
				this.version = {
					arn: FunctionArn,
					hash: CodeSha256,
					lastModified: new Date(LastModified),
				};
				return this;

			});

	}


	uploadToS3 (archive, params = {}) {

		if (!this.project.aws.bucket) {
			throw new Error(`Must define a project bucket before uploading to S3!`);
		}

		debug(`${this.debugName}: uploading to S3`);

		return this.project.uploadToS3(archive, `${this.name}.zip`, params).then(() => {
			debug(`${this.debugName}: upload to S3 finished`);
			return this;
		});

	}


	updateConfiguration ()  {

		const params = {
			FunctionName: this.name,
		};

		debug(`${this.debugName}: check deployed configuration`);

		return this.lambdaSDK.getFunctionConfiguration(params).promise()
			.then(pub => {

				const config = LambdaAWS.awsConfig(this.configuration);
				const update = {
					FunctionName: params.FunctionName,
				};

				let inSync = true;
				keys(config).forEach(name => {

					if (name === 'VpcConfig') {
						if (diff(pub[name].SubnetIds, config[name].SubnetIds).length !== 0 ||
							diff(pub[name].SecurityGroupIds, config[name].SecurityGroupIds).length !== 0)
						{
							update[name] = config[name];
							inSync = false;
						}
					}
					else if (pub[name] !== config[name]) {
						update[name] = config[name];
						inSync = false;
					}

				});

				if (inSync) {
					debug(`${this.debugName}: deployed configuration is the same`);
					return Promise.resolve(this);
				}

				debug(`${this.debugName}: update deployed configuration`);

				return this.lambdaSDK.updateFunctionConfiguration(update).promise()
					.then(() => {
						debug(`${this.debugName}: configuration updated`);
						return this;
					});

			})
			.catch(console.error);

	}


	addInvokePermission ({method, path, gatewayId, gatewayName}) {

		const {region, account} = this.project.aws;
		const upperMethod = method.toUpperCase();
		const methodPath = replaceParams(path, '*');
		const friendlyPath = replaceParams(path, (m, p) => p).replace(/\//g, '_');
		const friendlyGatewayNam = gatewayName.replace(/\./g,'_');
		const friendly = `${friendlyGatewayNam}_${upperMethod}${friendlyPath}`
		const methodArn =
			`arn:aws:execute-api:${region}:${account}:${gatewayId}/*/${upperMethod}${methodPath}`;

		const params = {
			Action: 'lambda:InvokeFunction',
			FunctionName: this.version.arn || this.name,
			Principal: 'apigateway.amazonaws.com',
			StatementId: friendly,
			SourceArn: methodArn,
		};
		return this.lambdaSDK.addPermission(params).promise()
			.then(() => this)
			.catch(issue => {
				if (issue.code === 'ResourceConflictException') {
					return Promise.resolve(this);
				}
				return Promise.reject(issue);
			});

	}


}



module.exports = LambdaAWS;