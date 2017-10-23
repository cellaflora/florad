
exports.handler = (event, context, callback) => {

	callback(null, {
		statusCode: 200,
		payload: {
			users: ['rob@cellaflora.com', 'jacob@cellaflora.com', 'brad@cellaflora.com'],
		},
	});
	
};