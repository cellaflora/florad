const chalk = require('chalk');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(':memory:');
const bserial = require('bluetooth-serial-port');


exports.handler = (event, context, callback) => {

	console.log('lambda invoked!', db, bserial);

	callback(null, {
		statusCode: 200,
		payload: {
			text: 'hello jacob!!'
		},
	});
	
};