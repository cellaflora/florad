const fs = require('fs');
const execa = require('execa');
const debug = require('../debug')('link');
const NPMModules = require('../npm-modules');
const nodePreGYP = require('node-pre-gyp');
const path = require('path');



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
				debug(`${lambda.debugName}: use ${module}@${version}`);

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

			debug(`${lambda.debugName}: $npm install`);
			return npminstall.then(() => {
				debug(`${lambda.debugName}: $npm install finished`);
				return lambda;
			})
			.catch(() => Promise.reject(new Error(`FAILED: ${cwd}/npm i --json --silent`)));

		})
		.then(() => {

			debug(`${lambda.debugName}: fetching dependencies tree`);
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

				const cwd = module.path;
				const target = `${lambda.configuration.runtime.substring(6)}.0`;

				try {

					const objectPath = nodePreGYP.find(path.join(cwd,'package.json'), {
						runtime: 'node',
						target,
						target_platform: 'linux',
						target_arch: 'x64',
					});

					if(fs.existsSync(objectPath)) {
						debug(`${lambda.debugName}: ${module.name} already compiled`);
						return Promise.resolve(lambda);
					}

				}
				catch (issue) {}


				debug(`${lambda.debugName}: $node-pre-gyp ${module.name}`);

				
				const args = [
					'--verbose', 
					'install',
					'--update-binary',
					'--runtime=node',
					`--target=${target}`,
					'--target_platform=linux',
					'--target_arch=x64',
				];

				const exe = lambda.project.npmWhichBin('node-pre-gyp');
				const nodePreGyp = execa(exe, args, {cwd});

				return nodePreGyp.then(result => {

					debug(`${lambda.debugName}: $node-pre-gyp ${module.name} finished`);
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