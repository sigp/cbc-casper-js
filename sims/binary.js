var Network = require("../network").Network;
var Validator = require("../validators").BinaryValidator;

class Simulator {
	constructor(validatorCount, requiredSafetyRatio, messagesPerRound) {
		this.validatorCount = validatorCount;
		this.requiredSafetyRatio = requiredSafetyRatio;
		this.safeValidatorRatio = requiredSafetyRatio;
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
			this.network.send(from.generateMsg(), from.name, to.name);
		}
		// Receive messages
		this.validators.forEach(v => {
			this.network.receive(v.name).forEach(packet => {
				v.parseMsg(packet.msg);
			});
		});
	}

	consensusAchieved(individualRatio, overallRatio) {
		let result = false;
		/*
		 * safeValidators and unsafeValidators are actually "count-downs".
		 *
		 * I.e., if we get a safe validator, we minus 1 from safeValidators 
		 * (and vice-versa). We're doing it this way so we can detect as soon
		 * as posssible if it is impossible to reach the desired
		 * overallRatio of safe validators, so we can stop the loop and not perform
		 * unncecessary safety oracle calls.
		 */
		let safeValidators = Math.ceil(this.validatorCount * overallRatio);
		let unsafeValidators = Math.ceil(this.validatorCount * (1 - overallRatio));
		for(var i = 0; i < this.validatorCount; i++) {
			const v = this.validators[i];
			const e = v.getEstimate();
			const s = v.findSafety(e);

			if(s >= individualRatio) {
				safeValidators--;
			} else {
				unsafeValidators--;
			}

			if (safeValidators <= 0) {
				result = true;
				break;
			} 

			if (unsafeValidators <= 0) {
				result = false;
				break;
			}
		}
		return result;
	}

	simulate() {
		let consensusAchieved = false;
		while(this.consensusAchieved(this.requiredSafetyRatio, this.safeValidatorRatio) === false) {
			this.doRound(this.messagesPerRound);
		}

		const decisions = this.validators.reduce((acc, v) => {
			const estimate = v.getEstimate();
			const safety = v.findSafety(estimate);
			acc[v.name] = {
				estimate,
				safe: safety >= this.requiredSafetyRatio,
				safety
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

