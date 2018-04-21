var hashObj = require('object-hash');
var assert = require("assert");
var BinaryValidator = require("../../validators/binary")
var Network = require("../../network");
var MsgDB = require("../../db");


describe('Validator message processing', function() {

	it('should place the first message from a sender in the table', function() {
		let db = new MsgDB();
		let v = new BinaryValidator('Test', 0, 0, db);

		const msg = db.store({
			sender: 'Brian',
			estimate: 1,
			justification: [],
		});

		v.parseMsg(msg);

		assert.equal(
			v.getLatestMsgHash('Brian'),
			msg, 
			'the sent message should be the latest messsage.'
		);
	});

	it('should update last message when parsing a new message from a known sender', function() {
		let db = new MsgDB();
		let v = new BinaryValidator('Test', 0, 0, db);

		const msg1 = db.store({
			sender: 'Brian',
			estimate: 0,
			justification: [],
		});
		const msg2 = db.store({
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
		});

		v.parseMsg(msg1);

		assert.equal(
			v.getLatestMsgHash('Brian'),
			msg1, 
			'the sent message should be the latest messsage.'
		);

		v.parseMsg(msg2);

		assert.equal(
			v.getLatestMsgHash('Brian'),
			msg2, 
			'the latest message should have been updated.'
		);
	});
	
	it('should not update the last message when parsing a known dependency message', function() {
		let db = new MsgDB();
		let v = new BinaryValidator('Test', 0, 0, db);

		const msg1 = db.store({
			sender: 'Brian',
			estimate: 0,
			justification: [],
		});
		const msg2 = db.store({
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
		});

		v.parseMsg(msg2);

		assert.equal(
			v.getLatestMsgHash('Brian'),
			msg2, 
			'the sent message should be the latest messsage.'
		);

		v.parseMsg(msg1);

		assert.equal(
			v.getLatestMsgHash('Brian'),
			msg2, 
			'the latest message should not have been updated.'
		);
	});
});
