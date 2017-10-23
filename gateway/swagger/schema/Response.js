module.exports = function builder (Parent, swagger) {


	class Response extends Parent {

		constructor (params) {

			if ((!params.hasOwnProperty('description') || !params.description) &&
				params.hasOwnProperty('statusCode'))
			{
				params.description = `${params.statusCode} response`;
			}
			super(params);

		}

		setHeader (name) {
			this.setHeaders(name, new swagger.Header({type: 'string'}));
		}

		merge (response) {

			const instance = response instanceof Response
				? response
				: new Response(response);

			this.headers = Object.assign(this.headers, instance.headers);

			if (instance.document.hasOwnProperty('schema')) {
				this.schema = instance.document.schema;
			}

			if (instance.document.hasOwnProperty('description')) {
				this.description = instance.document.description;
			}

		}

	}


	return Response;

}