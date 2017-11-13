const nullVersion = {arn: null, hash: null, lastModified: null};



class LambdaVersion {

	constructor ({arn = null, hash = null, lastModified = null} = nullVersion) {

		Object.assign(this, {arn, hash, lastModified});
		this.isNewiest = true;
		this.isResolved = arn && hash && lastModified;
		this.isFirstDeployed = true;

	}


	set (version) {
		this.arn = version.arn;
		this.hash = version.hash;
		this.lastModified = version.lastModified;
	}


	sameVersion (version) {
		return version.hash === this.hash && !version.arn.endsWith('$LATEST');
	}


	resolveWith (versions) {

		let foundVersion = null;

		const isNewiest = versions.every(version => {
			foundVersion = version;
			return !this.sameVersion(version);
		});

		this.isFirstDeployed = versions.length === 0;
		this.isNewiest = isNewiest;
		this.isResolved = true;

		if (!isNewiest && foundVersion) {
			this.set(foundVersion);
		}

	}

}


module.exports = LambdaVersion;