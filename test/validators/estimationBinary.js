var hashObj = require('object-hash');
var assert = require("assert");
var validators = require("../../validators")

const BinaryValidator = validators.BinaryValidator;


describe('Validator binary estimation', function() {
	it('should return 1 if all votes are 1', function() {
		let v = new BinaryValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 99},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 1,
			justification: []
		});
		v.parseMessage({
			sender: 'Brenda',
			estimate: 1,
			justification: []
		});
		assert(
			v.getEstimate().estimate === 1, 
			"estimate should return 1"
		);
	});
	
	it('should return 0 with majority 0', function() {
		let v = new BinaryValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 99},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 0,
			justification: []
		});
		v.parseMessage({
			sender: 'Brenda',
			estimate: 0,
			justification: []
		});
		assert(
			v.getEstimate().estimate === 0 , 
			"estimate should return 0"
		);
	});
	
	it('should return 0 if votes are equal', function() {
		let v = new BinaryValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 5},
			{name: 'Brenda', weight: 5},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 1,
			justification: []
		});
		v.parseMessage({
			sender: 'Brenda',
			estimate: 0,
			justification: []
		});
		assert(
			v.getEstimate().estimate === 0, 
			"estimate should return 0 "
		);
	});
});

