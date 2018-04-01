var hashObj = require('object-hash');
var assert = require("assert");
var validators = require("../validators")

const BinaryValidator = validators.BinaryValidator;
const IntegerValidator = validators.IntegerValidator;


describe('Validator binary safety oracle', function() {
	it('should be a test', function() {
		let v = new BinaryValidator('Test', 0, 0);
		v.learnValidators([
			{name: 'Graham', weight: 100},
			{name: 'Brian', weight: 100},
			{name: 'Fred', weight: 100},
			{name: 'Eddy', weight: 100},
			{name: 'Donna', weight: 100},
			{name: 'Sally', weight: 100},
		]);

		const msg1 = {
			sender: 'Graham',
			estimate: 0,
			justification: [
				{
					sender: 'Graham',
					estimate: 0,
					justification: []
				},
				{
					sender: 'Brian',
					estimate: 0,
					justification: [
						{
							sender: 'Fred',
							estimate: 0,
							justification: [],
						},
						{
							sender: 'Brian',
							estimate: 0,
							justification: [
								{
									sender: 'Eddy',
									estimate: 0,
									justification: [],
								},
								{
									sender: 'Brian',
									estimate: 0,
									justification: [
										{
											sender: 'Donna',
											estimate: 1,
											justification: [],
										},
										{
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
													estimate: 1,
													justification: [],
												}
											]
										},
									]
								},
							]
						}
					]
				}
			]
		};

		v.parseMessage(msg1);
		assert.notEqual(
			v.isByzantine["Brian"],
			true,
			"Brian should not be byzantine."
		);
		console.log(v.getEstimate())
		console.log(v.findSafety())
	});
});

