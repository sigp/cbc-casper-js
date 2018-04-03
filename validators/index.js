var hashObj = require('object-hash');

class ByzantineError extends Error {
	constructor(m) {
		super(m);
		this.name = "ByzantineError"
	}
}

class Validator {
	constructor(name, weight, startingPoint) {
		this.name = name;

		this.msgHashTable = {};
		this.lastMsgHashes = {};
		this.messageSequences = {};
		this.isByzantine = {};
		this.weights = {};

		/*
		 * Add the starting point message to the hash table
		 * and also record it as the latest message from this
		 * sender.
		 */
		const msg = {
			sender: this.name,
			estimate: startingPoint,
			justification: [],
		};
		const msgHash = this.addToHashTable(msg, this.msgHashTable);
		this.lastMsgHashes[this.name] = msgHash;
		this.learnValidators([{
			name: this.name,
			weight: weight,
		}]);
	}

	learnValidators(validators) {
		validators.forEach(v => {
			this.weights[v.name] = v.weight;
			this.messageSequences[v.name] = [];
		});
	}

	getValidators() {
		return Object.keys(this.weights);
	}

	getWeight(who) {
		return this.weights[who] ? this.weights[who] : 0;
	}

	getWeightSum() {
		return Object.keys(this.weights).reduce((acc, s) => {
			return acc + this.weights[s]
		}, 0);
	}

	flagAsByzantine(sender) {
		this.isByzantine[sender] = true;
	}

	getMessageSequence(who) {
		return this.messageSequences[who] ? this.messageSequences[who] : []
	}
	
	setMessageSequence(who, seqs) {
		this.messageSequences[who] = seqs;
	}

	isMessageKnown(hash) {
		return this.msgHashTable[hash] !== undefined;
	}

	lastMsgHashFrom(who) {
		return this.lastMsgHashes[who];
	}

	getMessage(hash) {
		return this.msgHashTable[hash];
	}

	getLatestMessages() {
		// Note: this does not decompress the messages from the hash
		// table. You will only get the top level of messages, justifications
		// will be specified as hashes.
		return Object.keys(this.lastMsgHashes).map(m => {
			return this.msgHashTable[this.lastMsgHashes[m]]
		});
	}


	addToHashTable(msg, table) {
		let hashedMsg = Object.assign({}, msg);
		hashedMsg.justification = msg.justification.map(j => {
			return this.addToHashTable(j, table)
		});
		const msgHash = hashObj(hashedMsg);
		table[msgHash] = hashedMsg;
		return msgHash;
	}

	decompressFromHashTable(hash, table) {
		let msg = Object.assign({}, table[hash]);
		msg.justification = msg.justification.map(j => {
			return this.decompressFromHashTable(j, table);
		});
		return msg;
	}

	getEstimate() {
		throw new Error("The Validator class should not be used directly. " + 
			"Use an extended class specific to your conensus requirements, " + 
			"such as BinaryValidator.");
	}

	generateMessage() {
		/*
		 * Get the latest message for each sender
		 */
		const latestMsgs = Object.keys(this.lastMsgHashes)
			.map(s => {
				return this.decompressFromHashTable(
					this.lastMsgHashes[s], 
					this.msgHashTable
				);
			});
		/*
		 * If there is only one latest message and it's ours, send it.
		 */
		if(latestMsgs.length === 1 && latestMsgs[0].sender === this.name) {
			return latestMsgs[0];
		}
		/*
		 * If we have messages from other senders, we need to build
		 * an estimate
		 */
		const msg = {
			sender: this.name,
			weight: this.getWeight(this.name),
			estimate: this.getEstimate(latestMsgs).estimate,
			justification: latestMsgs,
		}
		this.verifyAndStore(msg);
		return msg;
	}

	parseMessage(msg) {
		try {
			this.verifyAndStore(msg);
		}	
		catch(e) {
			if(e.name !== "ByzantineError") {
				throw e;
			}
			return e;
		}
	}

