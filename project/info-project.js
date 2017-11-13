const pick = require('lodash/pick');
const path = require('path');
const AWS = require('aws-sdk');
const fs = require('fs');
const select = (val, def) => typeof val !== 'undefined' && val !== null? val: def;


class InfoProject {

	constructor ({ name, version, aws = {}, paths = {}, configuration = {} }) {

		this.paths = {};
		this.aws = {};

		// setup paths
		if (!paths.project) {
			this.paths.project = process.env['FLORA_CWD'] || process.cwd();
		}
		else {
			if (!path.isAbsolute(paths.project)) {
				this.paths.project = path.resolve(process.env['FLORA_CWD'] || process.cwd(), p);
			}
			else {
				this.paths.project = paths.project;
			}
		}

		this.paths.build = this.resolvePath(select(paths.build, 'flora.build'));
		this.paths.modules = this.resolvePath('./node_modules');
		this.paths.bin = this.resolvePath('./node_modules/.bin');
		this.paths.packageJSON = this.resolvePath('./package.json');
		this.paths.schema = path.resolve(this.paths.build, 'api.json');

		if (!fs.existsSync(this.paths.build)) {
			fs.mkdirSync(this.paths.build);
		}


		// setup info
		const packageJSON = require(this.paths.packageJSON);

		this.name = name || packageJSON.name;
		this.version = version || packageJSON.version;
		this.fullname = `${this.name}-v${this.version}`;
		this.repository = packageJSON.repository;
		this.author = packageJSON.author;
		this.license = packageJSON.license;
		this.time = new Date().toJSON();

		this.environment = {};
		this.hasEnvironment = name => this.environment.hasOwnProperty(name);

		this.defaults = {};
		this.hasDefault = name => this.defaults.hasOwnProperty(name);


		// setup AWS info
		this.aws.profile = select(aws.profile, 'default');
		this.aws.region = select(aws.region, 'us-east-1');
		this.aws.bucket = select(aws.bucket, `${this.name}.flora`);
		this.aws.credentials = new AWS.SharedIniFileCredentials({profile: this.aws.profile});
		this.aws.account = null;

		this.configuration = configuration;

	}


	resolvePath (...p) {
		if (!path.isAbsolute(path.join(...p))) {
			return path.resolve(this.paths.project, ...p);
		}
		return path.join(...p);
	}


	resolveBuildPath (...p) {
		if (!path.isAbsolute(path.join(...p))) {
			return path.resolve(this.paths.build, ...p);
		}
		return path.join(...p);
	}


	resolveRequire (...p) {
		return require.resolve(this.resolvePath(...p));
	}


}



module.exports = InfoProject;