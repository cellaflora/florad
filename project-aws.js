const AWS = require('aws-sdk');
const debug = require('./debug')('project');



class ProjectAWS {

	constructor (name, {profile = 'default', region = 'us-east-1', bucket}) {

		this.aws = Object.assign({ account: null }, {profile, region, bucket});
		if (!this.aws.bucket) {
			this.aws.bucket = `${name}.flora`;
		}
		this.name = name;

		const stsSDK = new AWS.STS({
			apiVersion: '2011-06-15',
			credentials: new AWS.SharedIniFileCredentials({profile: this.aws.profile}),
			region: this.aws.region,
		});
		Object.defineProperty(this, 'stsSDK', { get: () => stsSDK });

		const s3SDK = new AWS.S3({
			apiVersion: '2006-03-01',
			credentials: new AWS.SharedIniFileCredentials({profile}),
			region,
		});
		Object.defineProperty(this, 's3SDK', { get: () => s3SDK });

	}


	fetchAccountNumber () {

		if (this.aws.account) {
			return Promise.resolve(this.aws.account);
		}

		return this.stsSDK.getCallerIdentity({}).promise().then(({Account}) => {
			this.aws.account = Account;
			return this;
		});

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



}



module.exports = ProjectAWS;