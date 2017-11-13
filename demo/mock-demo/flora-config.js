

module.exports = function flora ({Project}) {

	const project = new Project({ aws: { profile: 'cellaflora' } });
	const gateway = project.gateway;

	gateway.get('/name',  gateway.mock({name: 'jacob mcdorman'}));

}