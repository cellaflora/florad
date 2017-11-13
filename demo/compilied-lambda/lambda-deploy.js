if (!process.env.DEBUG) {
	process.env.DEBUG = 'compiler,link,project,package,lambda,deploy,gateway,gateway-aws';
}

const path = require('path');
const Project = require('../../project');


const aws = {
	profile: 'cellaflora',
	bucket: 'cellaflora-flora'
};

const project = new Project({
	paths: {
		project: __dirname,
		build: 'build',
	},
	aws,
});

project.defineLambda({
	name: 'compiled-lambda',
	entry: path.resolve(__dirname, 'lambda'),
	runtime: 'nodejs6.10',
	role: 'arn:aws:iam::339734559946:role/execute_lambda',
	prewebpack: config => config,  // optional
	prenpm: config => config,  // optional
	prelambda: config => config,  // optional
});

project.build()
	.then(() => project.deploy({useS3: true, force: true}))
	.catch(console.error);