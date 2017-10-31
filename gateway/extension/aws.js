const AWS = require('aws-sdk');
const debug = require('../../debug')('gateway');



class GatewayAWS {

	constructor (project) {

		this.project = project;
		this.id = null;
		this.name = this.project.gatewayName;
		this.gatewaySDK = new AWS.APIGateway({
			apiVersion: '2015-07-09',
			credentials: new AWS.SharedIniFileCredentials({profile: project.aws.profile}),
			region: project.aws.region,
		});

	}


	fetchRestApi () {

		if (this.id) {
			return Promise.resolve(this);
		}

		const run = (name, position = null) => {

			return this.gatewaySDK.getRestApis({position}).promise()
				.then((envelope) => {

					const restApi = envelope.items.find(api => api.name === name);
					if (!envelope.position || restApi) {
						return Promise.resolve(restApi || null);
					}
					return run(name, envelope.position);

				});

		};
		return run(this.name).then(definition => {
			if (definition) {
				this.id = definition.id;
			}
			return this;
		});

	}


	newRestApi (schema) {

		const params = {
			body: new Buffer(JSON.stringify(schema)),
			failOnWarnings: true
		};
		return this.gatewaySDK.importRestApi(params)
			.promise()
			.then(definition => {
				this.id = definition.id;
				return this;
			});

	}


	updateRestApi (schema) {

		const doFetch = this.fetchRestApi();

		
		return doFetch.then(() => {

			const params = {
				body: new Buffer(JSON.stringify(schema)),
				restApiId: this.id,
				failOnWarnings: true,
				mode: 'overwrite'
			};

			return this.gatewaySDK.putRestApi(params)
				.promise()
				.then(definition => {
					this.id = definition.id;
					return this;
				});
		});

	}


	publish (stage) {

		const doFetch = this.fetchRestApi();

		
		return doFetch.then(() => {

			const params = {
				restApiId: this.id,
				stageName: stage,
				stageDescription: `Stage ${stage}`,
			};

			return this.gatewaySDK.createDeployment(params)
				.promise()
				.then(stuff => {
					return this;
				});

		});

	}


	stageURL (stage) {
		return this.fetchRestApi().then(() => {
			const region = this.project.aws.region;
			return `https://${this.id}.execute-api.${region}.amazonaws.com/${stage}`;
		});
	}

}



module.exports = (gateway, project) => {

	const gatewayAWS = new GatewayAWS(project);

	gateway.awsId = null;

	gateway.deploy = function () {

		debug(`${gatewayAWS.name}: fetching definition`);
		const fetchApi = gatewayAWS.fetchRestApi();

		
		const deployApi = fetchApi.then(() => {

			debug(`${gatewayAWS.name}: fetching definition finished`);
			if (!gatewayAWS.id) {
				debug(`${gatewayAWS.name}: deploying new api`);
				return gatewayAWS.newRestApi(gateway.schema.document);
			}

			debug(`${gatewayAWS.name}: updating api`);
			return gatewayAWS.updateRestApi(gateway.schema.document);

		});


		return deployApi.then(() => {

			debug(`${gatewayAWS.name}: has been deployed`);
			gateway.awsId = gatewayAWS.id;
			return gateway;

		});

	};

	gateway.publish = function (stage) {

		debug(`${gatewayAWS.name}: publishing to ${stage}`);
		return gatewayAWS.publish(stage)
			.then(() => gatewayAWS.stageURL(stage))
			.then(uri => {

				debug(`${gatewayAWS.name}: has been published (${uri})`);
				return gateway;

			});

	};

};