const path = require('path');
const AWS = require('aws-sdk');
const Project = require('../project');
const Gateway = require('../gateway');
const Lambda = require('../Lambda');


const project = new Project({ 
	name: 'GatewayTest',
	projectDirectory: path.resolve(__dirname, '..'),
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
	.catch(console.error);