	verifyAndStore(msg) {
		const table = {};
		const msgHash = this.addToHashTable(msg, table);

		const recurse = function(hash) {
			table[hash].justification.forEach(h => recurse(h));
			// If we don't already have this message, then attempt to verify
			// and store it if it passes.
			if(!this.isMessageKnown(hash)){
				const isLatest = this.verifyMessage(
					this.decompressFromHashTable(hash, table)
				);
				// We will proceed to the next line only if the above call didn't
				// throw and the message is therefore valid.
				this.msgHashTable[hash] = table[hash];
				if (isLatest) {
					this.lastMsgHashes[table[hash].sender] = hash;
				}
			}
		}.bind(this);
		recurse(msgHash);
	}
	
	/*
	 * Take a message and perform checks to detect Byzantine
	 * behavior. If Byzantine errors are detected, a BzyantineError
	 * will be thrown.
	 *
	 * If a sender does any of the following, we consider them Byzantine:
	 * 
	 *  - Send a message where the estimate is not accurate. 
	 *  - Send a message which contains multiple justifications from
	 *		the same sender. (i.e., double vote)
	 *	- Fail to include a message from themselves in the justification
	 *		of a message. (i.e., selectively exclude votes)
	 *	- Provide messages which are "equivocations" (see CasperTFG paper).
	 *		(i.e., provide two differing voting sequences)
	 *	
	 *	For convenience, return `true` if this message is the latest
	 *	message for a particular sender.
	 */
	verifyMessage(msg) {
		const table = {};
		const msgHash = this.addToHashTable(msg, table);

		/*
		 * Verify the estimate in this message. Only check the immediate
		 * justifications (i.e., don't recurse).
		 */
		if(msg.justification.length > 0) {
			const estimate = this.getEstimate(msg.justification).estimate;
			if(estimate !== msg.estimate) {
				this.flagAsByzantine(msg.sender);
				throw new ByzantineError("The estimate was incorrect.");
			}
		}
		
		/*
		 * Inspect the immediate justification messages
		 * and detect wether or not there are multiple messages
		 * from the same sender. If so, flag the sender of this
		 * message as Byzantine.
		 */
		const senders = {};
		let hasDupes = false;
		msg.justification.forEach(j => {
			hasDupes = (hasDupes || senders[j.sender]);
			senders[j.sender] = true;
		});
		if(hasDupes) { 
			this.flagAsByzantine(msg.sender);
			throw new ByzantineError(
				"There were multiple messages from the same sender in " +
				"the justification of the message."
			);
		}

		/*
		 * For each sender, build a linear history of messages, as defined
		 * by only this message.
		 */
		const seqs = [];
		const makeSeqs = function(hash, sender) {
			seqs.unshift(hash);
			const nextDep = table[hash].justification.find(h => {
				return table[h].sender === sender;
			});
			if(nextDep) { 
				makeSeqs(nextDep, sender); 
			}
			else if (nextDep === undefined && table[hash].justification.length > 0) {
				this.flagAsByzantine(msg.sender);
				throw new ByzantineError(
					"The sender omitted their previous latest message  " +
					"from the justification."
				)
			}
		}.bind(this);
		makeSeqs(msgHash, msg.sender);

		/*
		 * Compare the history generated by this new message and ensure
		 * that it does not conflict with our previously known history
		 * from this sender.
		 */
		const knownSeqs = this.getMessageSequence(msg.sender);
		// If we don't have a message sequence for this validator,
		// accept this sequence as the truth.
		if(knownSeqs.length === 0) {
			this.setMessageSequence(msg.sender, seqs);
			return true;	// Return true because this is the lastest message
		}
		const index = knownSeqs.indexOf(seqs[0]);
		// If the very first message from a sender in this message history
		// is not known to us, then it means they have invented two different
		// initial messages and are therefore bzyantine.
		if(index < 0) { 
			this.flagAsByzantine(msg.sender);
			throw new ByzantineError(
				"The initial message referenced by the sender was not the " +
				"previously known initial message."
			); 
		}
		// Start checking the two histories for a fork (and also extend our
		// currently known sequence if there are no forks)
		const isLatestMsg = (seqs.length + index > knownSeqs.length);
		for(var i = 0; i < seqs.length; i++) {
			const knownSeqsIndex = i + index;
			if(knownSeqsIndex >= knownSeqs.length) {
				knownSeqs.push(seqs[i]);
			}
			else if(seqs[i] !== knownSeqs[knownSeqsIndex]) {
				this.flagAsByzantine(msg.sender);
				throw new ByzantineError("There was a fork in the message history.")
			}
		}

		return isLatestMsg;
	}
}

