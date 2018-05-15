require('babel-register');
require('babel-polyfill');

const BigNumber = require('bignumber.js');

// Add the "equals" method to BigNumber, in order to support chai-bignumber:
BigNumber.prototype.equals = BigNumber.prototype.isEqualTo;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 7545,
      network_id: '*',
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 7555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
  },
  mocha: {
    useColors: true,
    slow: 30000,
    bail: true,
  },
};
