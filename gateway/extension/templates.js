const forEach = require('lodash/forEach');
const uuidv1 = require('uuid/v1');

const defaults = {
	mock: JSON.stringify({ statusCode: 200 }),
};

const prefix = '#/templates/';


module.exports = function (gateway) {

	const templates = {};


	gateway.defineTemplate = (name, definition) => {

		if (typeof definition !== 'string') {

			templates[`${prefix}${name}`] = JSON.stringify(definition);
			return;

		}
		templates[`${prefix}${name}`] = definition;
	};


	gateway.inlineTemplate = definition => {

		const name = uuidv1();
		gateway.defineTemplate(name, definition);
		return `${prefix}${name}`;

	}


	gateway.template = (ref = null) => {

		if (ref === null) {
			return Object.assign({}, templates);
		}
		return templates[ref];

	}


	gateway.hasTemplate = refOrInline => {
		return templates.hasOwnProperty(refOrInline);
	}


	forEach(defaults, (definition, name) => gateway.defineTemplate(name, definition));

};