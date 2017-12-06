module.exports = function builder (Parent, swagger) {


	class APIGatewayIntegration extends Parent {

		constructor (params) {

			super(params);

		}

		static requestQueryParam (name) {
			return `integration.request.querystring.${name}`;
		}


		static requestHeaderParam (name) {
			return `integration.request.header.${name}`;
		}


		static requestPathParam (name) {
			return `integration.request.path.${name}`;
		}


		static responseQueryParam (name) {
			return `integration.response.querystring.${name}`;
		}


		static responseHeaderParam (name) {
			return `integration.response.header.${name}`;
		}


		static responsePathParam (name) {
			return `integration.response.path.${name}`;
		}


		mergeCacheKeyParameter (parameter) {

			const list = this.cacheKeyParameters;
			if (list.indexOf(parameter) === -1) {
				this.cacheKeyParameters = [parameter].concat(list);
			}

		}


		removeCacheKeyParameter (parameter) {
			this.cacheKeyParameters = this.cacheKeyParameters.filter(p => p != parameter);
		}

	}


	return APIGatewayIntegration;

}
