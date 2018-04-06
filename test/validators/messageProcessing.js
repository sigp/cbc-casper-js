var hashObj = require('object-hash');
var assert = require("assert");
var BinaryValidator = require("../../validators/binary")


describe('Validator message processing', function() {

	it('should place the first message from a sender in the table', function() {
		const msg = {
			sender: 'Brian',
			estimate: 1,
			justification: [],
		}
		let v = new BinaryValidator('Test', 0, 0);
		v.parseMsg(msg);
		assert.equal(
			v.getLatestMsgHash('Brian'),
			v.storeMsg(msg, {}), 
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
		v.parseMsg(msg1);
		assert.equal(
			v.getLatestMsgHash('Brian'),
			v.storeMsg(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		v.parseMsg(msg2);
		assert.equal(
			v.getLatestMsgHash('Brian'),
			v.storeMsg(msg2, {}), 
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
		v.parseMsg(msg2);
		assert.equal(
			v.getLatestMsgHash('Brian'),
			v.storeMsg(msg2, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse a dependency of the previous message
		v.parseMsg(msg1);
		assert.equal(
			v.getLatestMsgHash('Brian'),
			v.storeMsg(msg2, {}), 
			'the latest message should not have been updated.'
		);
	});
});
