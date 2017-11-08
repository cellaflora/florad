const { archive, load } = require('../utils/archiver');



class LambdaPackage {


	static package (from, to) {
		return archive(from, to);
	}


	static load (from) {
		return load(from);
	}

}



module.exports = LambdaPackage;