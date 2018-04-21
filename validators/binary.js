var Validator = require('./validator.js');

class BinaryValidator extends Validator {
	
	/*
	 * Given a message hash and a linear history of hashes,
	 * locate the given hash in the history, then attempt to find
	 * a future hash with a conflicting estimate.
	 *
	 * If a conflicting hash is found, return it. Otherwise,
	 * return false.
	 */
	findContradictingFutureMsg(hash, hashes, resolver) {
		const estimate = resolver(hash).estimate;
		const seqIndex = hashes.indexOf(hash);
		for(var i = seqIndex + 1; i < hashes.length; i++) {
			const futureHash = hashes[i];
			const futureMsg = resolver(futureHash);
			if (futureMsg.estimate !== estimate) {
				return futureHash;
			}
		}
		return false;
	}

	canSetMsgTo(estimate, hash, sequences, validators, 
		latestMsgs, resolver) {
		const msg = resolver(hash);
		// load up msgs the latest msg from each sender
		const msgs = msg.justification.reduce((acc, j) => {
			const sender = resolver(j).sender
			const contradiction = this.findContradictingFutureMsg(
				j, 
				sequences[sender], 
				resolver
			);
			acc[sender] = contradiction ? contradiction : j;
			return acc;
		}, {});
		// If there was a validator which was not included
		// in the justifications of the given message, 
		// set a message.
		validators.forEach(v => {
			if(v in msgs === false) {
				let m = v in sequences ? sequences[v][0] : undefined;
				if(m === undefined) {
					m = {
						sender: v,
						estimate: estimate,
						justification: []
					}
				}
				msgs[v] = m;
			}
		});
		// Build out the evil message
		const justification = Object.keys(msgs).map(m => {
			if(typeof msgs[m] === "string") {
				// msg is hash
				return resolver(msgs[m])
			} else {
				return msgs[m];
			}
		});
		const evilMsg = {
			sender: msg.sender,
			estimate: this.getEstimateFromMsgs(justification),
			justification,
		}
		const maliciousEstimate = this.getEstimateFromMsgs(justification);
		return maliciousEstimate === estimate;
	}

	/*
	 * Given an estimate, return a list of names of validators
	 * (senders) who agree with the specified estimate.
	 * Note: this does not test for estimate safety, it just
	 * finds validators who's last estimate equals the given
	 * estimate.
	 */
	findAgreeingValidators(estimate) {
		return Object.keys(this.lastMsgHashes).reduce((acc, s) => {
			const hash = this.lastMsgHashes[s];
			if(this.retrieveMsg(hash).estimate === estimate) {
				acc.push(s);
			}
			return acc;
		}, [])
	}

	/*
	 * Given an estimate, return a list of the names of all 
	 * validators who are safe (i.e., unattackable).
	 */
	findSafeValidators(estimate) {
		const agreeing = this.findAgreeingValidators(estimate);
		const resolver = this.retrieveMsg.bind(this);
		return agreeing.reduce((acc, s) => {
			const attackable = this.canSetMsgTo(
				1 - estimate,
				this.lastMsgHashes[s],
				this.msgSequences,
				this.getValidators(),
				this.lastMsgHashes,
				resolver,
			)
			if(!attackable) {
				acc.push(s);
			}
			return acc;
		}, []);
	}

	/*
	 * Given an estimate, return the ratio of the weights of all
	 * validators who are safe vs. those who are not.
	 *
	 * If only half of validators are safe, this will return 0.5.
	 */
	findSafety(estimate) {
		const memoizedSafety = this.getCurrentMessageStateSafety(estimate);
		if(memoizedSafety !== undefined) {
			return memoizedSafety;
		}
		else {
			const unattackable = this.findSafeValidators(estimate)
			const safeWeight = unattackable.reduce((acc, name) => {
				return acc + this.getWeight(name);
			}, 0);
			const totalWeight = this.getWeightSum();
			const safety = safeWeight / totalWeight;
			this.setCurrentMessageStateSafety(estimate, safety);
			return safety;
		}
	}

	getEstimateFromMsgs(msgs) {
		const totals = msgs.reduce((totals, msg) => {
			totals[msg.estimate] += this.getWeight(msg.sender);
			return totals;
		}, [0, 0]);
		/*
		 * Calculate the binary estimate as per CasperTFG paper:
		 *
		 * E(M) = 0 if Score(0, M) > Score(1, M)
		 * E(M) = 1 if Score(1, M) > Score(0, M)
		 * E(M) = 0 if Score(1, M) = Score(0, M)
		 */
		return totals[1] > totals[0] ? 1 : 0;
	}

	getEstimate() {
		return this.getEstimateFromMsgs(
			this.getLatestMsgs().map(h => this.retrieveMsg(h))
		);
	}
}
module.exports = BinaryValidator;
