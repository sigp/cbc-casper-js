var hashObj = require('object-hash');

class Validator {
	constructor(name, weight, startingPoint) {
		this.name = name;
		this.weight = weight;

		this.msgHashTable = {};
		this.lastMsgHashes = {};
		this.rootMsgHashes = {};
		this.isByzantine = {};

		/*
		 * Add the starting point message to the hash table
		 * and also record it as the latest message from this
		 * sender.
		 */
		const msg = {
			sender: this.name,
			weight: this.weight,
			estimate: startingPoint,
			justification: [],
		};
		const msgHash = this.addToHashTable(msg, this.msgHashTable);
		this.lastMsgHashes[this.name] = msgHash;
	}

	flagAsByzantine(sender) {
		this.isByzantine[sender] = true;
	}

	getEstimate(msgs) {
		// we're going to assume that all messages in the log are valid
		// and we're not going recurse down into justifications.
		const totals = msgs.reduce((totals, msg) => {
			totals[msg.estimate] += msg.weight;
			return totals;
		}, [0, 0]);

		/*
		 * As per CasperTFG paper:
		 *
		 * E(M) = 0 if Score(0, M) > Score(1, M)
		 * E(M) = 1 if Score(1, M) > Score(0, M)
		 * E(M) = 0 if Score(1, M) = Score(0, M)
		 */
		return totals[1] > totals[0] ? 1 : 0;
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
			weight: this.weight,
			estimate: this.getEstimate(latestMsgs),
			justification: latestMsgs,
		}
		const msgHash = this.addToHashTable(msg, this.msgHashTable);
		this.lastMsgHashes[this.name] = msgHash;
		return msg;
	}

	lastMsgHashFrom(who) {
		return this.lastMsgHashes[who];
	}

	getDependencies(hash, table) {
		const msg = table[hash];
		const deps = msg.justification;
		return msg.justification.reduce((acc, j) => {
			acc = acc.concat(this.getDependencies(j, table));
			return acc;
		}, deps);
		return deps;
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

	messageHasDuplicateVotes(msg) {
		const senders = {};
		let hasDupes = false;
		msg.justification.forEach(j => {
			hasDupes = (hasDupes 
				|| senders[j.sender] 
				|| this.messageHasDuplicateVotes(j));
			senders[j.sender] = true;
		});
		if(hasDupes) { return true; }
		
		return false;
	}

	messageIsValid(msg, msgHash, table) {
		if(this.messageHasDuplicateVotes(msg)) { return false; }
		
		return true;
	}

	parseMessage(msg) {
		// TODO: check that the estimate of the message checks out
		const table = {};
		const storeMsg = () => Object.assign(this.msgHashTable, table);
		const msgHash = this.addToHashTable(msg, table);
		const latestMsgHash = this.lastMsgHashes[msg.sender];

		// this.messageSetHasEquivocations(msgHash, table);

		/*
		 * If the message was invalid, we should abort and flag the sender
		 * as Byzantine
		 */
		if(this.messageIsValid(msg) === false){
			this.flagAsByzantine(msg.sender);
			return;
		}

		/*
		 * If there were no previous latest messages, this is necessarily
		 * the latest.
		 */
		if(latestMsgHash === undefined) {
			storeMsg();
			this.lastMsgHashes[msg.sender] = msgHash;
			return;
		} 

		/*
		 * If the current latest message is a dependency of the latest
		 * message, then this new message should become the latest
		 * message.
		 */
		const msgDeps = this.getDependencies(msgHash, table)
		if(msgDeps.indexOf(latestMsgHash) >= 0) {
			storeMsg();
			this.lastMsgHashes[msg.sender] = msgHash;
			return;
		}

		/*
		 * If the new message is a dependency of the current latest 
		 * message, then this is a repeated message
		 */
		const latestMsgDeps = this.getDependencies(
			latestMsgHash, 
			this.msgHashTable
		);
		if(latestMsgDeps.indexOf(msgHash) >= 0) {
			// this is a repeat message. nothing to do.
			return;
		}

		/*
		 * If we got to this point, the current message does not 
		 * fit into the tree and the sender is Byzantine.
		 * (I need to verify this always holds true...)
		 */
		this.flagAsByzantine(msg.sender);
	}
}
module.exports.Validator = Validator;
