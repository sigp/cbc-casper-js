var hashObj = require('object-hash');
var assert = require("assert");
var validators = require("../validators")

const Validator = validators.Validator;

describe('Validator weighting', function() {
	it('should learn about validators', function() {
		let v = new Validator('Test', 0, 0);
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
		let v = new Validator('Test', 0, 0);
		assert(
			v.getWeight('Zebra') === 0,
			'An unknown validator should have weight 0'
		);
	});
	
	it('should generate an accurate weight sum', function() {
		let v = new Validator('Test', 10, 0);
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
	
	it('should generate an accurate safety ratio with an abstaining ' + 
		'validator', function() {
		let v = new Validator('Test', 100, 1);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
		]);
		v.parseMessage({
			sender: 'Andy',
			estimate: 1,
			justification: []
		});
		assert(
			v.getEstimate().estimate === 1, 
			"estimate should return 1"
		);
		assert.equal(
			v.getEstimate().safety, 
			2/3,
			"estimate safety should be two thirds"
		);
	});
	
	it('should generate an accurate safety ratio with all validators' + 
		'abstaining', function() {
		let v = new Validator('Test', 100, 1);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Cam', weight: 100},
		]);
		assert(
			v.getEstimate().estimate === 1, 
			"estimate should return 1"
		);
		assert.equal(
			v.getEstimate().safety, 
			1/4,
			"estimate safety should be one quarter"
		);
	});
	
	it('should generate an accurate safety ratio with all validators' + 
		'agreeing', function() {
		let v = new Validator('Test', 100, 0);
		v.learnValidators([
			{name: 'Andy', weight: 100},
			{name: 'Brenda', weight: 100},
			{name: 'Cam', weight: 100},
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
		v.parseMessage({
			sender: 'Cam',
			estimate: 0,
			justification: []
		});
		assert(
			v.getEstimate().estimate === 0, 
			"estimate should return 0"
		);
		assert.equal(
			v.getEstimate().safety, 
			1,
			"estimate safety should be one"
		);
	});
});

