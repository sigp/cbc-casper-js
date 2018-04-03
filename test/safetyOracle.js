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
	
	
	it('should mark an simple attackable message as attackable', function() {
		let v = new BinaryValidator('Test', 0, 0);
		
		const unattackableMsg = {
			sender: 'Joe',
			estimate: 0,
			justification: [
				'E'
			]
		}
		const fullyAttackableMsg = {
			sender: 'Joe',
			estimate: 0,
			justification: [
				'B',
			]
		}
		const partiallyAttackableMsg = {
			sender: 'Joe',
			estimate: 0,
			justification: [
				'B',
				'E'
			]
		}

		const sequence = [
			'A',
			'B',
			'C',
			'D',
			'E',
			'F',
		]
		const sequences = {
			'Adam': sequence,
			'Brenda': sequence,
		}
		const hashes = {
			'safe': unattackableMsg,
			'unsafe': fullyAttackableMsg,
			'partial': partiallyAttackableMsg,
			'A': { estimate: 0 },
			'B': { estimate: 0, sender: 'Adam' },
			'C': { estimate: 0 },
			'D': { estimate: 1 },
			'E': { estimate: 0, sender: 'Brenda' },
			'F': { estimate: 0 },
		}
		const resolver = h => hashes[h];
		
		assert.equal(
			v.isAttackable('safe', sequences, resolver),
			false,
			'the safe message should be unattackable'
		);
		assert.equal(
			v.isAttackable('unsafe', sequences, resolver),
			true,
			'the unsafe message should be attackable'
		);
		assert.equal(
			v.isAttackable('partial', sequences, resolver),
			true,
			'the partially safe message should be attackable'
		);
	});
	
	
	it('should return a valid safety ratio with absent validators', function() {
		let v = new BinaryValidator('Test', 100, 0);

		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Cam', weight: 100},
			{name: 'Donna', weight: 100},
			{name: 'Joe', weight: 100},
		]);

		const test01 = v.generateMessage();
		
		const brenda01 = {
			sender: 'Brenda',
			estimate: 0,
			justification: []
		}

		const andy01 = {
			sender: 'Andy',
			estimate: 1,
			justification: []
		}
		
		const cam01 = {
			sender: 'Cam',
			estimate: 1,
			justification: []
		}
		
		// Cam is now unsafe because if he were to be applied
		// the `andy02` estimate, they would flip their 1 estimate
		// to a 0.
		const cam02 = {
			sender: 'Cam',
			estimate: 1,
			justification: [
				andy01
			]
		}
		
		// Andy should be safe because they know everyones
		// latest message.
		const andy02 = {
			sender: 'Andy',
			estimate: 0,
			justification: [
				andy01,
				brenda01,
				cam01,
				test01,
			]
		}


		v.parseMessage(andy02);
		v.parseMessage(cam02);

		v.generateMessage();

		const safe = v.findSafeValidators(0);
		
		assert.equal(
			safe.length,
			2,
			'only two validators should be safe'
		);
		assert(
			safe.includes('Test'),
			'Test should be safe'
		);
		assert(
			safe.includes('Andy'),
			'Andy should be safe'
		);
		assert.equal(
			v.findSafety(0),
			2/6,
			'two of the six validators should be safe'
		);
	});

});

