module.exports = function builder (Parent, swagger) {


	class APIGatewayIntegrationResponse extends Parent {

		setHeaderParameter (name, mapping) {
			this.setResponseParameters(`method.response.header.${name}`, mapping);
		}


		merge (response) {

			const instance = response instanceof APIGatewayIntegrationResponse
				? response
				: new APIGatewayIntegrationResponse(response);

			this.responseTemplates =
				Object.assign(this.responseTemplates, instance.responseTemplates);
			this.responseParameters =
				Object.assign(this.responseParameters, instance.responseParameters);

			if (instance.document.hasOwnProperty('statusCode')) {
				this.statusCode = instance.document.statusCode;
			}

			if (instance.document.hasOwnProperty('contentHandling')) {
				this.contentHandling = instance.document.contentHandling;
			}

		}

	}


	return APIGatewayIntegrationResponse;

}