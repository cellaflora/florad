const MiddlewareError = require('./middleware-error');

module.exports = function (req, res) {

	req.usesValidator = name => {

		if (!this.hasValidator(name)) {
			throw new MiddlewareError('validator', name, req);
		}

		req.operation.apiGatewayRequestValidator = name;

	};

};