var network = require("../network");
var validators = require("../validators");

const Validator = validators.Validator;
const Network = network.Network;

const randomBool = p => Math.random() <= p;

const getProbability = v => 1 / (Math.pow(v.length, 2) - v.length);

const popRandomElement = function(a) {
	const i = a[Math.round(Math.random() * (a.length - 1))];
	a.splice(i, 1);
	return i;
}

const rand = function(requiredSafetyRatio, messagesPerRound) {
	const validatorInfo = [
		{name: "Andy", weight: 100, startingPoint: 0},
		{name: "Brian", weight: 100, startingPoint: 0},
		{name: "Chris", weight: 100, startingPoint: 1},
	]
	const validators = validatorInfo.map(v => {
		return new Validator(
			name=v.name,
			weight=v.weight,
			startingPoint=v.startingPoint,
		);
	});
	validators.forEach(v => v.learnValidators(validatorInfo));

	let n = new Network(validators);

	const doRound = function(messages) {
		// Send messages
		for(var i = 0; i < messages; i++) {
			let candidates = validators.map((_, i) => i);
			const to = validators[popRandomElement(candidates)];
			const from = validators[popRandomElement(candidates)];
			n.send(from.generateMessage(), from.name, to.name);
		}
		// Receive messages
		validators.forEach(v => {
			n.receive(v.name).forEach(packet => {
				v.parseMessage(packet.msg);
			});
		});
	}
	
	let consensusAchieved = false;
	while(consensusAchieved === false) {
		doRound(messagesPerRound);
		consensusAchieved = true;
		validators.forEach(v => {
			if(v.getEstimate().safety <= requiredSafetyRatio) {
				consensusAchieved = false;
			}
		});
	}

	const decisions = validators.reduce((acc, v) => {
		acc[v.name] = v.getEstimate();
		return acc;
	}, {})

	const output = {
		decisions,
		log: n.getLog()
	}

	return output;
};

console.log(rand(0.5, 1));
