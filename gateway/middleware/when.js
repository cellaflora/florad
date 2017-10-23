const values = require('lodash/values');
const keys = require('lodash/keys');
const forEach = require('lodash/forEach');

const MiddlewareError = require('./middleware-error');

const {
	Parameter,
	Response,
	Schema,
	APIGatewayIntegrationResponse } = require('../swagger');



module.exports = function headers (req, res) {

	const accepts = (contentType, definition) => {

		keys(definition).forEach(param => {
			switch(param) {

				case 'model':

					if (!this.hasModel(definition.model)) {
						throw new MiddlewareError('model', definition.model, req);
					}

					req.operation.mergeParameter(
						Parameter.Body(
							Object.assign({
								schema:  schema = Schema.WithRef(definition.model),
								name: definition.model 
							}, definition)
						)
					);

					break;

				case 'template':

					if (!this.hasTemplate(definition.template)) {
						throw new MiddlewareError('template', definition.template, req);
					}

					req
						.operation
						.apiGatewayIntegration
						.setRequestTemplates(contentType, this.template(definition.template));

					if (req.operation.apiGatewayIntegration.type === this.constants.Mock) {
						req.operation.mergeProduces(contentType);
					}

					break;

			}
		});

		req.operation.mergeConsumes(contentType);

	};


	const conditionToStatus = {};

	const responds = (condition, definition) => {

		if (!('status' in definition)) {
			throw new MiddlewareError('definition.status', '', req);
		}

		if (conditionToStatus.hasOwnProperty(condition) &&
			conditionToStatus[condition] !== definition.status)
		{
			throw new Error(`Condition '${condition}' already associated` +
				` to status ${conditionToStatus[condition]}.`);
		}
		conditionToStatus[condition] = definition.status;

		definition.headers  = definition.headers || {};
		definition.templates = definition.templates || {};


		// Build Gateway Integration Response
		const integrationResponse = new APIGatewayIntegrationResponse({statusCode: definition.status});

		if ('contentHandling' in definition) {
			integrationResponse.contentHandling = definition.contentHandling;
		}

		forEach((definition.headers), (mapping, name) => {
			integrationResponse.setHeaderParameter(name, mapping);
		});
		
		forEach(definition.templates, (template, contentType) => {

			if (!this.hasTemplate(template)) {
				throw new MiddlewareError('template', template, req);
			}

			integrationResponse.setResponseTemplates(contentType, this.template(template));

		});

		req.operation.apiGatewayIntegration.setResponses(condition, integrationResponse);


		// Build Response
		const response = new Response({
			definition: definition.description,
			statusCode: definition.status });

		if ('model' in definition) {

			if (!this.hasModel(definition.model)) {
				throw new MiddlewareError('model', definition.model, req);
			}

			response.schema = Schema.WithRef(definition.model);

		}


		keys(definition.headers).forEach(name => response.setHeader(name));

		req.operation.setResponses(definition.status, response);


		// Merge Produces
		keys(definition.templates).forEach(type => req.operation.mergeProduces(type));


	};


	req.when = (contentType) => ({accepts: accepts.bind(this, contentType)});
	res.when = (condition) => ({responds: responds.bind(this, condition)});

};