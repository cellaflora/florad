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
			return tree;

		});

	}

}



module.exports = NPMModules;