describe('Validator binary estimation', function() {
	it('should return 1 if all votes are 1', function() {
		let v = new Validator('Test', 0, 0);
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
			estimate: 0,
			justification: []
		});
		assert(
			v.getEstimate().estimate === 1, 
			"estimate should return 1"
		);
	});
	
	it('should return 0 with majority 0', function() {
		let v = new Validator('Test', 0, 0);
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
			estimate: 1,
			justification: []
		});
		assert(
			v.getEstimate().estimate === 0 , 
			"estimate should return 0"
		);
	});
	
	it('should return 0 if votes are equal', function() {
		let v = new Validator('Test', 0, 0);
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

describe('Validator message generation', function() {
	
	it('should generate a starting point message', function() {
		let v = new Validator('Test', 100, 0)
		const msg = v.generateMessage();
		const expectedMsg = {
			sender: 'Test',
			weight: 100,
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
		let v = new Validator('Test', 100, 0);
		v.parseMessage(msg);
		const generated = v.generateMessage();
		const expected = {
			sender: 'Test',
			weight: 100,
			estimate: 0,
			justification: [
				{
					sender: 'Test',
					weight: 100,
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

describe('Validator message processing', function() {

	it('should place the first message from a sender in the table', function() {
		const msg = {
			sender: 'Brian',
			estimate: 1,
			justification: [],
		}
		let v = new Validator('Test', 0, 0);
		v.parseMessage(msg);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg, {}), 
			'the sent message should be the latest messsage.'
		);
	});

	it('should update last message when parsing a new message from a known sender', function() {
		const msg1 = {
			sender: 'Brian',
			estimate: 0,
			justification: [],
		};
		const msg2 = {
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
		};
		let v = new Validator('Test', 0, 0);
		// parse the first message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		v.parseMessage(msg2);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg2, {}), 
			'the latest message should have been updated.'
		);
	});
	
	it('should not update the last message when parsing a known dependency message', function() {
		const msg1 = {
			sender: 'Brian',
			estimate: 0,
			justification: [],
		};
		const msg2 = {
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
		};
		let v = new Validator('Test', 0, 0);
		// parse the most recent message
		v.parseMessage(msg2);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg2, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse a dependency of the previous message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg2, {}), 
			'the latest message should not have been updated.'
		);
	});
});

describe('Validator Byzantine detection', function() {
	
	it('should flag a sender as Byzantine if they fail to provide ' + 
		'one of thier own messages in their justification.', function() {
		const msg1 = {
			sender: 'Brian',
			estimate: 0,
			justification: [],
		};
		const msg2 = {
			sender: 'Brian',
			estimate: 0,
			justification: [
				{
					sender: 'Zebra',
					estimate: 0,		
					justification: [],
				},
				{
					sender: 'Sally',
					estimate: 0,
					justification: [],
				}
			],
		};
		let v = new Validator('Test', 0, 0);
		// parse the first message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		v.parseMessage(msg2);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the message was invalid and should not become the latest message.'
		);
		// Brian should be flagged as Byzantine
		assert(v.isByzantine['Brian'], 'Brian should be Byzantine')
	});
	
	it('should flag a sender as Byzantine if they present a contradicting initial message', function() {
		const msg1 = {
			sender: 'Brian',
			estimate: 0,
			justification: [],
		};
		const msg2 = {
			sender: 'Brian',
			estimate: 0,
			justification: [
				{
					sender: 'Brian',
					estimate: 1,		// <-- contradicts Brian's previous msg
					justification: [],
				},
				{
					sender: 'Sally',
					estimate: 0,
					justification: [],
				}
			],
		};
		let v = new Validator('Test', 0, 0);
		// parse the first message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		v.parseMessage(msg2);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the message was invalid and should not become the latest message.'
		);
		// Brian should be flagged as Byzantine
		assert(v.isByzantine['Brian'], 'Brian should be Byzantine')
	});
	
	it('should flag a sender as Byzantine if they send a message ' +
		'which has multiple messages from the same sender in the ' +
		'justification.', function() {
		const msg1 = {
			sender: 'Brian',
			estimate: 0,
			justification: [],
		};
		const msg2 = {
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
				},
				{
					sender: 'Brian', // <-- Brian is double voting here
					estimate: 0,
					justification: [],
				},
			],
		};
		let v = new Validator('Test', 0, 0);
		// parse the first message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		v.parseMessage(msg2);
		// Brian should be flagged as Byzantine
		assert(v.isByzantine['Brian'], 'Brian should be Byzantine')
		// the message should have been ignored
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the message was invalid and should not have become ' + 
			'the latest messsage.'
		);
	});
	
	it('should flag a sender as Byzantine if they send a message ' +
		'which has multiple messages from the same sender in the ' +
		'justification (when deep in messages).', function() {
		const msg1 = {
			sender: 'Brian',
			estimate: 0,
			justification: [],
		};
		const msg2 = {
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
					justification: [
						{
							sender: 'Andy',
							estimate: 0,
							justification: [],
						},
						{
							sender: 'Andy', // <-- duplicate
							estimate: 0,
							justification: [],
						},
					],
				},
			],
		};
		let v = new Validator('Test', 0, 0);
		// parse the first message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		v.parseMessage(msg2);
		// Brian should be flagged as Byzantine
		assert(v.isByzantine['Sally'], 'Sally should be Byzantine')
		// Brian's message should have been ignored
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the message was invalid and should not have become ' + 
			'the latest messsage.'
		);
		// Sallys's message should have been ignored
		assert.equal(
			v.lastMsgHashFrom('Sally'),
			undefined, 
			'Sallys message was Byzantine and should not have been stored '		
		);
	});
	
	it('should flag a sender as Byzantine if they fork their history', function() {
		const msg1 = {
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
									estimate: 0,
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
											estimate: 0,
											justification: [],
										}
									]
								},
							]
						},
					]
				}
			]
		};
		const msg2 = {
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
							sender: 'Xena', // <--- This is an equivocation
							estimate: 0,
							justification: [],
						},
						{
							sender: 'Brian',
							estimate: 0,
							justification: [
								{
									sender: 'Donna',
									estimate: 0,
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
											estimate: 0,
											justification: [],
										}
									]
								},
							]
						},
					]
				}
			]
		};
		let v = new Validator('Test', 0, 0);
		// parse the first message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		const err = v.parseMessage(msg2);
		assert.equal(
			v.lastMsgHashFrom('Brian'),
			v.addToHashTable(msg1, {}), 
			'the message was invalid and should not become the latest message.'
		);
		// Brian should be flagged as Byzantine
		assert(v.isByzantine['Brian'], 'Brian should be Byzantine')
	});
	
	it('should flag as Byzantine if there is a fork in the history ' + 
		'of another sender.', function() {
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
											estimate: 0,
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
													estimate: 0,
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
		const msg2 = {
			sender: 'Graham',
			estimate: 0,
			justification: [
				msg1,
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
									sender: 'Zebra', // <--- This is an equivocation
									estimate: 0,
									justification: [],
								},
								{
									sender: 'Brian',
									estimate: 0,
									justification: [
										{
											sender: 'Donna',
											estimate: 0,
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
													estimate: 0,
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
		let v = new Validator('Test', 0, 0);
		// parse the first message
		v.parseMessage(msg1);
		assert.equal(
			v.lastMsgHashFrom('Graham'),
			v.addToHashTable(msg1, {}), 
			'the sent message should be the latest messsage.'
		);
		// parse the second message
		const err = v.parseMessage(msg2);
		assert.equal(
			v.lastMsgHashFrom('Graham'),
			v.addToHashTable(msg1, {}), 
			'the message was invalid and should not become the latest message.'
		);
		// Brian should be flagged as Byzantine
		assert(v.isByzantine['Brian'], 'Brian should be Byzantine')
	});

});

describe('Validator message storage', function() {
	
	it('should compress messages into a hash table, then decompress out', function() {
		const nested = {
			sender: 'Brian',
			estimate: 1,
			justification: [
				{
					sender: 'Sally',
					estimate: 0,
					justification: [
						{
							sender: 'Andy',
							estimate: 1,
							justification: []
						},
						{
							sender: 'Donna',
							estimate: 0,
							justification: [
								{
									sender: 'Roger',
									estimate: 1,
									justification: []
								}
							]
						}
					]
				},
				{
					sender: 'Dave',
					estimate: 0,
					justification: [
						{
							sender: 'Anna',
							estimate: 1,
							justification: []
						}
					]
				}
			],
		}

		let v = new Validator('Test', 100, 0);
		let table = {};
		const rootHash = v.addToHashTable(nested, table);
		
		const expectedHashes = [
			'cd7cccb36e65b3986074310a35a9fc3785e65975',
			'f1144d1f236613ea8b93d2c2d3a659d1b3bd9600',
			'8e553b03a8e774f48882c8eddcc1e6c07f2b2369',
			'79d43df729fd883d60863b4c39aac32cdf0891d8',
			'2ff4e9b5bb3d37a41b96765ea74820287ff21a6c',
			'fbf00829dbe434d636653b79b891edd4669a4613',
			'561e727fb018ed79139e49ab8c684250fc101155',
		]
		for(i in expectedHashes) {
			assert(
				table[expectedHashes[i]] !== undefined, 
				'an expected hash was not found in the hash table' 
			);
		}
		const decompressed = v.decompressFromHashTable(rootHash, table);
		assert.equal(
			hashObj(decompressed),
			hashObj(nested),
			'the nested object did not decompress correctly'
		)
	});

});
