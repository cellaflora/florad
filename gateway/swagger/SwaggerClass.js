const mapValues = require('lodash/mapValues');
const pick = require('lodash/pick');
const forOwn = require('lodash/forOwn');
const capitalize = require('lodash/upperFirst');
const SwaggerType = require('./SwaggerType');
const SwaggerObject = require('./SwaggerObject');



class SwaggerClass {

	constructor (className, definition) {

		this.className = className;
		this.required = definition.required || {};
		this.optional = definition.optional || {};
		this.defaults = definition.defaults || {};
		this.isClassTableLinked = false;

		this.allFields = () => {
			return Object.assign({}, this.required, this.optional);
		};

	}


	Class () {

		const className = this.className;
		const requiredNames = Object.keys(this.required);
		const requiredNamesCSV = requiredNames.join('", "');
		const defaults = this.defaults;

		const constructor = function (params = {}) {

			if (!requiredNames.every(field => params.hasOwnProperty(field))) {
				throw new Error(`${className} MUST be instantiated with: "${requiredNamesCSV}"`);
			}

			this._partial = this._initPartial();
			this.setValues(defaults);
			this.setValues(params);

			SwaggerObject.apply(this, arguments);

		}

		Object.defineProperty(constructor, 'name', { value: className });
		constructor.prototype = Object.create(SwaggerObject.prototype);
		constructor.prototype.constructor = constructor;
		constructor.prototype._partial = {};

		return constructor;

	}


	linkClassTable (classTable) {

		this.required = mapValues(this.required, type => ref(type, classTable));
		this.optional = mapValues(this.optional, type => ref(type, classTable));
		this.isClassTableLinked = true;

	}


	linkClassPartial (Class) {

		if (!this.isClassTableLinked) {
			throw new Error('Link class table first.');
		}

		const allFields = this.allFields();

		Class.prototype._initPartial = function () {

			const partial = {};

			forOwn(allFields, (type, field) => {

				if (field === '*') {
					return;
				}

				const typeObj = new SwaggerType(type);

				if (typeObj.isArrayCollection) {
					partial[field] = [];
				}
				else if (typeObj.isObjectCollection) {
					partial[field] = {};
				}

			});

			return partial;

		};

	}


	linkClassMethods (Class) {

		if (!this.isClassTableLinked) {
			throw new Error('Link class table first.');
		}

		const prototype = Class.prototype;
		const className = this.className;
		const optional = this.optional;

		if (optional.hasOwnProperty('*')) {

			const typeObj = new SwaggerType(optional['*']);

			const setter = typeObj.setter(className);
			const getter = typeObj.getter(className);
			
			prototype.set = function (field, value) {
				setter(this._partial, field, value);
			};

			prototype.get = function (field) {
				return getter(this._partial, field);
			};

		}

		forOwn(this.allFields(), (type, field) => {

			if (field === '*') {
				return;
			}

			const typeObj = new SwaggerType(type);

			const getter = typeObj.getter(className);
			const setter = typeObj.setter(className);


			Object.defineProperty(prototype, field, {

				get: function () {
					return getter(this._partial, field);
				},

				set: function (value) {
					setter(this._partial, field, value);
				},

			});

			if (typeObj.isCollection) {

				const collectionSetter = typeObj.collectionSetter(className);
				const methodName = `set${capitalize(field)}`;

				prototype[methodName] = function (...args) {
					collectionSetter(this._partial, field, ...args);
				};

			}

		});

		Object.defineProperty(prototype, 'requiredFields', {
			get: () => this.required
		});

		Object.defineProperty(prototype, 'optionalFields', {
			get: () => this.optional
		});

		prototype.setValues = function (params) {

			const fieldNames = Object
				.keys(this.requiredFields)
				.concat(Object.keys(this.optionalFields));

			Object.assign(this, pick(params, fieldNames));

		}

		prototype.merge = function (values) {
			this.setValues(values instanceof prototype.constructor? values.document: values);
		};

		prototype.toJSON = function () {
			return this.document;
		}

		Object.defineProperty(prototype, 'document', {
			get: function () {

				return (function buildDoc (partial) {
		
					if (Array.isArray(partial)) {
						return partial.map(buildDoc);
					}
					else if (partial.constructor === Object) {
						return mapValues(partial, buildDoc);
					}
					else if (typeof partial === 'object' && 'document' in partial) {
						return partial.document;
					}

					return partial;

				})(this._partial);

			}
		});

	}


	linkClass (Class, classTable) {
		this.linkClassTable(classTable);
		this.linkClassPartial(Class);
		this.linkClassMethods(Class);
	}

}



function ref (type, classTable) {

	if (Array.isArray(type)) {
		return type.map(subType => ref(subType, classTable));
	}

	if (type.constructor === Object) {
		return mapValues(type, subType => ref(subType, classTable));
	}

	if (typeof type !== 'string' || type[0] !== '#') {
		return type;
	}

	const refName = type.substring(1);
	if (!classTable.hasOwnProperty(refName)) {
		throw Error(`Class "${refName}" is not defined!`);
	}

	return classTable[refName];

}



module.exports = SwaggerClass;