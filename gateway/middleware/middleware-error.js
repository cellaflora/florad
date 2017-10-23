class MiddlewareError extends Error {

	constructor (type, thing, {path, method}) {

		super (thing
				? `Could not find ${type} '${thing}' for ${path} (${method.toUpperCase()}).`
				: `Could not find ${type} for ${path} (${method.toUpperCase()}).`
				);

	}

}

module.exports = MiddlewareError;