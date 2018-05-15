// Special non-standard methods implemented by ganache-cli that aren’t included within the original RPC specification.
// See https://github.com/ethereumjs/testrpc#implemented-methods

const increaseTime = (time) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [time], // Time increase param.
      id: new Date().getTime(),
    }, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};

const takeSnapshot = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_snapshot',
      params: [],
      id: new Date().getTime(),
    }, (err, result) => {
      if (err) {
        return reject(err);
      }

      return resolve(result.result);
    });
  });
};

const revertToSnapshot = (snapShotId) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_revert',
      params: [snapShotId],
      id: new Date().getTime(),
    }, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};

const mine = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: new Date().getTime(),
    }, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};

export default {
  increaseTime, takeSnapshot, revertToSnapshot, mine,
};
