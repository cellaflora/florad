
module.exports = function flora ({Project}) {

	const project = new Project({ aws: { profile: 'cellaflora' } });

	project.defineLambda({entry: './getusers'});

	const gateway = project.gateway;
	gateway.defineValidator('getusers-validator', {
		validateRequestBody: false,
		validateRequestParameters: false,
	});


	gateway.get('/users', gateway.lambda('getusers'), (req, res) => {
		req.usesValidator('getusers-validator');
	});


	gateway.post('/users', gateway.lambda('getusers'), (req, res) => {
		req.usesValidator('getusers-validator');
	});

	gateway.get('/users/{userId}', gateway.lambda('getusers'));

};