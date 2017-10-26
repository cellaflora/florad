const debug = require('debug');
const repeat = require('lodash/repeat');
let maxNameLength = 0;

const padder = (name, logger) => (...content) => {
	if (content.length > 0) {
		const adjust = maxNameLength - name.length;
		const padding = adjust > 0? repeat(' ', adjust): '';
		content[0] = padding + content[0];
	}
	logger(...content);
}

module.exports = name => {

	maxNameLength = name.length > maxNameLength? name.length: maxNameLength;
	return padder(name, debug(name));

};