# CBC Casper the Friendly Javascript Ghost

![Travis CI](https://travis-ci.org/sigp/cbc-casper-js.svg?branch=master)

A Javascript implementation of Vlad Zamfir's Casper the Friendly Ghost CBC
consensus protocol.

The paper is based primarily from the [CasperTFG
paper](https://github.com/ethereum/research/tree/master/papers/CasperTFG) by
Vlad Zamfir and also draws inspiration from the current [Python
implementation](https://github.com/ethereum/cbc-casper) by Nate Rush, Danny
Ryan, Vlad Zamfir, Karl Floersch and others.

# Motivation

The motivation for creating a new implemenation can be seen in the following:

- Browser compatibility: running Casper sims in the browser lowers the
  barrier-to-entry for people to understand how CBC Casper TFG works.
- Diversity: mutliple implementations will allow for a wider range of 
  perspectives.

# Requirements

This codebase has been developed in node `v9.8.0`. It uses some 
ES6 syntax and therefore some older versions of node will be incompatible.

# Usage

Currently all that exists is a `Validator` class and a suite of Mocha tests.

To run these tests, clone the repo then run: 

```
$ npm install
$ npm run test
```

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
- [ ] Integer Consensus
- [ ] Blockchain Consensus
- [ ] Simulate a network of validators working to reach consensus
- [ ] Graphical simulation (to be implemented as a separate project)
