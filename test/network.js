var assert = require("assert");
var Network = require("../network");

describe('Network', function() {

	it('should create new Network instance', function() {
		const validators = [
			{name: 'Andy'},
			{name: 'Brian'},
			{name: 'Cara'},
			{name: 'Donna'},
		]
		let n = new Network(validators);
	});

	
	it('should send a message from Andy to Donna', function() {
		const validators = [
			{name: 'Andy'},
			{name: 'Brian'},
			{name: 'Cara'},
			{name: 'Donna'},
		]
		const msg = {test: true};
		let n = new Network(validators);
		n.send(msg, 'Andy', 'Donna');
		const rx = n.receive('Donna');
		const packet = rx[0]	
		assert(packet.msg === msg, 'packet should have the message');
		assert(packet.to === 'Donna', 'packet should have correct to field');
		assert(packet.from === 'Andy', 'packet should have correct from field');
		assert(packet.timestamp > 0, 'packet should have some timestamp');
	});
	
	it('should broadcast messages to all validators except sender', function() {
		let validators = [
			{name: 'Andy'},
			{name: 'Brian'},
			{name: 'Cara'},
			{name: 'Donna'},
		]
		let n = new Network(validators);
		const msg = {test: true};
		// Broadcast msg
		n.broadcast(msg, 'Andy');
		// Test message receipt
		validators.forEach(v => {
			if(v.name === "Andy") {
				assert(
					n.receive(v.name).length === 0,
					'Broadcaster should not receive own msg'
				)
			} 
			else {
				assert(
					n.receive(v.name)[0].msg === msg,
					'All non-sender validators should receive msg'
				);

			}
		});
	});
	
	
	it('should put a message in the log during send', function() {
		const validators = [
			{name: 'Andy'},
			{name: 'Brian'},
			{name: 'Cara'},
			{name: 'Donna'},
		]
		const msg = {test: true};
		let n = new Network(validators);
		n.send(msg, 'Andy', 'Donna');
		const rx = n.receive('Donna');
		const packet = n.getLog()[0];
		assert(packet.msg === msg, 'packet should have the message');
		assert(packet.to === 'Donna', 'packet should have correct to field');
		assert(packet.from === 'Andy', 'packet should have correct from field');
		assert(packet.timestamp > 0, 'packet should have some timestamp');
	});

	
	it('should clear a queue after a receive call on it', function() {
		const validators = [
			{name: 'Andy'},
			{name: 'Brian'},
			{name: 'Cara'},
			{name: 'Donna'},
		]
		const msg = {test: true};
		let n = new Network(validators);
		n.send(msg, 'Andy', 'Donna');
		let rx = n.receive('Donna');
		assert(rx.length > 0, 'a message should have been received');
		rx = n.receive('Donna');
		assert(rx.length === 0, 'a message should not been received');
	});

	
	it('send and receive on unknown validators should throw', function() {
		const validators = [
			{name: 'Andy'},
			{name: 'Brian'},
			{name: 'Cara'},
			{name: 'Donna'},
		]
		let n = new Network(validators);
		assert.throws(
			() => n.send({}, 'Alice', 'Donna'),
			ReferenceError,
			'should throw a ReferenceError when from is unknown'
		);
		assert.throws(
			() => n.send({}, 'Andy', 'Alice'),
			ReferenceError,
			'should throw a ReferenceError when from is unknown'
		);
		assert.throws(
			() => n.receive({}, 'Alice'),
			ReferenceError,
			'should throw a ReferenceError when who is unknown'
		);
	});

});

