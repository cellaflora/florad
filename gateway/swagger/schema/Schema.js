module.exports = function builder (Parent, swagger) {


	class Schema extends Parent {

		static WithRef (ref) {
			return new Schema({ '$ref': ref });
		}

	}


	return Schema;

}