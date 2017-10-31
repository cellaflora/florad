
module.exports = function flora ({Project}) {

	const project = new Project({ 
		name: 'gatewaytest',
		projectDirectory: '.',
		buildDirectory: 'build',
		aws: { profile: 'cellaflora' },
	});

	project.defineLambda({name: 'getusers', path: 'getusers'});

	const gateway = project.gateway;
	gateway.get('/users', gateway.lambda('getusers'));
	gateway.get('/users/{userId}', gateway.lambda('getusers'));

};