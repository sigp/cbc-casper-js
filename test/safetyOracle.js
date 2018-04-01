var hashObj = require('object-hash');
var assert = require("assert");
var validators = require("../validators")

const BinaryValidator = validators.BinaryValidator;
const IntegerValidator = validators.IntegerValidator;


describe('Validator binary safety oracle', function() {
	
	it('should find a contradicting future message', function() {
		let v = new BinaryValidator('Test', 0, 0);

		const sequence = [
			'A',
			'B',
			'C',
			'D',
			'E',
			'F',
		]
		const hashes = {
			'A': { estimate: 0 },
			'B': { estimate: 0 },
			'C': { estimate: 0 },
			'D': { estimate: 1 },
			'E': { estimate: 0 },
			'F': { estimate: 0 },
		}
		const resolver = h => hashes[h];

		assert.equal(
			v.findContradictingFutureMessage('A', sequence, resolver),
			'D',
			'it should find D as a contradicting hash to A'
		);
		assert.equal(
			v.findContradictingFutureMessage('B', sequence, resolver),
			'D',
			'it should find D as a contradicting hash to B'
		);
		assert.equal(
			v.findContradictingFutureMessage('C', sequence, resolver),
			'D',
			'it should find D as a contradicting hash to C'
		);
		assert.equal(
			v.findContradictingFutureMessage('D', sequence, resolver),
			'E',
			'it should find E as a contradicting hash to D'
		);
	});
	
	
	it('should not find a contradicting future message when it does ' + 
		'not exist', function() {
		let v = new BinaryValidator('Test', 0, 0);

		const sequence = [
			'A',
			'B',
			'C',
			'D',
			'E',
			'F',
		]
		const hashes = {
			'A': { estimate: 0 },
			'B': { estimate: 0 },
			'C': { estimate: 0 },
			'D': { estimate: 1 },
			'E': { estimate: 0 },
			'F': { estimate: 0 },
		}
		const resolver = h => hashes[h];

		assert.equal(
			v.findContradictingFutureMessage('E', sequence, resolver),
			false,
			'it should find no contradicting hash after E'
		);
		assert.equal(
			v.findContradictingFutureMessage('F', sequence, resolver),
			false,
			'it should find no contradicting hash after F'
		);
	});

});

