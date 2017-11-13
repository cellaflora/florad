const AWSProject = require('./aws-project');
const path = require('path');
const debug = require('../utils/debug')('project');
const Lambda = require('../lambda');
const Gateway = require('../gateway');
const Queue = require('promise-queue');
const uuid = require('uuid').v1;
const fs = require('fs');
const InfoProject = require('./info-project');
const stages = require('./stages');
const keys = require('lodash/keys');



const projects = [];

class Project extends AWSProject {

	static register (project) {
		projects.push(project);
		return project;
	}


	static projects () {
		return projects;
	}


	constructor (info) {

		super(info);
		this._concurency = info.concurency || 4;
		this.tasks = {};
		stages.configure(this);
		Project.register(this);

	}


	task (name, ...tasks) {

		if (!this.tasks.hasOwnProperty(name)) {

			this.tasks[name] = [];

			this[name] = (...args) => {

				console.log(name.toUpperCase());

				return this.configure().then(() => {

					const queue = new Queue(this._concurency);
					const tasks = this.tasks[name];
					
					const serial = tasks.reduce((next, task) => next.then(() => {

						const batch = [];
						const subtasks = task(this.configuration);

						if (Array.isArray(subtasks)) {
							subtasks.forEach(subtask => {
								batch.push(queue.add(() => subtask.apply(this, args)));
							});
						}
						else {
							batch.push(queue.add(() => subtasks.apply(this, args)));
						}

						return Promise.all(batch);

					}), Promise.resolve());


					return serial.then(() => {
						console.log();
						return this;
					});

				});
				
			};

		}

		tasks.forEach(task => {
			typeof task === 'string'
				? this.tasks[name].push(...this.tasks[task])
				: this.tasks[name].push(task);
		});

	}

}



module.exports = Project;