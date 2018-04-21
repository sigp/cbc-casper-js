var hashObj = require('object-hash');
var MsgDB = require('../db');


class ByzantineError extends Error {
	constructor(m) {
		super(m);
		this.name = "ByzantineError"
	}
}


class Validator {
	constructor(name, weight, startingPoint, db) {
		this.name = name;
		this.startingPoint = startingPoint;
		this.lastMsgHashes = {};
		this.msgSequences = {};
		this.isByzantine = {};
		this.weights = {};
		this.trustedMsgHashes = {}
		this.msgStateSafety = {};
		this.db = db ? db : new MsgDB();

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

	getJustification(msgHash) {
		return this.retrieveMsg(msgHash).justification;
	}
	
	getSender(msgHash) {
		return this.retrieveMsg(msgHash).sender;
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

	setMsgHashTrusted(hash) {
		this.trustedMsgHashes[hash] = true;
	}

	isMsgHashTrusted(hash) {
		return (hash in this.trustedMsgHashes);
	}

	getLatestMsgHash(who) {
		return this.lastMsgHashes[who];
	}
	
	getLatestMsgHashes() {
		return Object.values(this.lastMsgHashes);
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
		return Object.values(this.lastMsgHashes);
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
		let hash = this.getLatestMsgHash(this.name);

		const latestMsgs = this.getLatestMsgs();
		if(latestMsgs.length > 1) {
			hash = this.storeMsg({
				sender: this.name,
				estimate: this.getEstimateFromMsgs(latestMsgs),
				justification: this.getLatestMsgHashes()
			});
		}
		this.verifyMsgHash(hash);
		return hash;
	}

	parseMsg(msgHash) {
		if(typeof msgHash !== "string") {
			throw new Error(`parseMsg expects "string" (hash), not "${typeof msgHash}"`);
		}
		try {
			this.verifyMsgHashLazyDeep(msgHash);
		}	
		catch(e) {
			if(e.name !== "ByzantineError") {
				throw e;
			}
			return e;
		}
	}

	/*
	 * Deep because it will recurse into justifications and validate them,
	 * lazy because it will stop recursing as soon as it finds a trusted
	 * message.
	 */
	verifyMsgHashLazyDeep(msgHash) {
		var depth = 0;

		const recurse = function(hash) {
			depth++;
			if(++depth >= 100) {
				throw new Error("Reached max depth.")
			}
			else if(this.isMsgHashTrusted(hash)){
				return
			} 
			else {
				const justification = this.getJustification(hash);
				justification.forEach(h => recurse(h));
				this.verifyMsgHash(hash);
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
	verifyMsgHash(msgHash) {
		const msg = this.retrieveMsg(msgHash);
		const justification = msg.justification;
		const estimate = msg.estimate;
		const sender = msg.sender;
		let isLatestMsg = false;
		
		// Check that the estimate given matches the estimate
		// we would generate from the same justification
		const estimateValid = this.justificationEstimateIsValid(
			justification,
			estimate
		)
		if(!estimateValid) {
			this.flagAsByzantine(sender);
			throw new ByzantineError("The estimate was incorrect.");
		}

		// Check that the same sender was not referenced twice in the same 
		// set of justifications.
		const hasDupes = this.justificationHasDuplicates(justification);
		if(hasDupes) {
			this.flagAsByzantine(sender);
			throw new ByzantineError(
				"There were multiple messages from the same sender in " +
				"the justification of the message."
			);
		}


		// Get a linear history of the sender from this message
		const seqs = this.getMsgHashSequenceForSender(msgHash, sender);
		const knownSeqs = this.getMsgSequence(sender);
		const isLatest = (seqs.length > knownSeqs.length);
		const equivocation = this.findEquivocation(knownSeqs, seqs);
		if(equivocation) {
			this.flagAsByzantine(sender);
			throw new ByzantineError(equivocation);
		} 

		// If we reached this point, the message is valid.
		// Do some housekeeping.
		if(isLatest) {
			this.setLatestMsg(sender, msgHash);
			this.setMsgSequence(sender, seqs);
		}
		this.setMsgHashTrusted(msgHash);
	}

	justificationEstimateIsValid(justification, estimate) {
		if(justification.length > 0) {
			return estimate === this.getEstimateFromMsgs(
				justification.map(j => this.retrieveMsg(j))
			);
		} 
		else {
			// An estimate is always valid with no justifications
			return true;
		}
	}

	justificationHasDuplicates(justification)	 {
		const senders = {};
		return justification.reduce((hasDupes, j) => {
			const sender = this.getSender(j);
			hasDupes = (hasDupes || senders[sender]);
			senders[sender] = true;
			return hasDupes;
		}, false);
	}

	getMsgHashSequenceForSender(msgHash, who) {
		const seqs = [];
		const makeSeqs = function(hash, sender) {
			seqs.unshift(hash);
			const nextDep = this.retrieveMsg(hash).justification.find(h => {
				return this.retrieveMsg(h).sender === sender;
			});
			if(nextDep) { 
				makeSeqs(nextDep, sender); 
			}
			else if (nextDep === undefined 
				&& this.retrieveMsg(hash).justification.length > 0) 
			{
				this.flagAsByzantine(this.getSender(msgHash));
				throw new ByzantineError(
					"The sender omitted their previous latest message  " +
					"from the justification."
				)
			}
		}.bind(this);
		makeSeqs(msgHash, who);
		return seqs;
	}

	// Returns an error if there was equivocation.
	findEquivocation(knownSeqs, seqs) {
		// If we don't have a message sequence for this validator,
		// accept this sequence as the truth.
		if(knownSeqs.length === 0) {
			return false;
		}
		const index = knownSeqs.indexOf(seqs[0]);
		// If the very first message from a sender in this message history
		// is not known to us, then it means they have invented two different
		// initial messages and are therefore bzyantine.
		if(index < 0) { 
			return "The initial message referenced by the sender was not the " +
				"previously known initial message."
		}
		// Start checking the two histories for a fork (and also extend our
		// currently known sequence if there are no forks)
		for(var i = 0; i < seqs.length; i++) {
			const knownSeqsIndex = i + index;
			if(knownSeqsIndex >= knownSeqs.length) {
				knownSeqs.push(seqs[i]);
			}
			else if(seqs[i] !== knownSeqs[knownSeqsIndex]) {
				return "There was a fork in the message history."
			}
		}
	}
}
module.exports = Validator;
