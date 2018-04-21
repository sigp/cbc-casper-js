var hashObj = require('object-hash');


class MsgDB {
	constructor() {
		this.ht = {};		// key: hash, val: msg
	}

	exists(hash) {
		return hash in this.ht;
	}
	
	store(msg) {
		// Create a new obj so we don't mutate params
		let ourMsg = Object.assign({}, msg);
		// Recurse into justifications if they are objects (not hashes)
		ourMsg.justification = msg.justification.map(j => {
			return typeof j === "object" ? this.store(j) : j;
		});
		// Hash the msg and add to table
		const hash = hashObj(ourMsg);
		this.ht[hash] = ourMsg;
		return hash;
	}

	retrieve(hash) {
		const msg = this.ht[hash];
		return msg ? Object.assign({}, msg) : msg
	}

	decompress(hash) {
		// Pull msg from table
		let msg = this.retrieve(hash);
		if(msg === undefined) {
			throw new Error(`Cannot decompress unknown hash: ${hash}`);
		}
		// Recurse into justifications (they will be hashes)
		msg.justification = msg.justification.map(j => {
			return this.decompress(j);
		});
		return msg;
	}
}
module.exports = MsgDB;
