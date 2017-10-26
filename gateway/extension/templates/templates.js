const forEach = require('lodash/forEach');
const uuidv1 = require('uuid/v1');
const fs = require('fs');
const path = require('path');
const predefined = require('./predefined');


const prefix = '#/templates/';



module.exports = function (gateway) {

	const templates = {};
	const pathToRef = {};


	gateway.defineJSONTemplate = (name, definition) => {

		if (typeof definition !== 'string') {

			templates[`${prefix}${name}`] = JSON.stringify(definition);
			return;

		}
		templates[`${prefix}${name}`] = definition;
		return `${prefix}${name}`;

	};


	gateway.loadJSONTemplate = (name, templatePath) => {

		const template = require(templatePath);
		return gateway.defineJSONTemplate(name, template);

	};


	gateway.loadVelocityTemplate = (name, templatePath) => {

		const buffer = fs.readFileSync(templatePath);
		const template = buffer.toString('utf8');

		const ref = `${prefix}${name}`;
		templates[ref] = template;
		return ref;

	};


	gateway.inlineJSONTemplate = definition => {

		const name = uuidv1();
		gateway.defineJSONTemplate(name, definition);
		return `${prefix}${name}`;

	};


	gateway.template = (ref = null) => {

		if (ref === null) {
			return Object.assign({}, templates);
		}
		return templates[ref];

	};


	gateway.hasTemplate = ref => {
		return templates.hasOwnProperty(ref);
	};


	predefined.paths.forEach(templPath => {

		const info = path.parse(templPath);
		switch (info.ext) {
			case '.json': return gateway.loadJSONTemplate(info.name, templPath);
			case '.vm': return gateway.loadVelocityTemplate(info.name, templPath);
		}

	});

};