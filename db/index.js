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
			if(typeof j === "object") {
				return this.store(j)
			}
		});
		// Hash the msg and add to table
		const hash = hashObj(ourMsg);
		this.ht[hash] = ourMsg;
		return hash;
	}

	retrieve(hash) {
		return this.ht[hash]
	}

	decompress(hash) {
		// Pull msg from table
		let msg = Object.assign({}, this.retrieve(hash));
		// Recurse into justifications (they will be hashes)
		msg.justification = msg.justification.map(j => {
			return this.decompress(j);
		});
		return msg;
	}
}
module.exports = MsgDB;
