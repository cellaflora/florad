const values = require('lodash/values');



class SwaggerType {

	constructor (type) {

		const isArrayCollection = Array.isArray(type);
		const isObjectCollection = type.constructor === Object;
		const isCollection = isArrayCollection || isObjectCollection;
		const ValidationError = isCollection? SOCollectionTypeError: SOTypeError;

		let memberTypes = [type];

		if (isArrayCollection) {
			memberTypes = type.slice();
		}
		else if (isObjectCollection) {
			memberTypes = values(type);
		}

		Object.defineProperty(this, 'type',               { get: () => type               });
		Object.defineProperty(this, 'isArrayCollection',  { get: () => isArrayCollection  });
		Object.defineProperty(this, 'isObjectCollection', { get: () => isObjectCollection });
		Object.defineProperty(this, 'isCollection',       { get: () => isCollection       });
		Object.defineProperty(this, 'ValidationError',    { get: () => ValidationError    });
		Object.defineProperty(this, 'memberTypes',        { get: () => memberTypes        });

	}


	validator (className) {

		const all = this.memberTypes;
		const ErrorClass = this.ValidationError;
		const typeName = type => type.name.toLowerCase();

		return (field, value) => {

			if (all.every(t => !(value instanceof t) && typeof value !== typeName(t))) {
				throw new ErrorClass(className, field, all);
			}

		};

	}


	setter (className) {

		const validator = this.validator(className);

		if (this.isArrayCollection) {

			return (partial, field, value) => {

				if (!Array.isArray(value)) {
					throw new SOTypeError(className, field, [Array]);
				}

				value.forEach(validator.bind(null, field));
				partial[field] = value.slice();

			};

		}

		else if (this.isObjectCollection) {

			return (partial, field, value) => {

				if (value.constructor !== Object) {
					throw new SOTypeError(className, field, [Object]);
				}

				values(value).forEach(validator.bind(null, field));
				partial[field] = Object.assign({}, value);

			};
		}

		return (partial, field, value) => {

			validator(field, value);

			if (partial.hasOwnProperty(field) &&
				typeof partial[field] === 'object' &&
				typeof partial[field].merge === 'function')
			{
				partial[field].merge(value);
			}
			else {
				partial[field] = value;
			}

		};
	}


	getter (className) {

		if (this.isArrayCollection) {
			
			return (partial, field) => {
				return partial[field].slice();
			};

		}
		else if (this.isObjectCollection) {
			return (partial, field) => Object.assign({}, partial[field]);
		}

		return (partial, field) => partial[field];

	}


	collectionSetter (className) {

		if (!this.isCollection) {
			throw new Error('Collection setter can only be build for collection types.');
		}

		const validator = this.validator(className);

		if (this.isArrayCollection) {

			return (partial, field, index, ..._value) => {

				const collection = partial[field];
				let value = _value[0];

				if (_value.length == 0) {

					value = index;
					index = collection.length;

				}

				validator(field, value);
				

				if (index >= collection.length) {
					collection.push(value);
				}
				else {

					const toReplace = collection[index];
					
					if (typeof toReplace === 'object' &&
						typeof toReplace.merge === 'function')
					{
						toReplace.merge(value);
					}
					else {
						collection[index] = value;
					}

				}

			};

		}

		return (partial, field, key, value) => {

			validator(field, value);

			const collection = partial[field];

			if (collection.hasOwnProperty(key) &&
				typeof collection[key] === 'object' &&
				typeof collection[key].merge === 'function')
			{
				collection[key].merge(value);
			}
			else {
				collection[key] = value;
			}

		};

	}

}



class SOTypeError extends Error {

	constructor (className, field, types) {

		const typesString = types.map(type => type.name).join(', ');
		super(`${className} field "${field}" MUST be type(s): ${typesString}.`);

	}

}



class SOCollectionTypeError extends Error {

	constructor (className, field, types) {

		const typesString = types.map(type => type.name).join(', ');
		super(`${className} field "${field}" collects ONLY type(s): ${typesString}.`);

	}
}



SwaggerType.SOTypeError = SOTypeError;
SwaggerType.SOCollectionTypeError = SOCollectionTypeError;
module.exports = SwaggerType;