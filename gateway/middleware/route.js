const findIndex = require('lodash/findIndex');
const trimEnd = require('lodash/trimEnd');
const { Parameter, Operation } = require('../swagger');


const DEFAULT = {
	in: 'path',
	required: true,
	type: 'string'
};


module.exports = function (req, res) {

	const params = req.params = { path: [] };

	req.method = res.method = req.method.toLowerCase();
	trimEnd(req.method.path, '/');
	trimEnd(res.method.path, '/');

	req.path.replace(/\{([\s\S]+?)\}/g, (match, uncutParam) => {

		const shouldCache = uncutParam[uncutParam.length - 1] === '!';
		const param = shouldCache? trimEnd(uncutParam, '!'): uncutParam;
		params.path.push(param);

		if (shouldCache) {
			req
				.operation
				.apiGatewayIntegration
				.setCacheKeyParameters(Operation.requestPathParam(param));
		}

		req.operation.setParameters(Parameter.Path({ name: param }));

	});


	Object.assign(req, {
		queryParam: Operation.requestQueryParam,
		headerParam: Operation.requestHeaderParam,
		pathParam: Operation.requestPathParam,
	});

	Object.assign(res, {
		queryParam: Operation.responseQueryParam,
		headerParam: Operation.responseHeaderParam,
		pathParam: Operation.responsePathParam,
	});

};