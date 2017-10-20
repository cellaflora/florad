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

	static dependencyTree (cwd) {

		if (cache[cwd]) {
			return Promise.resolve(cache[cwd]);
		}

		const npmls = execa('npm', [ 'ls', '--json' ], {cwd});
		return npmls.then(result => {

			let tree = {};
			try { tree = JSON.parse(result.stdout).dependencies; } catch (e) {}
			cache[cwd] = tree;


			// resolve module paths
			const allModules = [];
			const stack = keys(tree).map(module => {
				tree[module].name = module;
				tree[module].dependencies = tree[module].dependencies || {};
				tree[module].path = module;
				return tree[module];
			});

			while (stack.length > 0) {

				const node = stack.shift();

				const children = keys(node.dependencies).map(module => {
					const child = node.dependencies[module];
					child.name = module;
					child.dependencies = child.dependencies || {};
					child.path = path.join(node.path, module);
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

		}).catch(() => Promise.reject(new Error(`FAILED: ${cwd}/npm ls --json`)));

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