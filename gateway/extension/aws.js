const AWS = require('aws-sdk');
const debug = require('debug')('gateway');



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

		const run = (name, position = null) => {

			return this.gatewaySDK.getRestApis({position}).promise()
				.then((envelope) => {

					const restApi = envelope.items.find(api => api.name === name);
					if (!envelope.position || restApi) {
						return Promise.resolve(restApi || null);
					}
					return run(name, envelope.position);

				});

		}
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
			});;

	}

}



module.exports = (gateway, project) => {

	const gatewayAWS = new GatewayAWS(project);
	gateway.awsId = null;
	gateway.deploy = function () {

		const fetchApi = gatewayAWS.fetchRestApi();

		debug(`${gatewayAWS.name}: fetching definition`);

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
			return gateway;
		});

	};

};