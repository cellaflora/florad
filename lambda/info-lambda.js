const path = require('path');
const pick = require('lodash/pick');
const cloneDeep = require('lodash/cloneDeep');
const mergeWith = require('lodash/mergeWith');
const merge = require('lodash/merge');
const union = require('lodash/union');

const LambdaVersion = require('./lambda-version');




class InfoAWS {

	static supportedConfiguration (prospect) {

		const picked = pick(prospect, ['runtime', 'role', 'memorySize', 'timeout', 'vpcConfig']);
		picked.vpcConfig = cloneDeep(pick(picked.vpcConfig, ['subnetIds', 'securityGroupIds']));
		return picked;

	}


	constructor (info = {}) {

		this.aws = info.aws;
		this.project = info.project;
		this.paths = { entry: require.resolve(info.paths.entry) };


		if (!info.name) {
			const parts = path.parse(this.paths.entry);
			this.name = parts.name;
		}
		else {
			this.name = info.name;
		}
		this.debugName = this.name.toUpperCase();


		this.paths.build = info.paths.build;
		this.paths.lambda = this.resolveBuildPath(this.name);
		this.paths.modules = this.resolveLambdaPath('node_modules');
		this.paths.package = this.resolveLambdaPath('package.json');
		this.paths.archive = this.resolveBuildPath(`${this.name}.zip`);
		this.aws.archiveKey = `${this.name}.zip`;

		
		this.versions = [];
		this.version = new LambdaVersion();
		this.archive = null;


		this._configuration = InfoAWS.supportedConfiguration(info);
		Object.defineProperty(this, 'configuration', {
			get: () => cloneDeep(this._configuration)
		});


		this.environment = Object.assign({}, info.environment);


		if (typeof info.prewebpack === 'function') {
			this.prewebpack = info.prewebpack;
		}

		if (typeof info.prenpm === 'function'){
			this.prenpm = info.prenpm;
		}

		if (typeof info.prelambda === 'function'){
			this.prelambda = info.prelambda;
		}


	}


	prewebpack (config) {
		return config;
	}


	prenpm (config) {
		return config;
	}


	prelambda (config) {
		return config;
	}


	resolveBuildPath (...p) {
		if (!path.isAbsolute(path.join(...p))) {
			return path.resolve(this.paths.build, ...p);
		}
		return path.join(...p);
	}


	resolveLambdaPath (...p) {
		if (!path.isAbsolute(path.join(...p))) {
			return path.resolve(this.paths.lambda, ...p);
		}
		return path.join(...p);
	}


	mergeConfiguration (toMerge) {

		const merger = (left, right) => mergeWith(left, right, (left, right) => {

			if (Array.isArray(left) && Array.isArray(right)) {
				return union(left, right);
			}
			if (typeof left === 'object' && typeof right === 'object') {
				return merger(left, right);
			}
			return right;
			
		});
		merger(this._configuration, InfoAWS.supportedConfiguration(toMerge));
		return this.configuration;

	}

}



module.exports = InfoAWS;