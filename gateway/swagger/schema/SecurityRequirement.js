const isEqual = require('lodash/isEqual');

module.exports = function builder (Parent, swagger) {


	class SecurityRequirement extends Parent {

		sameAs (secreq) {
			return isEqual(this.document, secreq.document);
		}

	}


	return SecurityRequirement;

}