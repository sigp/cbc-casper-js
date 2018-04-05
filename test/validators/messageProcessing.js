var hashObj = require('object-hash');
var assert = require("assert");
var validators = require("../../validators")

const BinaryValidator = validators.BinaryValidator;


describe('Validator message processing', function() {

	it('should place the first message from a sender in the table', function() {
		const msg = {
			sender: 'Brian',
			estimate: 1,
			justification: [],
		}
		let v = new BinaryValidator('Test', 0, 0);
		v.parseMessage(msg);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg, {}), 
			'the sent message should be the latest messsage.'
		);
	});

	it('should update last message when parsing a new message from a known sender', function() {
		const msg1 = {
			sender: 'Brian',
			estimate: 0,
			justification: [],
		};
		const msg2 = {
			sender: 'Brian',
			estimate: 0,
			justification: [
				{
					sender: 'Brian',
					estimate: 0,
					justification: [],
				},
				{
					sender: 'Sally',
					estimate: 0,
					justification: [],
				}
			],
		};
		let v = new BinaryValidator('Test', 0, 0);
		// parse the first message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		v.parseMessage(msg2);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg2, {}), 
			'the latest message should have been updated.'
		);
	});
	
	it('should not update the last message when parsing a known dependency message', function() {
		const msg1 = {
			sender: 'Brian',
			estimate: 0,
			justification: [],
		};
		const msg2 = {
			sender: 'Brian',
			estimate: 0,
			justification: [
				{
					sender: 'Brian',
					estimate: 0,
					justification: [],
				},
				{
					sender: 'Sally',
					estimate: 0,
					justification: [],
				}
			],
		};
		let v = new BinaryValidator('Test', 0, 0);
		// parse the most recent message
		v.parseMessage(msg2);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg2, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse a dependency of the previous message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg2, {}), 
			'the latest message should not have been updated.'
		);
	});
});
