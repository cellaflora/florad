const fs = require('fs');
const execa = require('execa');
const debug = require('debug')('link');
const NPMModules = require('../npm-modules');



class LambdaLink {

	constructor (lambda) {
		this.lambda = lambda;
	}


	_npmPackage () {

		const lambda = this.lambda;
		const project = lambda.project;

		return project.dependencyTree().then(dtree => {

			const dependencies = {};
			lambda.externals.forEach(module => {

				const version = (dtree[module]||{version:null}).version;
				dependencies[module] = version;
				debug(`${lambda.debugName} will use ${module}@${version}`);

			});

			const npmPackage = {
				name: lambda.name,
				version: project.version,
				description: `Lambda function ${lambda.name}`,
				main: `${lambda.name}.js`,
				bin: {},
				scripts: {},
				repository: project.repository,
				author: project.author,
				license: project.license,
				dependencies,
			};
			return npmPackage;

		});

	}


	install () {

		const lambda = this.lambda;

		return this._npmPackage().then(npmPackage => {

			if (typeof this.lambda.prenpm === 'function') {
				npmPackage = this.lambda.prenpm(npmPackage);
			}

			// npm install
			fs.writeFileSync(lambda.packagePath, JSON.stringify(npmPackage, null, 4));
			try { fs.mkdirSync(lambda.modulesDirectory) } catch (issue) {}

			const cwd = lambda.buildDirectory;
			const npminstall = execa('npm', [ 'i', '--json', '--silent' ], {cwd});

			debug(`$npm install (for ${lambda.debugName})`);
			return npminstall.then(() => {
				debug(`$npm install (for ${lambda.debugName}) finished`);
				return lambda;
			})
			.catch(() => Promise.reject(new Error(`FAILED: ${cwd}/npm i --json --silent`)));

		})
		.then(() => {

			debug(`fetching ${lambda.debugName} dependencies tree`);
			return NPMModules.dependencyTree(lambda.modulesDirectory, true);

		})
		.then(tree => NPMModules.findGypModules(tree))
		.then(gypModules => {

			// node-pre-gyp --update-binary
			gypModules.gyp.forEach(module => {
				console.error(`Warning: ${module.name} does not use node-pre-gyp ` + 
					`and might fail at runtime`);
			});

			return Promise.all(gypModules.pregyp.map(module => {

				debug(`$node-pre-gyp ${module.name} (for ${lambda.debugName})`);

				const cwd = module.path;
				const args = [
					'--verbose', 
					'install',
					'--update-binary',
					'--runtime=node',
					`--target=${lambda.configuration.runtime.substring(6)}.0`,
					'--target_platform=linux',
					'--target_arch=x64',
				];

				const exe = lambda.project.npmWhichBin('node-pre-gyp');
				const nodePreGyp = execa(exe, args, {cwd});

				return nodePreGyp.then(result => {

					debug(`$node-pre-gyp ${module.name} (for ${lambda.debugName}) finished`);
					return lambda;

				})
				.catch(error => {

					console.error(`Warning: $node-pre-gyp ${args.join(' ')} ` +
						`(cwd:${cwd}) FAILED`);
					console.error(`Warning: ${module.name} has no pre-gyp archive ` + 
						`and might fail at runtime`);
					return Promise.resolve(lambda);

				});


			}))

			return gypModules;

		});

	}

}



module.exports = LambdaLink;