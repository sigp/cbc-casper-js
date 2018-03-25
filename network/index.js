class Network {

	constructor(validators) {
		this.validators = validators;
		this.log = [];
		this.queues = this.initQueues(validators);
	}

	initQueues(validators) {
		return validators.reduce((acc, v) => {
			acc[v.name] = [];
			return acc;
		}, {});
	}

	getLog() {
		return this.log;
	}

	send(msg, from, to) {
		const d = new Date();

		if(this.queues[from] === undefined) {
			throw new ReferenceError("from is unknown");
			return;
		}
		if(this.queues[to] === undefined) {
			throw new ReferenceError("to is unknown");
			return;
		}

		const packet = {
			msg,
			to,
			from,
			timestamp: d.getTime()
		}

		this.queues[to].push(packet);
		this.log.push(packet);
	}

	receive(who) {
		if(this.queues[who] === undefined) {
			throw new ReferenceError("validator is unknown");
			return;
		}
		const msgs = this.queues[who];
		this.queues[who] = [];
		return msgs;
	}
}
module.exports.Network = Network;
