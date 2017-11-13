const AWS = require('aws-sdk');
const debug = require('../utils/debug')('project');
const InfoProject = require('./info-project');



class AWSProject extends InfoProject {

	constructor (info) {

		super(info);

		const stsSDK = new AWS.STS({
			apiVersion: '2011-06-15',
			credentials: this.aws.credentials,
			region: this.aws.region,
		});
		const s3SDK = new AWS.S3({
			apiVersion: '2006-03-01',
			credentials: this.aws.credentials,
			region: this.aws.region,
		});

		Object.defineProperty(this, 'stsSDK', { get: () => stsSDK });
		Object.defineProperty(this, 's3SDK', { get: () => s3SDK });

		this._hasFetchedS3Configuration = false;

	}


	fetchFromS3 (key) {
		return this.s3SDK.getObject({Bucket: this.aws.bucket, Key: key}).promise();
	}


	uploadToS3 (archive, key, params = {}) {

		if (!this.aws.bucket) {
			throw new Error(`Must define a project bucket before uploading to S3!`);
		}

		const upload = Object.assign({}, {
			Bucket: this.aws.bucket,
			Key: key,
			Body: archive
		}, params);

		return this.s3SDK.upload(upload).promise().then(() => {
			return this;
		})
		.catch(issue => {

			if (issue.code === 'NoSuchBucket') {

				throw new Error(`Could not find S3 ${this.aws.bucket} bucket!`);
				return;

			}
			return Promise.reject(issue);

		})

	}


	configure () {

		if (this._hasFetchedS3Configuration) {
			return Promise.resolve(this.configuration);
		}

		this._hasFetchedS3Configuration = true;
		const configKey = 'config.json';
		debug(`${this.name}: fetching configuration`);

		const work = [];

		work.push(
			this.fetchFromS3('config.json')
				.then(response => {

					if (response.ContentType !== 'application/json') {
						console.error(`Warning: Config S3 ${configKey} was not application/json.`);
						return;
					}

					try {
						this.configuration = JSON.parse(response.Body); }
					catch (issue) {
						console.error(`Warning: Config S3 ${configKey} could not be parsed.`);
					}

					return this;

				})
				.catch(issue => {

					if (issue.code == 'NoSuchKey' || issue.code == 'NoSuchBucket') {

						const s3Path = `s3://${this.aws.bucket}/${configKey}`;
						console.error(`Warning: No config found on S3 (${s3Path}).`);
						return this;

					}
					
					return Promise.reject(issue);

				})
		);


		work.push(
			this.stsSDK.getCallerIdentity({})
				.promise()
				.then(({Account}) => {
					this.aws.account = Account;
					return this;
				})
		);

		return Promise.all(work).then(() => this);

	}


}



module.exports = AWSProject;