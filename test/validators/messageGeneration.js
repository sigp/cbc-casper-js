var hashObj = require('object-hash');
var assert = require("assert");
var BinaryValidator = require("../../validators/binary");
var MsgDB = require("../../db");


describe('Validator message generation', function() {

	it('should generate a starting point message', function() {
		const db = new MsgDB();
		let v = new BinaryValidator('Test', 100, 0, db)
		const msg = v.generateMsg();
		const expectedMsg = db.store({
			sender: 'Test',
			estimate: 0,
			justification: []
		});
		assert.equal(
			msg,
			expectedMsg,
			'the first message should be as expected'
		)
	});
	
	it('should generate a message with reference to messages from other senders', function() {
		const db = new MsgDB();
		let v = new BinaryValidator('Test', 100, 0, db);

		const sallyMsg = {
			sender: 'Sally',
			estimate: 0,
			justification: [],
		}

		const msg = db.store({
			sender: 'Brian',
			estimate: 0,
			justification: [
				{
					sender: 'Brian',
					estimate: 1,
					justification: [],
				},
				sallyMsg
			],
		});
		
		const e = v.parseMsg(msg);
		if(e) {throw e}
		const generated = v.generateMsg();
		
		const expected = db.store({
			sender: 'Test',
			estimate: 0,
			justification: [
				{
					sender: 'Test',
					estimate: 0,
					justification: []
				},
				msg,
				sallyMsg
			]
		});

		assert.equal(
			generated,
			expected,
			'the generated message should be as expected'
		)
	});

	it('should return the same message if nothing has changed', function() {
		const db = new MsgDB();

		const msg = db.store({
			sender: 'Brian',
			estimate: 0,
			justification: [
				{
					sender: 'Brian',
					estimate: 1,
					justification: [],
				},
				{
					sender: 'Sally',
					estimate: 0,
					justification: [],
				}
			],
		});
		let v = new BinaryValidator('Test', 100, 0, db);
		v.parseMsg(msg);
		const first = v.generateMsg();
		const second = v.generateMsg();
		assert.notEqual(
			first,
			second,
			'two successively generated messages should be the same'
		)
	});

	it('should store a generated message as its latest msg', function() {
		const db = new MsgDB();
		let v = new BinaryValidator('Test', 100, 0, db);

		const msg = db.store({
			sender: 'Brian',
			estimate: 0,
			justification: [
				{
					sender: 'Brian',
					estimate: 1,
					justification: [],
				},
				{
					sender: 'Sally',
					estimate: 0,
					justification: [],
				}
			],
		});

		v.parseMsg(msg);

		const generated = v.generateMsg();
		assert.equal(
			v.getLatestMsgHash(v.name),
			generated,
			'the validator should know its last message as its latest'
		)
	});
});
