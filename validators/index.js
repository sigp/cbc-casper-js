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

		this.weights[this.name] = weight;

		/*
		 * Add the starting point message to the hash table
		 * and also record it as the latest message from this
		 * sender.
		 */
		const msg = {
			sender: this.name,
			weight: this.getWeight(this.name),
			estimate: startingPoint,
			justification: [],
		};
		const msgHash = this.addToHashTable(msg, this.msgHashTable);
		this.lastMsgHashes[this.name] = msgHash;
	}

	learnValidators(validators) {
		validators.forEach(v => this.weights[v.name] = v.weight);
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
		const msgs = Object.keys(this.lastMsgHashes).map(m => {
			return this.msgHashTable[this.lastMsgHashes[m]]
		});
		const totals = msgs.reduce((totals, msg) => {
			totals[msg.estimate] += this.getWeight(msg.sender);
			return totals;
		}, [0, 0]);
		const estimate = totals[1] > totals[0] ? 1 : 0;
		const weight = (totals[0] + totals[1]) / totals[estimate];

		/*
		 * As per CasperTFG paper:
		 *
		 * E(M) = 0 if Score(0, M) > Score(1, M)
		 * E(M) = 1 if Score(1, M) > Score(0, M)
		 * E(M) = 0 if Score(1, M) = Score(0, M)
		 */
		return {
			estimate,
			weight
		}
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
		const msgHash = this.addToHashTable(msg, this.msgHashTable);
		this.lastMsgHashes[this.name] = msgHash;
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
module.exports.Validator = Validator;
