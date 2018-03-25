# Correct-by-Construction Casper the Friendly Ghost JS Implementation

A Javascript implementation of Vlad Zamfir's Casper the Friendly Ghost CBC
consensus protocol.

The paper is based primarily from the [CasperTFG
paper](https://github.com/ethereum/research/tree/master/papers/CasperTFG) by
Vlad Zamfir and also draws inspiration from the current [Python
implementation](https://github.com/ethereum/cbc-casper) by Nate Rush, Danny
Ryan, Vlad Zamfir, Karl Floersch and others.

# Usage

Currently all that exists is a `Validator` class and a suite of tests.

To run these tests, clone the repo then run: 

```
$ npm install
$ npm run test
```
