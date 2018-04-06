var hashObj = require('object-hash');
var assert = require("assert");
var BinaryValidator = require("../../validators/binary")


describe('Validator weighting', function() {
	it('should learn about validators', function() {
		let v = new BinaryValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 50},
			{name: 'Cam', weight: 25},
		]);
		assert(
			v.getWeight('Andy') === 100,
			'Andy should have weight 100'
		);
		assert(
			v.getWeight('Brenda') === 50,
			'Brenda should have weight 50'
		);
		assert(
			v.getWeight('Cam') === 25,
			'Cam should have weight 25'
		);
	});
	
	it('should return a weight of 0 for unknown validators', function() {
		let v = new BinaryValidator('Test', 0, 0);
		assert(
			v.getWeight('Zebra') === 0,
			'An unknown validator should have weight 0'
		);
	});
	
	it('should generate an accurate weight sum', function() {
		let v = new BinaryValidator('Test', 10, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 50},
			{name: 'Cam', weight: 25},
		]);
		assert(
			v.getWeightSum() === 185,
			'The weight sum should be accurate'
		);
	});
});
