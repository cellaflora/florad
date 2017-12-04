const fs = require('fs');
const pick = require('lodash/pick');



exports.handler = (event, context, callback) => {

	let filter = () => true;
	const { params } = event;
	const pathParams = params.path;
	const o = pick({'me': 'jacob'}, ['me']);
	console.log(o);


	Object.keys(params.path).forEach(name => {
		if (name === 'userId') {
			const user = pathParams[name];
			filter = prospect => prospect.startsWith(user);
		}
	});


	callback(null, {
		statusCode: 200,
		payload: {
			users: ['rob@cellaflora.com', 'jacob@cellaflora.com', 'brad@cellaflora.com'].filter(filter),
			db: DATABASE_HOST,
		},
	});
	
};