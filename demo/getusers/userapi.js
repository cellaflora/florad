if (!process.env.DEBUG) {
	process.env.DEBUG = 'compiler,link,project,package,lambda,deploy,gateway,gateway-aws';
}

const path = require('path');
const Project = require('../../project');


const project = new Project({ 
	name: 'gatewaytest',
	projectDirectory: __dirname,
	buildDirectory: path.resolve(__dirname, 'build'),
	aws: { profile: 'cellaflora' },
});


project.defineLambda({
	name: 'getusers',
	path: path.resolve(__dirname, 'getusers'),
	runtime: 'nodejs6.10',
	role: 'arn:aws:iam::339734559946:role/execute_lambda',
});
const gateway = project.gateway;


gateway.get('/users', gateway.lambda('getusers'));
gateway.get('/users/{userId}', gateway.lambda('getusers'));


project.build()
	.then(() => project.deploy())
	// .then(() => project.publish('staging'))
	.catch(console.error);