

exports.OpenAPI = {
	required: {
		info: '#Info',
		paths: '#Paths'
	},
	optional: {
		swagger: String,
		basePath: String,
		host: String,
		schemes: [String],
		securityDefinitions: {'*': '#SecurityDefinition'},
		definitions: {'*': Object},
		'x-amazon-apigateway-binary-media-types': [String],
		'x-amazon-apigateway-request-validators': {'*': '#APIGatewayRequestValidator'},
	},
	defaults: {
		swagger: "2.0",
		basePath: '/',
		schemes: ['https'],
	}
};


exports.Info = {
	required: {
		title: String,
		version: String,
	},
	optional: {
		description: String,
	}
};


exports.Paths = {
	optional: {
		'*': '#PathItem',
	},
};


exports.SecurityRequirement = {
	optional: {
		'*': [String],
	}
};


exports.SecurityDefinition = {
	required: {
		type: String,
		name: String,
		in: String,
	},
	optional: {
		'x-amazon-apigateway-authtype': String,
		'x-amazon-apigateway-authorizer': '#APIGatewayAuthorizer',
	}
};


exports.APIGatewayRequestValidator = {
	required: {
		validateRequestBody: Boolean,
		validateRequestParameters: Boolean,
	},
};


exports.PathItem = {
	optional: {
		get: '#Operation',
		put: '#Operation',
		post: '#Operation',
		delete: '#Operation',
		options: '#Operation',
		head: '#Operation',
		patch: '#Operation',
		trace: '#Operation',
		'x-amazon-apigateway-any-method': '#Operation',
	},
};


exports.APIGatewayAuthorizer = {
	required: {
		// token: identity built into token,
		// request: identity built into request params,
		// and other (e.g. cognito_user_pools)
		type: String, 
		
		
	},
	optional: {
		// for lambda authorizer
		// and execution role for lambda authorizer
		authorizerUri: String, 
		authorizerCredentials: String,

		// mapping expressions used against 'request' type authorization
		// and regex used for validating 'token' type authorization
		identitySource: String,
		identityValidationExpression: String,

		// cache time for authorization
		authorizerResultTtlInSeconds: String,

		// cognito pools if 'cognito_user_pools' type
		providerARNs: [String],
	}
};


exports.Operation = {
	required: {
		responses: {'*': '#Response'},
		'x-amazon-apigateway-integration': '#APIGatewayIntegration',
	},
	optional: {
		consumes: [String],
		produces: [String],
		summary: String,
		description: String,
		operationId: String,
		parameters: ['#Parameter'],
		security: ['#SecurityRequirement'],
		'x-amazon-apigateway-request-validator': String,
	},
};


exports.Response = {
	required: {
		description: String,
	},
	optional: {
		schema: '#Schema',
		headers: {'*': '#Header'}
	}
};



exports.APIGatewayIntegration = {
	required: {
		type: String,
		responses: {'*': '#APIGatewayIntegrationResponse'},
		requestTemplates: {'*': String},
		passthroughBehavior: String,
	},
	optional: {
		httpMethod: String,
		uri: String,
		contentHandling: String,
		credentials: String,
		requestParameters: {'*': String},
		cacheNamespace: String,
		cacheKeyParameters: [String],
	},
};


exports.Parameter = {
	required: {
		name: String,
		in: String,
		required: Boolean,
	},
	optional: {
		schema: '#Schema',
		type: String,
		description: String,
	}
};


exports.Schema = {
	required: {
		'$ref': String,
	},
};


exports.Header = {
	required: {
		type: String,
	},
	optional: {
		name: String,
		description: String,
	},
};


exports.APIGatewayIntegrationResponse = {
	required: {
		statusCode: Number,
	},
	optional: {
		responseTemplates: {'*': String},
		responseParameters: {'*': String},
		contentHandling: String
	}
};
