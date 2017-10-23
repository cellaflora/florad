const path = require('path');
const Project = require('../project');
const LambdaLocal = require('../lambda/lambda-local');
const NPMModules = require('../npm-modules');


const aws = {
	profile: 'cellaflora',
	deployBucket: 'cellaflora-flora'
};

const project = new Project({ 
	projectDirectory: path.resolve(__dirname, '..'),
	buildDirectory: path.resolve(__dirname, 'build'),
	aws,
});

const lambda = new LambdaLocal(project, {
	name: 'helloworld',
	path: path.resolve(__dirname, 'helloworld'),
	runtime: 'nodejs6.10',
	role: 'arn:aws:iam::339734559946:role/execute_lambda',

	prewebpack: config => config,  // optional
	prenpm: config => config,  // optional
	prelambda: config => config,  // optional
});

lambda.build()
	// .then(() => lambda.link())
	// .then(() => lambda.package())
	.then(() => lambda.deploy({useS3: true}))
	// .then(console.log)
	.catch(console.error);