class BinaryValidator extends Validator {

	/*
	 * Given a message hash and a linear history of hashes,
	 * locate the given hash in the history, then attempt to find
	 * a future hash with a conflicting estimate.
	 *
	 * If a conflicting hash is found, return it. Otherwise,
	 * return false.
	 */
	findContradictingFutureMessage(hash, hashes, resolver) {
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
			const contradiction = this.findContradictingFutureMessage(
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
	 * Given a message hash, search all justifications and see
	 * if we know of a future message which disagrees with that 
	 * justification. If we find any disagreeing future message for
	 * any justification, return true.
	 */
	isAttackable(hash, sequences, resolver) {
		const msg = resolver(hash);
		const attackable = msg.justification.reduce((acc, j) => {
			const sender = resolver(j).sender;
			const contradiction = this.findContradictingFutureMessage(
				j,
				sequences[sender],
				resolver,
			);
			return (contradiction !== false || acc)
		}, false);
		return attackable;
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
			if(this.getMessage(hash).estimate === estimate) {
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
		const resolver = this.getMessage.bind(this);
		return agreeing.reduce((acc, s) => {
			/*
			const attackable = this.isAttackable(
				this.lastMsgHashes[s], 
				this.messageSequences,
				resolver
			)
			*/
			const attackable = this.canSetMsgTo(
				1 - estimate,
				this.lastMsgHashes[s],
				this.messageSequences,
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
		const unattackable = this.findSafeValidators(estimate)
		const safeWeight = unattackable.reduce((acc, name) => {
			return acc + this.getWeight(name);
		}, 0);
		const totalWeight = this.getWeightSum();
		return safeWeight / totalWeight;
	}

	getEstimateFromMsgs(msgs) {
		const totals = msgs.reduce((totals, msg) => {
			totals[msg.estimate] += this.getWeight(msg.sender);
			return totals;
		}, [0, 0]);
		return totals[1] > totals[0] ? 1 : 0;
	}

	getEstimate() {
		// Gather all the latest messages into an array.
		const msgs = this.getLatestMessages()
		// Reduce the latest messages into a tally of votes
		// and weights per validator.
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
		const estimate = totals[1] > totals[0] ? 1 : 0;
		/*
		 * The safety of the estimate is expressed as a ratio
		 * of:
		 *
		 * the sum of the weights applied to an estimate
		 * -----------------dividedBy--------------------
		 *    the total sum of all validator weights
		 */
		//const safety = this.findSafety(estimate);
		const safety = 42; // TODO: fix this

		return {
			estimate,
			safety
		}
	}
}
module.exports.BinaryValidator = BinaryValidator;

class IntegerValidator extends Validator {
	getEstimate() {
		// Gather all the latest messages into an array.
		const msgs = this.getLatestMessages()
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
		const electedMessage = msgs.find(m => {
			runningTotal += this.getWeight(m.sender);
			return runningTotal >= targetWeight;
		});
		const estimate = electedMessage.estimate;
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
module.exports.IntegerValidator = IntegerValidator;
