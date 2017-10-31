#!/usr/bin/env node
if (!process.env.DEBUG) {
	process.env.DEBUG = 'compiler,link,project,package,lambda,deploy,gateway,gateway-aws';
}

const path = require('path');
const flora = require('..');
const program = require('commander');
const projectPackage = require('../package.json');




const CONFIG_PATH = './flora-config.js';

program
	.version(projectPackage.version)
	.option('-c, --config <path>', `set config path. defaults to ${CONFIG_PATH}`);


const configure = config => {

	let floraConfig = null;

	if (config) {
		if (path.isAbsolute(config)) {
			floraConfig = config;
		}
		else {
			floraConfig = path.resolve(process.cwd(), config);
		}
	}
	else {
		floraConfig = path.resolve(process.cwd(), CONFIG_PATH);
	}

	const configFunc = require(floraConfig);
	process.env['FLORA_CONFIG_PATH'] = floraConfig;

	if (configFunc.length === 1) {
		return Promise.resolve(configFunc(flora));
	}

	return new Promise((resolve, reject) => {
		configFunc(flora, error => error? reject(error): resolve());
	});

};

program
	.command('build')
	.description('build project')
	.action(command => {

		configure(command.parent.config)
			.then(() => {

				return flora.Project.list().reduce((next, prj) => {
					return next.then(() => prj.build());
				}, Promise.resolve());

			})
			.catch(issue => {
				console.error(issue);
				process.exit(1);
			});



	});

program
	.command('deploy')
	.description('deploy project')
	.option('--force', `force deployment`)
	.option('--s3', `use s3 for deployemtn`)
	.action(command => {

		const force = command.force || false;
		const useS3 = command.s3 || false;

		configure(command.parent.config)
			.then(() => {

				return flora.Project.list().reduce((next, prj) => {
					return next.then(() => prj.deploy({force, useS3}));
				}, Promise.resolve());

			})
			.catch(issue => {
				console.error(issue);
				process.exit(1);
			});

	});


program
	.command('publish <stage>', '')
	.description('publish project to stage')
	.action((stage, command) => {

		configure(command.parent.config)
			.then(() => {

				return flora.Project.list().reduce((next, prj) => {
					return next.then(() => prj.publish(stage));
				}, Promise.resolve());

			})
			.catch(issue => {
				console.error(issue);
				process.exit(1);
			});

	});

program
	.parse(process.argv);