const route = require('./route');
const headers = require('./headers');
const queries = require('./queries');
const integrates = require('./integrates');
const when = require('./when');
const validator = require('./validator');
const security = require('./security');

module.exports = [
	route,
	headers,
	queries,
	integrates,
	when,
	validator,
	security,
];