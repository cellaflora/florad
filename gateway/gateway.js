const middleware = require('./middleware');
const extensions = require('./extension');
const swagger = require('./swagger');
const debug = require('../utils/debug')('gateway');



class Gateway {

	constructor ({ name, version, aws = {} }, patch = []) {

		this.name = name;
		this.version = version;
		this.aws = aws;

		this.middleware = middleware.slice();

		this.schema = new swagger.OpenAPI({
			info: new swagger.Info({ title: name, version }),
			paths: new swagger.Paths(),
		});

		extensions.concat(patch).forEach(ext => ext(this));

		this.programs = [];

		this.get     = this.GET     = this.method.bind(this, 'get');
		this.post    = this.POST    = this.method.bind(this, 'post');
		this.put     = this.PUT     = this.method.bind(this, 'put');
		this.delete  = this.DELETE  = this.method.bind(this, 'delete');
		this.options = this.OPTIONS = this.method.bind(this, 'options');
		this.head    = this.HEAD    = this.method.bind(this, 'head');
		this.patch   = this.PATCH   = this.method.bind(this, 'patch');
		this.trace   = this.TRACE   = this.method.bind(this, 'trace');

		Object.defineProperty(this, 'isEmpty', {get: () => this.programs.length === 0});

	}


	run () {

		return this.programs.reduce(
			(prev, prog) => prev.then(() => new Promise(prog))
			, Promise.resolve()
		).then(() => this.schema);

	}


	method (method, path, ...methodMiddleware) {

		const integration = new swagger.APIGatewayIntegration({
			type: 'mock',
			responses: {},
			requestTemplates: {},
			passthroughBehavior: "when_no_match",
			cacheNamespace: this.schema.info.title + this.schema.basePath,
		});

		const operation = new swagger.Operation({
			responses: {},
			'x-amazon-apigateway-integration': integration
		});

		const pathItem = this.schema.paths.get(path);

		if (!pathItem) {

			const pathItem = new swagger.PathItem({ [method]: operation });
			this.schema.paths.set(path, pathItem);

		}
		else {
			pathItem[method] = operation;
		}


		const request = { method, path, operation };
		const response = { method, path, operation };


		const program = middleware.slice();
		program.push(...methodMiddleware);


		this.programs.push((resolve, reject) => {
			(program.reverse().reduce((next, middleware) => {
				return (error) => {

					if (error) {
						reject(error);
						return;
					}

					if (middleware.length < 3) {
						next(middleware.call(this, request, response));
						return;
					}

					middleware.call(this, request, response, next);

				};
			}, (error) => {

				if (error) {
					reject(error);
					return;
				}

				debug(`${this.name}: ${method.toUpperCase()} ${path}`);
				resolve();

			}))();
		});


		return;

	}

}



module.exports = Gateway;