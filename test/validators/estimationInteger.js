var hashObj = require('object-hash');
var assert = require("assert");
var validators = require("../../validators")

const IntegerValidator = validators.IntegerValidator;


describe('Validator integer estimation', function() {
	it('should return 5 if all weighted votes are 5 ' + 
		'and calculate safety', function() {
		let v = new IntegerValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 5,
			justification: []
		});
		v.parseMessage({
			sender: 'Brenda',
			estimate: 5,
			justification: []
		});
		assert.equal(
			v.getEstimate().estimate,
			5, 
			"estimate should return 5"
		);
		assert.equal(
			v.getEstimate().safety,
			1, 
			"estimate safety should be one"
		);
	});

	it('should calculate safety with an abstaining voter', function() {
		let v = new IntegerValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Zebra', weight: 100},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 5,
			justification: []
		});
		v.parseMessage({
			sender: 'Brenda',
			estimate: 5,
			justification: []
		});
		assert.equal(
			v.getEstimate().estimate,
			5, 
			"estimate should return 5"
		);
		assert.equal(
			v.getEstimate().safety,
			2/3, 
			"estimate safety should be two thirds"
		);
	});

	it('should select the floor of the middle of an uneven number of ' + 
		'sequential, evenly weighted votes (and calc the safety)', function() {
		let v = new IntegerValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Catherine', weight: 100},
			{name: 'Dave', weight: 100},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 1,
			justification: []
		});
		v.parseMessage({
			sender: 'Brenda',
			estimate: 2,
			justification: []
		});
		v.parseMessage({
			sender: 'Catherine',
			estimate: 3,
			justification: []
		});
		v.parseMessage({
			sender: 'Dave',
			estimate: 4,
			justification: []
		});
		assert.equal(
			v.getEstimate().estimate,
			2, 
			"estimate should return 2"
		);
		assert.equal(
			v.getEstimate().safety,
			1/4, 
			"estimate safety should be one quarter"
		);
	});

	it('should select the mean of an event number of sequential, evenly ' + 
		'weighted votes (and calc the safety)', function() {
		let v = new IntegerValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Catherine', weight: 100},
			{name: 'Dave', weight: 100},
			{name: 'Eddy', weight: 100},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 1,
			justification: []
		});
		v.parseMessage({
			sender: 'Brenda',
			estimate: 2,
			justification: []
		});
		v.parseMessage({
			sender: 'Catherine',
			estimate: 3,
			justification: []
		});
		v.parseMessage({
			sender: 'Dave',
			estimate: 4,
			justification: []
		});
		v.parseMessage({
			sender: 'Eddy',
			estimate: 5,
			justification: []
		});
		assert.equal(
			v.getEstimate().estimate,
			3, 
			"estimate should return 3"
		);
		assert.equal(
			v.getEstimate().safety,
			1/5, 
			"estimate safety should be 1/5th"
		);
	});
	
	it('should select the estimate and safety given uneven weighting across ' + 
		'validators', function() {
		let v = new IntegerValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Andy', weight: 50},
			{name: 'Brenda', weight: 100},
			{name: 'Catherine', weight:150},
			{name: 'Dave', weight: 301},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 1,
			justification: []
		});
		v.parseMessage({
			sender: 'Brenda',
			estimate: 2,
			justification: []
		});
		v.parseMessage({
			sender: 'Catherine',
			estimate: 3,
			justification: []
		});
		v.parseMessage({
			sender: 'Dave',
			estimate: 4,
			justification: []
		});
		assert.equal(
			v.getEstimate().estimate,
			4, 
			"estimate should return 4"
		);
		assert.equal(
			v.getEstimate().safety,
			301/601, 
			"estimate safety should be votesFor/totalVotes"
		);
	});

});

