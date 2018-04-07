var hashObj = require('object-hash');
var MsgDB = require('../db');


class ByzantineError extends Error {
	constructor(m) {
		super(m);
		this.name = "ByzantineError"
	}
}


class Validator {
	constructor(name, weight, startingPoint) {
		this.name = name;
		this.startingPoint = startingPoint;
		this.lastMsgHashes = {};
		this.msgSequences = {};
		this.isByzantine = {};
		this.weights = {};
		this.db = new MsgDB();

		// Create an initial msg, store it and save it as our latest msg.
		this.setLatestMsg(
			this.name,
			this.storeMsg(this.buildInitialMsg())
		)
		
		// Store this validator as a validator.	
		this.learnValidators([{
			name: this.name,
			weight: weight,
		}]);
	}

	storeMsg(msg) {
		return this.db.store(msg);
	}

	retrieveMsg(hash) {
		const msg = this.db.retrieve(hash);
		if (msg === undefined) {
			throw new Error(`${hash} is not a known db key.`)
		}
		return msg;
	}
	
	decompressHash(hash) {
		const msg = this.db.decompress(hash);
		if (msg === undefined) {
			throw new Error(`${hash} is not a known db key.`)
		}
		return msg;
	}

	buildInitialMsg() {
		return {
			sender: this.name,
			estimate: this.startingPoint,
			justification: [],
		}
	}

	learnValidators(validators) {
		validators.forEach(v => {
			this.weights[v.name] = v.weight;
			this.msgSequences[v.name] = [];
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

	getMsgSequence(who) {
		return this.msgSequences[who] ? this.msgSequences[who] : []
	}
	
	setMsgSequence(who, seqs) {
		this.msgSequences[who] = seqs;
	}

	isMsgKnown(hash) {
		return this.db.exists(hash);
	}

	getLatestMsgHash(who) {
		return this.lastMsgHashes[who];
	}

	setLatestMsg(who, hash) {
		this.lastMsgHashes[who] = hash;
	}

	/*
	 * Note: will return an array of message where the 
	 * justifications are hashes (i.e., does not decompress
	 * messages)
	 */
	getLatestMsgs() {
		return Object.values(this.lastMsgHashes).map(h => this.retrieveMsg(h))
	}

	getLatestMsgsDecompressed() {
		return Object.values(this.lastMsgHashes).map(h => this.decompressHash(h))
	}

	getEstimate() {
		throw new Error("The Validator class should not be used directly. " + 
			"Use an extended class specific to your conensus requirements, " + 
			"such as BinaryValidator.");
	}

	generateMsg() {
		let msg = {};

		const latestMsgs = this.getLatestMsgsDecompressed();
		// If there is only one latest message and it's ours, send it.
		if(latestMsgs.length === 1 && latestMsgs[0].sender === this.name) {
			return latestMsgs[0];
		}
		// If we have messages from others, build an estimate
		else {
			msg = {
				sender: this.name,
				estimate: this.getEstimate(latestMsgs),
				justification: latestMsgs,
			}
		}
		this.rootHash = this.verifyAndStore(msg);
		return msg;
	}

	parseMsg(msg) {
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
		// We create a local db here so we don't pollute our global db
		// with invalid msgs.
		const localDb = new MsgDB();
		const msgHash = localDb.store(msg);

		const recurse = function(hash) {
			// If we don't already have this message, then attempt to verify
			// and store it if it passes.
			if(!this.isMsgKnown(hash)){
				const msgComp = localDb.retrieve(hash);
				const msgDecomp = localDb.decompress(hash);
				// Recurse into justifications
				msgComp.justification.forEach(h => recurse(h));
				// Verify message (will throw if not valid)
				const isLatest = this.verifyMsg(msgDecomp);
				// Move the msg from the local db into our db
				this.storeMsg(msgDecomp);
				// Update our latest message if necessary
				if (isLatest) {
					this.setLatestMsg(msgComp.sender, hash);
				}
			}
		}.bind(this);
		recurse(msgHash);
		return msgHash;
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
	verifyMsg(msg) {
		// We create a local db here so we don't pollute our global db
		// with invalid msgs.
		const db = new MsgDB();
		const msgHash = db.store(msg);

		/*
		 * Verify the estimate in this message. Only check the immediate
		 * justifications (i.e., don't recurse).
		 */
		if(msg.justification.length > 0) {
			const estimate = this.getEstimateFromMsgs(msg.justification);
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
			const nextDep = db.retrieve(hash).justification.find(h => {
				return db.retrieve(h).sender === sender;
			});
			if(nextDep) { 
				makeSeqs(nextDep, sender); 
			}
			else if (nextDep === undefined && db.retrieve(hash).justification.length > 0) {
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
		const knownSeqs = this.getMsgSequence(msg.sender);
		// If we don't have a message sequence for this validator,
		// accept this sequence as the truth.
		if(knownSeqs.length === 0) {
			this.setMsgSequence(msg.sender, seqs);
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
module.exports = Validator;
