var network = require("../network");
var validators = require("../validators");

const Validator = validators.Validator;
const Network = network.Network;

const randomBool = () => (Math.random() >= 0.5) ? 1 : 0

const popRandomElement = function(a) {
	const i = a[Math.round(Math.random() * (a.length - 1))];
	a.splice(i, 1);
	return i;
}

const simulator = function(
	requiredSafetyRatio, 
	messagesPerRound, 
	validatorCount
) {
	const validatorInfo = [];
	for(var i = 0; i < validatorCount; i++) {
		validatorInfo.push({
			name: i.toString(),
			weight: 100,
			startingPoint: randomBool()
		});
	}
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
		initialConfig: validatorInfo,
		log: n.getLog()
	}

	return output;
};
module.exports.simulator = simulator;
