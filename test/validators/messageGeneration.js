var hashObj = require('object-hash');
var assert = require("assert");
var validators = require("../../validators")

const BinaryValidator = validators.BinaryValidator;


describe('Validator message generation', function() {

	it('should generate a starting point message', function() {
		let v = new BinaryValidator('Test', 100, 0)
		const msg = v.generateMessage();
		const expectedMsg = {
			sender: 'Test',
			estimate: 0,
			justification: []
		};
		assert.equal(
			hashObj(msg),
			hashObj(expectedMsg),
			'the first message should be as expected'
		)
	});
	
	it('should generate a message with reference to messages from other senders', function() {
		const msg = {
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
		};
		let v = new BinaryValidator('Test', 100, 0);
		v.parseMessage(msg);
		const generated = v.generateMessage();
		const expected = {
			sender: 'Test',
			estimate: 0,
			justification: [
				{
					sender: 'Test',
					estimate: 0,
					justification: []
				},
				msg,
				{
					sender: 'Sally',
					estimate: 0,
					justification: []
				},
			]
		};
		assert.equal(
			hashObj(generated),
			hashObj(expected),
			'the generated message should be as expected'
		)
	});
});
