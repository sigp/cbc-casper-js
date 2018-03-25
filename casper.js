#!/usr/bin/env node
'use strict';

var ArgumentParser = require('argparse').ArgumentParser;

var parser = new ArgumentParser({
	version: '0.0.1',
	addHelp: true,
	description: 'cbc-casper-js'
});

var sims = parser.addSubparsers({
  title:'Simulations',
  dest:"sim"
});

var random = sims.addParser('random', {addHelp:true});

random.addArgument(
	[ '-c', '--validator-count' ],
	{
		defaultValue: 3,
		type: 'int',
		help: 'The number of validators for the simulation.'
	}
);

random.addArgument(
	[ '-m', '--messages-per-round' ],
	{
		defaultValue: 1,
		type: 'int',
		help: 'The number of messages which will be sent per round.'
	}
);

random.addArgument(
	[ '-s', '--safety-ratio' ],
	{
		defaultValue: 0.5,
		type: 'float',
		help: 'The safety ratio all validators must exceed before the sim ends.'
	}
);

var args = parser.parseArgs();

if(args.sim === "random") {
	let binary = require('./sims/binary');
	console.log(binary.simulator(
		args.safety_ratio,
		args.messages_per_round,
		args.validator_count
	));
}
