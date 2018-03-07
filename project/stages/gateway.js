const debug = require('../../utils/debug')('gateway');
const Gateway = require('../../gateway');
const MiddlewareError = require('../../gateway/middleware/middleware-error');
const values = require('lodash/values');
const fs = require('fs');

const uri = (region, arn) =>
	`arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${arn}/invocations`;



module.exports = function (project) {

	const usingLambdas = [];

	const lambdaExt = gateway => {

		gateway.lambda = name => (req, res)  => {

			const lambda = project.lambdas.find(l => l.name === name);
			if (!lambda) {
				throw new MiddlewareError('lambda', name, req)
			}

			const arn = lambda.version.arn;
			if (!arn) {
				throw new MiddlewareError('lambda.arn', name, req);
			}

			usingLambdas[`${req.method}:${req.path}`] = {
				path: req.path,
				method: req.method,
				lambda
			};

			// set default request template, if json content-type is not defined
			const requestTemplates = req.operation.apiGatewayIntegration.requestTemplates;
			if (!requestTemplates.hasOwnProperty('application/json')) {
				req.when('application/json').accepts({ template: '#/templates/passthrough' });
			}

			req.integrates({
				type: gateway.constants.Lambda,
				uri: uri(project.aws.region, arn),
			});

			// set default response model, if response condition is not defined
			const responses = req.operation.apiGatewayIntegration.responses;
			if (!responses.hasOwnProperty('default')) {
				res.when('default').responds({
					status: 200,
					model: '#/definitions/Empty',
				});
			}

		};

	};

	const params = {
		name: project.fullname,
		version: project.version,
		aws: project.aws,
	};

	const gateway = project.gateway = new Gateway(params, [lambdaExt]);

	project.task('gateway:build', configuration => {

		return () => {

			if (gateway.isEmpty) {
				return Promise.resolve();
			}
			return gateway
				.run()
				.then(schema => {
					fs.writeFileSync(project.paths.schema, JSON.stringify(schema, null, 4));
				});

		};

	});


	project.task('gateway:deploy', configuration => {

		return () => {

			if (gateway.isEmpty) {
				return Promise.resolve();
			}
			return gateway.deploy();

		};

	});


	project.task('gateway:link-lambda', configuration => {

		return () => {

			if (gateway.isEmpty) {
				return Promise.resolve();
			}

			if (!gateway.awsId) {
				throw new Error(`Must deploy gateway before linking lambda permissions!`);
			}

			return values(usingLambdas).map(info => {

				const { method, path, lambda } = info;
				const gatewayId = gateway.awsId;
				const gatewayName = gateway.name;
				const debugMethod = method.toUpperCase();
				const account = project.aws.account;

				debug(`${project.fullname}: ${debugMethod} ${path}: give permission to ` +
					`Lambda ${lambda.debugName}`);

				return lambda.addInvokePermission({method, path, account, gatewayId, gatewayName});

			});

		};

	});


	project.task('gateway:publish', configuration => {

		return (...args) =>  gateway.publish(...args);

	});

};
