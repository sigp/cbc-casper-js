var estimator = require("./binary");
var utils = require("./binary/utils");
var network = require("./network");
var validators = require("./validators");

const Validator = validators.Validator;
const Network = network.Network;

const messageItinery = function(validators) {
	return validators.reduce((acc, from) => {
		validators.forEach(to => {
			if(utils.randomBool() && to !== from) {
				acc.push([from, to]);
			}
		});
		return acc;
	}, []);
}

const buildInitialMessage = function(validator) {
	return {
		sender: validator.name,
		estimate: validator.startingPoint,
		justification: []
	};
}


const rand = function() {
	const validators = [
		new Validator(name="Andy", weight=100, startingPoint=0),
		new Validator(name="Brian", weight=100, startingPoint=0),
		new Validator(name="Chris", weight=100, startingPoint=1),
	]
	let n = new Network(validators);

	/*
	 * Send the first round of messages
	 */
	const itinery = messageItinery(validators);
	for(i in itinery) {
		const from = itinery[i][0];
		const to = itinery[i][1];
		const msg = buildInitialMessage(from);
		n.send(msg, to.name, from.name);
	}

	/*
	 * Parse the messages
	 */
	validators.forEach(v => {
		n.receive(v.name).forEach(packet => {
			v.parseMessage(packet.msg);
		});
		// console.log(v.generateMessage())
	});
	
	const log = n.getLog();

	const weights = validators.map(v => v.weight)
	const bets = utils.getRandomBets(weights);
	const estimate = estimator.estimate(bets);
	const justification = validators.map((v, i) => {
		v.choice = bets[i].choice;
		return v;
	});

	const randomValidatorIndex = Math.floor(
		Math.random() * validators.length
	);
	const sender = validators[randomValidatorIndex].name;

	const message = {
		sender,
		estimate,
		justification
	}
};

rand();
