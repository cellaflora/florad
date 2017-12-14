const { SecurityDefinition, APIGatewayAuthorizer, constants } = require('../swagger');


module.exports = function (gateway) {

	gateway.defineSecurity = (name, definition) => {

		const schema = gateway.schema;
		const securitytab = schema.securityDefinitions;

		if (gateway.hasSecurity(name)) {
			securitytab[name].merge(definition);
		}
		else {

			const security = new SecurityDefinition(definition);
			schema.securityDefinitions = Object.assign(securitytab, { [name]: security });

		}

	};

	gateway.defineCognito = (name, providerARNs = []) => {

		const type = constants.COGNITO;
		const authorizer = new APIGatewayAuthorizer({providerARNs, type});

		return gateway.defineSecurity(name, {
			type: 'apiKey',
			name: 'Authorization',
			in: 'header',
			apiGatewayAuthType: type,
			apiGatewayAuthorizer: authorizer,
		});

	};

	gateway.security = (name = null) => {

		if (name === null) {
			return gateway.schema.securityDefinitions;
		}
		return gateway.schema.securityDefinitions[name];

	}

	gateway.hasSecurity = name => {
		return gateway.schema.securityDefinitions.hasOwnProperty(name);
	}

};