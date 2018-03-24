var assert = require("assert");
var estimator = require("../binary")
var utils = require("../binary/utils")

describe('binary consensus estimator', function() {
	it('should return 1 if all votes are 1', function() {
		const bets = [
			{vote: 1, weight: 100}, 
			{vote: 0, weight: 99},
		]
		assert(
			estimator.estimate(bets) === 1, 
			"estimate should return 1");
	});
	
	it('should return 0 with majority 0', function() {
		const bets = [
			{vote: 0, weight: 100}, 
			{vote: 1, weight: 99},
		]
		assert(
			estimator.estimate(bets) === 0 , 
			"estimate should return 0");
	});
	
	it('should return 0 if votes are equal', function() {
		const bets = [
			{vote: 1, weight: 5}, 
			{vote: 0, weight: 5},
		]
		assert(
			estimator.estimate(bets) === 0, 
			"estimate should return 0 ");
	});
});

describe('binary utils', function() {
	it('should return a valid list of random bets', function() {
		const weights = [0, 100, 200, 250];
		const bets = utils.getRandomBets(weights);
		bets.forEach((bet, i) => {
			assert(bet.choice ===  0 || bet.choice === 1, 'bet should be 0 or 1');
			assert(bet.weight === weights[i], 'weights should map directly');
		});
	});
});
