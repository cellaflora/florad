const forEach = require('lodash/forEach');
const uuidv1 = require('uuid/v1');

const defaults = {
	Empty: {
		type: "object",
		title: "Empty Schema"
	}
};

const prefix = '#/definitions/';
const name = ref => (/^#\/definitions\/([^\/]+)$/.exec(ref)||[,ref])[1];


module.exports = function (gateway) {

	gateway.defineModel = (name, definition) => {
		gateway.schema.setDefinitions(name, definition);
	};


	gateway.inlineModel = definition => {

		const name = uuidv1().replace(/-/g, '');
		gateway.defineModel(name, definition);
		return `${prefix}${name}`;

	}


	gateway.model = (name = null) => {

		if (name === null) {
			return gateway.schema.definitions;
		}
		return gateway.schema.definitions[name];

	}


	gateway.hasModel = ref => {
		return gateway.schema.definitions.hasOwnProperty(name(ref));
	}


	forEach(defaults, (definition, name) => gateway.defineModel(name, definition));

};