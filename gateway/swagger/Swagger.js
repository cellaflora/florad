const forOwn = require('lodash/forOwn');
const SwaggerClass = require('./SwaggerClass');
const schema = require('./schema');



class Swagger {

	constructor () {

		const classTable = {};
		const swgClassTable = {};

		forOwn(schema.definition, (definition, className) => {

			const swgClass = new SwaggerClass(className, definition);
			classTable[className] = swgClass.Class();
			swgClassTable[className] = swgClass;

		});

		forOwn(swgClassTable, (swgClass, className) => {
			swgClass.linkClass(classTable[className], classTable);
		});

		forOwn(schema.types, (builder, className) => {
			classTable[className] = builder(classTable[className], this);
		});

		Object.assign(this, classTable);

		this.constants = Object.assign({}, schema.constants);

	}

};



module.exports = Swagger;