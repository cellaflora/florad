module.exports = function builder (Parent, swagger) {


	class Parameter extends Parent {

		static Header (definition) {

			const standard = {
				in: 'header',
				required: false,
				type: 'string',
			};
			return new Parameter(Object.assign(standard, definition));

		}

		static Query (definition) {

			const standard = {
				in: 'query',
				required: false,
				type: 'string'
			};
			return new Parameter(Object.assign(standard, definition));
			
		}

		static Body (definition) {

			const standard = {
				in: 'body',
				required: true,
			};
			return new Parameter(Object.assign(standard, definition));

		}

		static Path (definition) {

			const standard = {
				in: 'path',
				required: true,
				type: 'string'
			};
			return new Parameter(Object.assign(standard, definition));

		}

	}


	return Parameter;

}