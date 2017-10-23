const MiddlewareError = require('./middleware-error');


module.exports = function (req, res) {

	req.usesSecurity = security => {

		if (!this.hasSecurity(security)) {
			throw new MiddlewareError('security', security, req);
		}

		req.operation.mergeSecurity(security);

	};

};