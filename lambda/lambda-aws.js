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

		if (!archive && !this.project.aws.deployBucket) {
			throw new Error(`To update lambda, you must either provide `+
				`an archive or define S3 project deploy-bucket!`);
		}

		let create = {
			Code: {ZipFile: archive},
			FunctionName: this.name,
			Handler: `${this.name}.handler`,
			Description: `Function ${this.name}`,
			Publish: true,
			Role: this.configuration.role,
			Runtime: this.configuration.runtime
		};

		if (!archive) {

			const code = create.Code;
			delete code.ZipFile;
			code.S3Bucket = this.project.aws.deployBucket;
			code.S3Key = this.name;

		}

		if (typeof this.prelambda === 'function') {
			create = this.prelambda(create);
		}

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

		if (!archive && !this.project.aws.deployBucket) {
			throw new Error(`To update lambda, you must either provide `+
				`an archive or define S3 project deploy-bucket!`);
		}

		const update = {
			FunctionName: this.name,
			Publish: true,
			ZipFile: archive,
		};

		if (!archive) {

			delete update.ZipFile;
			update.S3Bucket = this.project.aws.deployBucket;
			update.S3Key = this.name;

		}

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


	uploadToS3 (archive, params = {}) {

		if (!this.project.aws.deployBucket) {
			throw new Error(`Must define a project deploy-bucket before uploading to S3!`);
		}

		debug(`Uploading ${this.debugName} to S3`);

		const upload = Object.assign({}, {
			Bucket: this.project.aws.deployBucket,
			Key: this.name,
			Body: archive
		}, params);
		return this.s3SDK.upload(upload).promise().then(() => {
			debug(`Upload ${this.debugName} to S3 finished`);
			return this;
		});

	}


}



module.exports = LambdaAWS;