# Casper the Friendly Javascript Ghost :ghost:

![Travis CI](https://travis-ci.org/sigp/cbc-casper-js.svg?branch=master)

A Javascript implementation of Vlad Zamfir's Casper the Friendly Ghost CBC
consensus protocol.

The paper is based primarily from the [CasperTFG
paper](https://github.com/ethereum/research/tree/master/papers/CasperTFG) by
Vlad Zamfir and also draws inspiration from the current [Python
implementation](https://github.com/ethereum/cbc-casper) by Nate Rush, Danny
Ryan, Vlad Zamfir, Karl Floersch and others.

*Note: this project is still in very early stages. It is likely faulty and
is subject to significant change. This should only be the case for the next
few weeks (i.e., until mid-April 2018).*

## Casper: GHOST or finality gadget?

There are two distinct projects, both sharing the name "Casper".

 1. Casper Correct-by-Construction (aka Casper CBC, "Vlad's Casper")
 2. Casper the Friendly Finality Gadget (aka Casper FFG, "Vitalik's Casper)

This project is implementing (1), Casper CBC. This project seeks to simulate
a network of peers coming to consensus across a loosely-asynchronous network
whilst tolerating some faulty behaviour. This project is not (at this stage)
concerned with any economic incentive mechanisms (i.e., it does not implement
staking).

For more detail, see Jon Choi's "Ethereum Casper 101" (the "A Tale 
of Two Caspers" section): 
https://medium.com/@jonchoi/ethereum-casper-101-7a851a4f1eb0

# Motivation

The motivation for creating a new implemenation can be seen in the following:

- Browser compatibility: running Casper sims in the browser should hopefully
  improve accessibility for those who wish to understand how Casper TFG work.
- Diversity: mutliple implementations will hopefully allow for a wider range of 
  perspectives.

# Requirements

This codebase has been developed in node `v9.8.0`. It uses some 
ES6 syntax and therefore some older versions of node will be incompatible.

# Usage

For first time usage, clone the repo and run `npm install` in the repo
directory.

## Command-line

The command-line script is `casper.js` and it has a fully featured argument
parser; you can run `./casper.js -h` (or `node casper.js -h`) to view help.

### Random Binary Conensus Simulator

Currenly the only available command-line function is `$ ./casper.js random`
which will run a binary consensus simulation where the following conditions
are randomised:

 - The initial estimate of the validators. I.e., if they choose to start with a 
   `0` or `1`.
 - The senders and recipients of messages for each round. (The number of messages
   sent per round is specified by the `-m` flag.)
   
The random sim will output a JSON object to console with the following
properties:

 - `decisions`: The estimates and associated safety ratios for each validator,
  as of simulation completion.
 - `initialConfig`: The starting values and weights for each validator. I.e.,
  what their states were before the consensus process started.
 - `log`: The full log of messages sent between validators during the consensus
  process. At this stage the log is not printed in it's entirety for readability.
   
_Note: due to the random nature of this simulation, it can quite easily run for 
very long times and generate very large messages. E.g., running a sim with 100
validators and only 1 message per round is likely going to take a lot of time 
and use a bunch of RAM. Simulate with caution._

#### Example

The following example is running a simulation with the following attributes:

- `-n 3`: Three validators will form consensus.
- `-s 0.5`: The simulation will end once at least half (0.5) of validators consider
  themselves safe with half (0.5) the other validators. We do not wait for
*all* validators to get to target safety because this can take a very long
time with random message propagation.
- `-m 1`: Each round there will be only 1 message sent between validators.

```
$ ./casper.js random -n 3 -s 0.5 -m 1
{ decisions: 
   { '0': { estimate: 1, safety: 0.6666666666666666 },
     '1': { estimate: 1, safety: 1 },
     '2': { estimate: 1, safety: 1 } },
  initialConfig: 
   [ { name: '0', weight: 100, startingPoint: 1 },
     { name: '1', weight: 100, startingPoint: 1 },
     { name: '2', weight: 100, startingPoint: 1 } ],
  log: 
   [ { msg: [Object], to: '0', from: '1', timestamp: 1521979672020 },
     { msg: [Object], to: '1', from: '2', timestamp: 1521979672021 },
     { msg: [Object], to: '1', from: '2', timestamp: 1521979672021 },
     { msg: [Object], to: '1', from: '0', timestamp: 1521979672021 },
     { msg: [Object], to: '2', from: '0', timestamp: 1521979672022 } ] }
```

## Tests

Tests are written in Mocha, run them with `$ npm run test`.

# Notes

To reduce the processing burden of equivocation detection, some new
requirements for message formation were added:

- A validator _must_ include a message from themself in the justifications
  of each message they send (unless the message is an "initial message" which
  does not provide any justification).
- A validator _must not_ include two messages from the same validator in their
  justification. This only applies to the first level of justifications, not
  the justifications of justifications (and their justifications, and so on).

Any validator which defies these rules will be flagged as Byzantine.

# Roadmap

- [x] Binary Consensus
  - [x] Estimator
  - [x] Byzantine Fault Detection
  - [x] Safety Oracle
  - [x] Command-line simulator
- [ ] Integer Consensus
  - [x] Estimator
  - [x] Byzantine Fault Detection
  - [ ] Safety Oracle
  - [ ] Command-line simulator
- [ ] Blockchain Consensus
- [ ] Full code coverage for tests
- [ ] Linting
- [ ] Graphical simulation (to be implemented as a separate project)
