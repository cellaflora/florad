const { Parameter, Operation } = require('../swagger');


module.exports = function (req, res) {

	req.usesHeader = function usesHeader (definition) {

		const headerParam = Parameter.Header(definition);
		req.operation.mergeParameter(headerParam);

		const cacheParam = Operation.requestHeaderParam(definition.name);

		if (definition.caching) {
			req.operation.apiGatewayIntegration.mergeCacheKeyParameter(cacheParam);
		}
		else if (definition.caching === false) {
			req.operation.apiGatewayIntegration.removeCacheKeyParameter(cacheParam);
		}

	};

};