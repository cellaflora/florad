
module.exports = function builder (Parent, swagger) {

	class SecurityDefinition extends Parent {

		constructor (params) {

			if (params.hasOwnProperty('apiGatewayAuthType')) {
				params['x-amazon-apigateway-authtype'] = params.apiGatewayAuthType;
			}

			if (params.hasOwnProperty('apiGatewayAuthorizer')) {
				params['x-amazon-apigateway-authorizer'] = params.apiGatewayAuthorizer;
			}

			if (params.hasOwnProperty('x-amazon-apigateway-authorizer') &&
				!(params['x-amazon-apigateway-authorizer'] instanceof swagger.APIGatewayAuthorizer))
			{
				params['x-amazon-apigateway-authorizer'] = 
					new APIGatewayAuthorizer('x-amazon-apigateway-authorizer');
			}

			super(params);

			Object.defineProperty(this, 'apiGatewayAuthType', {
				get: () => this['x-amazon-apigateway-authtype'],
				set: type => this['x-amazon-apigateway-authtype'] = type,
			});

			Object.defineProperty(this, 'apiGatewayAuthorizer', {
				get: () => this['x-amazon-apigateway-authorizer'],
				set: integration => this['x-amazon-apigateway-authorizer'] = integration,
			});

		}

	}


	return SecurityDefinition;

};