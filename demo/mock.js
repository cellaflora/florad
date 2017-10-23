const Gateway = require('../gateway');

gateway = new Gateway('GatewayTest', new Date().toJSON());


const mock = template => (req, res) => {

	req.when('application/json').accepts({ template: '#/templates/mock' });

	req.integrates({ type: gateway.constants.Mock });

	res.when('default').responds({
		status: 200,
		templates: {
			'application/json': gateway.inlineTemplate(template)
		},
		model: gateway.inlineModel({type: 'object', title: 'Empty Schema'}),
	});

};

gateway.get('/user', mock({name: 'jacob mcdorman'}));
gateway.get('/who', mock({name: 'jacob mcdorman'}));


gateway
	.run()
	.then(schema => console.log(JSON.stringify(schema, null, 4)))
	.catch(console.error);