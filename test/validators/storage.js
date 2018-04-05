var hashObj = require('object-hash');
var assert = require("assert");
var validators = require("../../validators")

const BinaryValidator = validators.BinaryValidator;


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

		let v = new BinaryValidator('Test', 100, 0);
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
