const { APIGatewayRequestValidator } = require('../swagger');

const VALIDATORS_KEY = 'x-amazon-apigateway-request-validators';
const DEFAULT_DEF = {
	validateRequestBody: false,
	validateRequestParameters: false,
};


module.exports = function (gateway) {

	gateway.defineValidator = (name, definition) => {

		const schema = gateway.schema;
		const validators = schema[VALIDATORS_KEY];

		if (gateway.hasValidator(name)) {
			validators[name].merge(definition);
		}
		else {

			const validator = new APIGatewayRequestValidator(
				Object.assign({}, DEFAULT_DEF, definition));
			schema[VALIDATORS_KEY] = Object.assign(validators, { [name]: validator });

		}

	};

	gateway.validator = (name = null) => {

		if (name === null) {
			return gateway.schema[VALIDATORS_KEY];
		}
		return gateway.schema[VALIDATORS_KEY][name];

	}

	gateway.hasValidator = name => {
		return gateway.schema[VALIDATORS_KEY].hasOwnProperty(name);
	}

};