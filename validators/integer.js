var Validator = require('./validator.js');

class IntegerValidator extends Validator {
	getEstimate() {
		// Gather all the latest messages into an array.
		const msgs = this.getLatestMsgs()
		// Sort the array so estimates are in ascending order.
		msgs.sort((a, b) => a.estimate - b.estimate);
		// Calculate the sum of all weights in these messages.
		const totalWeight = msgs.reduce((acc, m) => {
			return acc + this.getWeight(m.sender)
		}, 0);
		/*
		 * Run over the array of estimates and generate a rolling
		 * sum of weights. Once this weights exceeds half of the 
		 * total weights, choose the estimate of the weight which
		 * "tipped the scales".
		 */
		let runningTotal = 0;
		const targetWeight = totalWeight / 2;
		const electedMsg = msgs.find(m => {
			runningTotal += this.getWeight(m.sender);
			return runningTotal >= targetWeight;
		});
		const estimate = electedMsg.estimate;
		/*
		 * The safety of the estimate is expressed as a ratio
		 * of:
		 *
		 * the sum of the weights applied to an estimate
		 * -----------------dividedBy--------------------
		 *    the total sum of all validator weights
		 *
		 *  Note: we use the only the weights which directly voted for
		 *  this estimate. I.e., we do not use the weights of votes for
		 *  integers lower than this (like the ones we used to find the 
		 *  estimate).
		 */
		const estimateWeight = msgs.reduce((acc, m) => {
			return m.estimate === estimate ? acc + this.getWeight(m.sender) : acc;
		}, 0);
		const safety = estimateWeight / this.getWeightSum();

		return {
			estimate,
			safety
		}
	}
}
module.exports = IntegerValidator;
