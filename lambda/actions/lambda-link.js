const fs = require('fs');
const execa = require('execa');
const debug = require('../../utils/debug')('link');
const NPMModules = require('../utils/npm-modules');
const nodePreGYP = require('node-pre-gyp');
const path = require('path');
const polyfillVersion = require('../../package.json').dependencies['babel-polyfill'];



class LambdaLink {

	static _projectDependencyTree (lambda) {

		debug(`${lambda.debugName}: fetching project dependencies tree`);
		return NPMModules.dependencyTree(lambda.project.paths.modules, true).then(tree => {
			return tree;
		});

	}


	static _npmPackage (lambda) {

		return LambdaLink._projectDependencyTree(lambda).then(dtree => {

			const dependencies = {
				'babel-polyfill': polyfillVersion,
			};

			lambda.externals.forEach(module => {

				if (dependencies.hasOwnProperty(module)) {
					return;
				}

				const version = (dtree[module]||{version:null}).version;

				if (!version) {
					throw new Error(`Dependency ${module} is not installed.`);
				}

				dependencies[module] = version;
				debug(`${lambda.debugName}: use ${module}@${version}`);

			});

			const npmPackage = {
				name: lambda.name,
				version: lambda.project.version,
				description: `Lambda function ${lambda.name}`,
				main: `${lambda.name}.js`,
				bin: {},
				scripts: {},
				repository: lambda.project.repository,
				author: lambda.project.author,
				license: lambda.project.license,
				dependencies,
			};
			return npmPackage;

		});

	}


	static install (lambda) {

		return LambdaLink._npmPackage(lambda).then(npmPackage => {

			if (typeof lambda.prenpm === 'function') {
				npmPackage = lambda.prenpm(npmPackage);
			}

			// npm install
			fs.writeFileSync(lambda.paths.package, JSON.stringify(npmPackage, null, 4));

			const cwd = lambda.paths.lambda;
			const npminstall = execa('npm', [ 'i', '--json', '--silent' ], {cwd});

			debug(`${lambda.debugName}: $npm install`);
			return npminstall.then(() => {

				try { fs.mkdirSync(lambda.paths.modules) } catch (issue) {}
				return lambda;

			})
			.catch(() => Promise.reject(new Error(`FAILED: ${cwd}/npm i --json --silent`)));

		})
		.then(() => {

			debug(`${lambda.debugName}: fetching dependencies tree`);
			return NPMModules.dependencyTree(lambda.paths.modules, true);

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

				const exe = path.resolve(require.resolve('node-pre-gyp'),
					'../../bin/node-pre-gyp');
				const nodePreGyp = execa(exe, args, {cwd});

				return nodePreGyp.then(result => lambda)
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