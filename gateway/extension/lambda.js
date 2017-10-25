const MiddlewareError = require('../middleware/middleware-error');
const values = require('lodash/values');

const uri = (region, arn) =>
	`arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${arn}/invocations`;



module.exports = (gateway, project) => {

	const usingLambdas = {};

	Object.defineProperty(gateway, 'usingLambdas', {get: () => values(usingLambdas)});

	gateway.lambda = name => {
		return (req, res)  => {

			const lambda = project.lambdas.find(l => l.name === name);
			if (!lambda) {
				throw new MiddlewareError('lambda', name, req)
			}

			const arn = lambda.version.arn;
			if (!arn) {
				throw new MiddlewareError('lambda.arn', name, req);
			}

			usingLambdas[req.path] = {
				path: req.path,
				method: req.method,
				lambda
			};

			req.when('application/json').accepts({ template: '#/templates/mock' });
			req.integrates({
				type: gateway.constants.Lambda,
				uri: uri(lambda.project.aws.region, arn),
			});
			res.when('default').responds({
				status: 200,
				model: '#/definitions/Empty',
			});

		}
	};

};