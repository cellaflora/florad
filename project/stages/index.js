const lambda = require('./lambda');
const gateway = require('./gateway');



exports.configure = (project) => {

	lambda(project);
	gateway(project);
	
	project.task('build', 'lambda:build');
	project.task('deploy', 'lambda:deploy', 'gateway:build', 'gateway:deploy', 'gateway:link-lambda');
	project.task('publish', 'gateway:publish');

};