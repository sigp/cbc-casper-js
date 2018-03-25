var network = require("./network");
var validators = require("./validators");

const Validator = validators.Validator;
const Network = network.Network;


const rand = function() {
	const validatorInfo = [
		{name="Andy", weight=100, startingPoint=0},
		{name="Brenda", weight=100, startingPoint=0},
		{name="Chris", weight=100, startingPoint=1},
	]

	const validators = validatorInfo.map(v => {
		return new Validator(
			name=v.name, 
			weight=v.weight, 
			startingPoint=v.startingPoint.
		)
	});

	validators.forEach(v => v.learnValidators(validatorInfo));

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
