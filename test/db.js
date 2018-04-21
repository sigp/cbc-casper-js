var hashObj = require('object-hash');
var assert = require("assert");
var MsgDB = require("../db")


describe('MsgDB hash table storage', function() {
	
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

		let db = new MsgDB();
		const rootHash = db.store(nested);
		
		[
			'cd7cccb36e65b3986074310a35a9fc3785e65975',
			'f1144d1f236613ea8b93d2c2d3a659d1b3bd9600',
			'8e553b03a8e774f48882c8eddcc1e6c07f2b2369',
			'79d43df729fd883d60863b4c39aac32cdf0891d8',
			'2ff4e9b5bb3d37a41b96765ea74820287ff21a6c',
			'fbf00829dbe434d636653b79b891edd4669a4613',
			'561e727fb018ed79139e49ab8c684250fc101155',
		].forEach(h => assert(db.exists(h), `${h} was not found in hashtable.`))

		const decompressed = db.decompress(rootHash);
		assert.equal(
			hashObj(decompressed),
			hashObj(nested),
			'the nested object did not decompress correctly'
		)
	});
	
	it('should store msgs with hashes as justifications', function() { 
		let db = new MsgDB();

		const msg1 = {
			sender: 'Brian',
			estimate: 1,
			justification: []
		};
		const hash1 = db.store(msg1);
		const msg2 = {
			sender: 'Jane',
			estimate: 1,
			justification: [
				hash1
			]
		};
		const hash2 = db.store(msg2);
	
		let retrieved = db.retrieve(hash2);
		assert(
			retrieved.justification[0] === hash1,
			'msg2 should have the correct justification'
		)
	});
});
