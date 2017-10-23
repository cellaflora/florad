const { Parameter, Operation } = require('../swagger');


module.exports = function (req, res) {

	req.usesQuery = (definition) => {

		const headerParam = Parameter.Query(definition);
		req.operation.mergeParameter(headerParam);

		const cacheParam = Operation.requestQueryParam(definition.name);

		if (definition.caching) {
			req.operation.apiGatewayIntegration.mergeCacheKeyParameter(cacheParam);
		}
		else if (definition.caching === false) {
			req.operation.apiGatewayIntegration.removeCacheKeyParameter(cacheParam);
		}

	};
	
};