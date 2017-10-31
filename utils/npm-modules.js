const path = require('path');
const fs = require('fs');
const execa = require('execa');
const find = require('find');
const keys = require('lodash/keys');
const findIndex = require('lodash/findIndex');
const uniqBy = require('lodash/uniqBy');
const without = require('lodash/without');
const cache = {};


class NPMModules {

	static dependencyTree (cwd, reuseLock = false) {

		if (cache[cwd]) {
			return Promise.resolve(cache[cwd]);
		}

		const potentialLockPath = path.resolve(cwd, '../package-lock.json');
		let npmls = null;


		if (fs.existsSync(potentialLockPath) && reuseLock) {

			npmls = new Promise((resolve, reject) => {
				fs.readFile(potentialLockPath, (error, buffer) => {
					try {

						if (error) {
							throw error;
						}
						resolve(JSON.parse(buffer).dependencies);

					}
					catch (issue) {

						npmls = execa('npm', [ 'ls', '--json' ], {cwd});
						npmls.stderr.pipe(process.stderr);
						npmls = npmls
							.then(result => JSON.parse(result.stdout).dependencies)
							.then(resolve)
							.catch(reject);
						
					}

				});
			});

		}
		else {

			npmls = execa('npm', [ 'ls', '--json' ], {cwd});
			npmls.stderr.pipe(process.stderr);
			npmls = npmls.then(result => JSON.parse(result.stdout).dependencies);

		}


		return npmls.then(tree => {

			tree = tree || {};
			cache[cwd] = tree;

			// resolve module paths
			const allModules = [];
			const stack = keys(tree).map(name => {

				const node = tree[name];
				node.name = name;
				node.dependencies = node.dependencies || {};
				node.path = name;
				keys(node.requires||{}).forEach(required => {

					if (tree[required] &&
						!node.dependencies.hasOwnProperty(required))
					{
						node.dependencies[required] = tree[required];
					}

				});
				node._mark = true;

				return node;
			});

			while (stack.length > 0) {

				const node = stack.shift();

				const children = keys(node.dependencies)
					.filter(module => {
						return !(node.dependencies[module]||{})._mark;
					})
					.map(module => {

						const child = node.dependencies[module];
						child.name = module;
						child.dependencies = child.dependencies || {};
						child.path = path.join(node.path, 'node_modules', module);
						keys(child.requires||{}).forEach(required => {

							if (tree[required] &&
								!child.dependencies.hasOwnProperty(required))
							{
								child.dependencies[required] = tree[required];
							}

						});
						child._mark = true;

						return child;

					});

				stack.push(...children);
				allModules.push(node);

			}

			allModules.forEach(node => {

				const comps = node.path.split(path.sep);
				for (let i = 0; i < comps.length; i++) {
					try {
						const resolved = path.join(cwd, ...comps.slice(0,i), node.name);
						if (fs.statSync(resolved).isDirectory()) {
							node.path = resolved;
							break;
						}
					}
					catch (issue) {
						node.path = null;
					}
				}

			});


			const treeCache = {};
			Object.defineProperty(tree, 'flat', {get: () => allModules});
			Object.defineProperty(tree, 'cache', {get: () => treeCache});
			Object.defineProperty(tree, 'rootPath', {get: () => cwd});

			return tree;

		}).catch(issue => {
			console.error(issue);
			return Promise.reject(new Error(`FAILED: ${cwd}/npm ls --json`))
		});

	}


	static findGypModules (tree) {

		if (tree.cache.hasOwnProperty('findGypModules')) {
			return Promise.resolve(tree.cache['findGypModules']);
		}

		const pregypModules = [];
		tree.flat.forEach(node => {
			if (node.dependencies.hasOwnProperty('node-pre-gyp')) {
				pregypModules.push(node);
			}
		});

		return new Promise(resolve => {

			find.file(/\.gyp$/, tree.rootPath, gypFilePaths => {

				const whichModule = filePath => {

					const lastIdxModule = filePath.lastIndexOf('node_modules');
					const moduleDirectory = filePath.substr(0, lastIdxModule + 13);
					const module = filePath.substr(lastIdxModule + 13).match(/(^[^\\\/]+)/)[1];
					const modulePath = path.join(moduleDirectory, module);
					return modulePath;

				};

				const gypOnlyModulesPaths = without(
					uniqBy(gypFilePaths.map(p => whichModule(p))),
					...pregypModules.map(node => node.path)
				);
				const gypOnlyModules = tree.flat.filter(node =>
					gypOnlyModulesPaths.indexOf(node.path) !== -1);

				resolve(gypOnlyModules);

			});

		}).then(gypOnlyModules => ({pregyp: pregypModules, gyp: gypOnlyModules}));

	}

}



module.exports = NPMModules;