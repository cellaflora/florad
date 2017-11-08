if (!process.env.DEBUG) {
	process.env.DEBUG = 'compiler,link,project,package,lambda,deploy,gateway,gateway-aws';
}

const path = require('path');
const Project = require('flora/project');


const project = new Project({ 
	name: 'gatewaytest',
	paths: {
		project: __dirname,
		build: 'build',
	},
	aws: { profile: 'cellaflora' },
});


project.defineLambda({ entry: './getusers' });
const gateway = project.gateway;


gateway.get('/users', gateway.lambda('getusers'));
gateway.get('/users/{userId}', gateway.lambda('getusers'));


project.build()
	.then(() => project.deploy({useS3: true, force: false}))
	.then(() => project.publish('staging'))
	.catch(console.error);