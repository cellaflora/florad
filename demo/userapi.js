const path = require('path');
const debug = require('debug')('userapi');
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
const { gateway } = project;


project.defineLambda({
	name: 'getusers',
	path: path.resolve(__dirname, 'getusers'),
	runtime: 'nodejs6.10',
	role: 'arn:aws:iam::339734559946:role/execute_lambda',
});

gateway.get('/users', gateway.lambda('getusers'));

project.build()
	.then(() => project.deploy())
	.then(console.log)
	.catch(console.error);



// debug('build and deploy lambdas');
// project.build()
// 	.then(() => project.deploy())
// 	.then(deployed => {

// 		project.gateway.get('/users', (req, res) => {

// 			req.when('application/json').accepts({ template: '#/templates/mock' });
// 			req.integrates({
// 				type: gateway.constants.Lambda,
// 				uri: `arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${deployed.version.arn}/invocations`
// 			});
// 			res.when('default').responds({
// 				status: 200,
// 				model: '#/definitions/Empty',
// 			});

// 		});

// 		return project.gateway.run()

// 	})
// 	.then(schema => {

// 		const apigatewaySDK = new AWS.APIGateway({
// 			apiVersion: '2015-07-09',
// 			credentials: new AWS.SharedIniFileCredentials({profile: project.aws.profile}),
// 			region: project.aws.region,
// 		});

// 		const definition = {
// 			body: new Buffer(JSON.stringify(schema)),
// 			failOnWarnings: true,
// 			restApiId: 'klkeg3s40h',
// 			mode: 'overwrite',
// 		};

// 		// importRestAPI
// 		// return apigatewaySDK.putRestApi(definition).promise()
// 		return schema;

// 	})
// 	.then(console.log)
// 	.catch(console.error);