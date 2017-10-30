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


/*
s3://gatewaytest.flora/config.json
{
	"environment": {
		"DATABASE_HOST": "localhost"
	},
	"defaults": {
		"lambda": {
			"runtime": "nodejs6.10",
			"role": "arn:aws:iam::339734559946:role/execute_lambda",
			"vpcConfig": {
				"subnetIds": ["subnet-0cb58c27", "subnet-c7d27ffa"],
				"securityGroupIds": ["sg-04c2487c"]
			}
		}
	}
}
*/


project.defineLambda({
	name: 'getusers',
	path: path.resolve(__dirname, 'getusers'),
});
const gateway = project.gateway;


gateway.get('/users', gateway.lambda('getusers'));
gateway.get('/users/{userId}', gateway.lambda('getusers'));


project.build()
	.then(() => project.deploy({force: true}))
	// .then(() => project.publish('staging'))
	.catch(console.error);