

module.exports = function (gateway) {

	gateway.mock = template => (req, res) => {

		req.when('application/json').accepts({ template: '#/templates/mock' });
		req.integrates({ type: gateway.constants.Mock });
		res.when('default').responds({
			status: 200,
			templates: { 'application/json': gateway.inlineJSONTemplate(template) },
			model: '#/definitions/Empty',
		});
		
	};

};