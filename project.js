const path = require('path');
const debug = require('debug')('project');
const NPMModules = require('./npm-modules');



class LambdaProject {

	constructor ({projectDirectory, buildDirectory, aws = {}}) {

		Object.assign(this, {projectDirectory, buildDirectory});
		this.moduleDirectory = path.resolve(this.projectDirectory, 'node_modules');
		this.muduleBinDirectory = path.resolve(this.moduleDirectory, '.bin');
		this.packagePath = path.resolve(this.projectDirectory, 'package.json');
		this.package = require(this.packagePath);
		this._cache = {};

		this.version = this.package.version;
		this.repository = this.package.repository;
		this.author = this.package.author;
		this.license = this.package.license;

		this.aws = Object.assign({
			profile: 'default',
			region: 'us-east-1',
			deployBucket: null,
		}, aws);

	}


	dependencyTree () {

		debug(`fetching dependencies tree`);
		return NPMModules.dependencyTree(this.moduleDirectory);

	}


	npmWhichBin (command) {
		return path.resolve(path.resolve(this.muduleBinDirectory, command));
	}

}



module.exports = LambdaProject;