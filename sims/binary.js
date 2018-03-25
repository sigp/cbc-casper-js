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

const rand = function(rounds, messagesPerRound) {
	const validators = [
		new Validator(name="Andy", weight=100, startingPoint=0),
		new Validator(name="Brian", weight=100, startingPoint=0),
		new Validator(name="Chris", weight=100, startingPoint=1),
	]
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

	for(var i = 0; i < rounds; i++) {
		doRound(messagesPerRound);
	}

	console.log(n.getLog())
};

rand(5, 1);
