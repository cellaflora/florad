const MiddlewareError = require('../middleware/middleware-error');

const uri = arn =>
	`arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/${arn}/lambda-arn/invocations`;



module.exports = (gateway, project) => {

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

			req.when('application/json').accepts({ template: '#/templates/mock' });
			req.integrates({
				type: gateway.constants.Lambda,
				uri: uri(arn),
			});
			res.when('default').responds({
				status: 200,
				model: '#/definitions/Empty',
			});

		}
	};

};