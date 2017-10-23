

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
		name: String,
		type: String,
		authorizerUri: String,
		identitySource: String,
	},
	optional: {
		providerARNs: [String],
		authType: String,
		authorizerCredentials: String,
		identityValidationExpression: String,
		authorizerResultTtlInSeconds: String,
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
		'x-amazon-apigateway-request-validator': String,
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