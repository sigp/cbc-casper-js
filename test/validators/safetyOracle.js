var hashObj = require('object-hash');
var assert = require("assert");
var BinaryValidator = require("../../validators/binary")
var MsgDB = require("../../db");

const makeMsg = (sender, estimate, justification) => {
	return {
		sender,
		estimate,
		justification
	}
}


describe('Validator binary safety oracle', function() {
	
	it('should return a valid safety ratio with all validators agreeing and full message propagation', function() {
		let db = new MsgDB();
		const estimate = 0;
		const notEstimate = 1;

		let v = new BinaryValidator('Test', 100, estimate, db);

		const validators = [
			{name: 'Test', weight: 100},
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Cam', weight: 100},
			{name: 'Donna', weight: 100},
			{name: 'Joe', weight: 100},
		];

		const msgs01 = validators.map(v => db.store(
			makeMsg(v.name, estimate, [])
		));
		const msgs02 = validators.map(v => db.store(
			makeMsg(v.name, estimate, msgs01)
		));
		const msg = db.store(makeMsg('Andy', estimate, msgs02));

		v.learnValidators(validators);
		v.parseMsg(msg);

		const withSafe = v.findSafeValidators(estimate);
		const againstSafe = v.findSafeValidators(notEstimate);
		
		assert.equal(
			withSafe.length,
			6,
			'six validators should be safe on estimate'
		);
		assert.equal(
			againstSafe.length,
			0,
			'no validators should be safe on notEstimate'
		);
		validators.forEach(v => {
			assert(
				withSafe.includes(v.name),
				'each validator should be considered safe'
			);
		});
		assert.equal(
			v.findSafety(estimate),
			1,
			'all validators should be safe on estimate'
		);
		assert.equal(
			v.findSafety(notEstimate),
			0,
			'no validators should be safe on notEstimate'
		);
	});
	
	
	it('should return zero for all estimates with no messages received', function() {
		const estimate = 0;
		const notEstimate = 1;
		let v = new BinaryValidator('Test', 100, estimate);

		const validators = [
			{name: 'Test', weight: 100},
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Cam', weight: 100},
			{name: 'Donna', weight: 100},
			{name: 'Joe', weight: 100},
		];

		v.learnValidators(validators);

		const withSafe = v.findSafeValidators(estimate);
		const againstSafe = v.findSafeValidators(notEstimate);
		
		assert.equal(
			withSafe.length,
			0,
			'no validators should be safe on estimate'
		);
		assert.equal(
			againstSafe.length,
			0,
			'no validators should be safe on notEstimate'
		);
		assert.equal(
			v.findSafety(0),
			0,
			'no validators should be safe on 0'
		);
		assert.equal(
			v.findSafety(1),
			0,
			'no validators should be safe on 1'
		);
	});
	
	
	it('should return a valid safety ratio with absent validators', function() {
		let db = new MsgDB();
		let v = new BinaryValidator('Test', 100, 0, db);

		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Cam', weight: 100},
			{name: 'Donna', weight: 100},
			{name: 'Joe', weight: 100},
		]);

		const test01 = v.generateMsg();
		
		const brenda01 = db.store({
			sender: 'Brenda',
			estimate: 0,
			justification: []
		});

		const andy01 = db.store({
			sender: 'Andy',
			estimate: 1,
			justification: []
		});
		
		const cam01 = db.store({
			sender: 'Cam',
			estimate: 1,
			justification: []
		});
		
		// Cam is now unsafe because if he were to be applied
		// the `andy02` estimate, they would flip their 1 estimate
		// to a 0.
		const cam02 = db.store({
			sender: 'Cam',
			estimate: 1,
			justification: [
				andy01
			]
		});
		
		// Andy should be safe because they know everyones
		// latest message.
		const andy02 = db.store({
			sender: 'Andy',
			estimate: 0,
			justification: [
				andy01,
				brenda01,
				cam01,
				test01,
			]
		});


		v.parseMsg(andy02);
		v.parseMsg(cam02);

		v.generateMsg();

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

