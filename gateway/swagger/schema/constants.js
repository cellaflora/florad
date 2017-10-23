module.exports = {
	// Integration Type
	Mock: 'mock',
	Lambda: 'lambda',
	HTTP: 'http',
	AWS: 'aws',

	// Integration Passthrough Behavior
	WhenNoMatch: 'when_no_match',
	WhenNoTemplates: 'when_no_templates',
	Never: 'never',

	// Content Handling
	ConvertToText: 'CONVERT_TO_TEXT',
	ConvertToBinary: 'CONVERT_TO_BINARY',

	// Http Methods
	ANY: 'ANY',
	DELETE: 'DELETE',
	PUT: 'PUT',
	GET: 'GET',
	HEAD: 'HEAD',
	OPTIONS: 'OPTIONS',
	PATCH: 'PATCH',
	POST: 'POST',
};