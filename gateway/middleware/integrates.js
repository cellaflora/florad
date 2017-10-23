const keys = require('lodash/keys');
const forEach = require('lodash/forEach');
const MiddlewareError = require('./middleware-error');
const { APIGatewayIntegration, constants } = require('../swagger');


module.exports = function (req, res) {

	req.integrates = definition => {

		const integration = req.operation.apiGatewayIntegration;

		keys(definition).forEach(param => {
			switch (param) {

				case 'passthroughBehavior':
					integration.passthroughBehavior = definition.passthroughBehavior;
					break;

				case 'type':

					if (definition.type === constants.Mock) {
						break;
					}

					if (definition.type === constants.Lambda) {

						if (!definition.hasOwnProperty('uri')) {
							throw new MiddlewareError('definition.uri', '', req)
						}

						integration.type = constants.AWS;
						integration.httpMethod = constants.POST;
						integration.uri = definition.uri;
						break;

					}

					if (!definition.hasOwnProperty('httpMethod')) {
						throw new MiddlewareError('definition.httpMethod', '', req)
					}

					if (!definition.hasOwnProperty('uri')) {
						throw new MiddlewareError('definition.uri', '', req)
					}

					integration.type = definition.type;
					integration.httpMethod = definition.httpMethod;
					integration.uri = definition.uri;
					break;

				case 'headers':
					forEach(definition.headers, (requestMap, name) => {
						integration.setRequestParameters(
							APIGatewayIntegration.requestHeaderParam(name), requestMap);
					});
					break;

				case 'query':
					forEach(definition.query, (requestMap, name) => {
						integration.setRequestParameters(
							APIGatewayIntegration.requestQueryParam(name), requestMap);
					});
					break;

				case 'path':
					forEach(definition.path, (requestMap, name) => {
						integration.setRequestParameters(
							APIGatewayIntegration.requestPathParam(name), requestMap);
					});
					break;

				case 'contentHandling':
					integration.contentHandling = definition.contentHandling;
					break;

			}
		});


	};

	req.integration = {
		queryParam: APIGatewayIntegration.requestQueryParam,
		headerParam: APIGatewayIntegration.requestHeaderParam,
		pathParam: APIGatewayIntegration.requestPathParam,
	};

	res.integration = {
		queryParam: APIGatewayIntegration.responseQueryParam,
		headerParam: APIGatewayIntegration.responseHeaderParam,
		pathParam: APIGatewayIntegration.responsePathParam,
	};

};