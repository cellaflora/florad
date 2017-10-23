const keys = require('lodash/keys');

module.exports = function builder (Parent, swagger) {


	class Operation extends Parent {

		constructor (params) {
			
			super(params);

			Object.defineProperty(this, 'apiGatewayIntegration', {
				get: () => this['x-amazon-apigateway-integration'],
				set: integration => this['x-amazon-apigateway-integration'] = integration,
			});
			
		}


		mergeParameter (parameter) {

			const instance = parameter instanceof swagger.Parameter
				? parameter
				: new Parameter(parameter);

			const same = p => p.name === instance.name && p.in === instance.in;
			const preexisting = this.parameters.find(same);

			if (preexisting) {

				preexisting.merge(instance);
				return;

			}

			return super.setParameters(instance);

		}


		mergeSecurity (security) {

			let instance = security;
			if (!(security instanceof swagger.SecurityRequirement)) {

				instance = new swagger.SecurityRequirement();
				instance.set(security, []);

			}

			const preexisting = this.security.find(s => s.sameAs(security));

			if (!preexisting) {
				this.setSecurity(instance);
			}

		}


		mergeConsumes (contentType) {

			if (this.consumes.indexOf(contentType) === -1) {
				this.setConsumes(contentType);
			}

		}


		mergeProduces (contentType) {

			if (this.produces.indexOf(contentType) === -1) {
				this.setProduces(contentType);
			}

		}


		static requestQueryParam (name) {
			return `method.request.querystring.${name}`;
		}


		static requestHeaderParam (name) {
			return `method.request.header.${name}`;
		}


		static requestPathParam (name) {
			return `method.request.path.${name}`;
		}


		static responseQueryParam (name) {
			return `method.response.querystring.${name}`;
		}


		static responseHeaderParam (name) {
			return `method.response.header.${name}`;
		}


		static responsePathParam (name) {
			return `method.response.path.${name}`;
		}


	}


	return Operation;

}