
module.exports = function flora ({Project}) {

	const project = new Project({ aws: { profile: 'cellaflora' } });

	project.defineLambda({entry: './getusers'});

	const gateway = project.gateway;
	gateway.get('/users', gateway.lambda('getusers'));
	gateway.get('/users/{userId}', gateway.lambda('getusers'));

};