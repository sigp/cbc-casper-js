var Network = require("../network").Network;
var Validator = require("../validators").BinaryValidator;

class Simulator {
	constructor(validatorCount, requiredSafetyRatio, messagesPerRound) {
		this.validatorCount = validatorCount;
		this.requiredSafetyRatio = requiredSafetyRatio;
		this.messagesPerRound = messagesPerRound;

		this.validatorInfo = [];
		for(var i = 0; i < this.validatorCount; i++) {
			this.validatorInfo.push({
				name: i.toString(),
				weight: 100,
				startingPoint: this.getStartingPoint()
			});
		}
		this.validators = this.validatorInfo.map(v => {
			return new Validator(
				v.name,
				v.weight,
				v.startingPoint,
			);
		});
		this.validators.forEach(v => v.learnValidators(this.validatorInfo));
		this.network = new Network(this.validators);
	}

	getStartingPoint() {
		return (Math.random() >= 0.5) ? 1 : 0
	}

	popRandomElement(a) {
		const i = a[Math.round(Math.random() * (a.length - 1))];
		a.splice(i, 1);
		return i;
	}
	
	doRound(messages) {
		// Send messages
		for(var i = 0; i < messages; i++) {
			let candidates = this.validators.map((_, i) => i);
			const to = this.validators[this.popRandomElement(candidates)];
			const from = this.validators[this.popRandomElement(candidates)];
			this.network.send(from.generateMessage(), from.name, to.name);
		}
		// Receive messages
		this.validators.forEach(v => {
			this.network.receive(v.name).forEach(packet => {
				v.parseMessage(packet.msg);
			});
		});
	}

	simulate() {
		let consensusAchieved = false;
		while(consensusAchieved === false) {
			this.doRound(this.messagesPerRound);
			consensusAchieved = true;
			this.validators.forEach(v => {
				if(v.findSafety(v.getEstimate()) <= this.requiredSafetyRatio) {
					consensusAchieved = false;
				}
			});
		}

		const decisions = this.validators.reduce((acc, v) => {
			const estimate = v.getEstimate();
			acc[v.name] = {
				estimate,
				safety: v.findSafety(estimate)
			}
			return acc;
		}, {})

		const output = {
			decisions,
			initialConfig: this.validatorInfo,
			log: this.network.getLog()
		}

		return output;
	};
}
module.exports.BinarySimulator = Simulator;

