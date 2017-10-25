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

defineLambdas(project);
defineGateway(project.gateway);

project.build()
	.then(() => project.deploy())
	// .then(console.log)
	.catch(console.error);

function defineLambdas(project) {

	project.defineLambda({
		name: 'getusers',
		path: path.resolve(__dirname, 'getusers'),
		runtime: 'nodejs6.10',
		role: 'arn:aws:iam::339734559946:role/execute_lambda',
	});

}

function defineGateway(gateway) {
	gateway.get('/users', gateway.lambda('getusers'));
}