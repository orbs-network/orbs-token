import chai from 'chai';
import dirtyChai from 'dirty-chai';
import web3EthAbi from 'web3-eth-abi';
import expectRevert from './helpers/expectRevert';

const { expect } = chai;
chai.use(dirtyChai);

const TestERC20Token = artifacts.require('.helpers/TestERC20Token.sol');
const MultiSigWalletMock = artifacts.require('./helpers/MultiSigWalletMock.sol');

contract('MultiSigWallet', (accounts) => {
  const DEFAULT_GAS_PRICE = 100000000000;
  const GAS_COST_ERROR = process.env.SOLIDITY_COVERAGE ? 30000000000000000 : 0;
  const MAX_OWNER_COUNT = 50;

  const ERC20_TRANSFER_ABI = {
    name: 'transfer',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'to',
    },
    {
      type: 'uint256',
      name: 'value',
    }],
  };

  const MULTISIGWALLET_ABI = {
    addOwner: {
      name: 'addOwner',
      type: 'function',
      inputs: [{
        type: 'address',
        name: 'owner',
      }],
    },
    removeOwner: {
      name: 'removeOwner',
      type: 'function',
      inputs: [{
        type: 'address',
        name: 'owner',
      }],
    },
    replaceOwner: {
      name: 'replaceOwner',
      type: 'function',
      inputs: [{
        type: 'address',
        name: 'owner',
      }, {
        type: 'address',
        name: 'newOwner',
      }],
    },
    changeRequirement: {
      name: 'changeRequirement',
      type: 'function',
      inputs: [{
        type: 'uint256',
        name: 'required',
      }],
    },
  };

  describe('construction', async () => {
    context('error', async () => {
      it(`should throw if created with more than ${MAX_OWNER_COUNT} owners`, async () => {
        const owners = [];
        for (let i = 0; i < MAX_OWNER_COUNT + 1; ++i) {
          owners.push(i + 1);
        }

        await expectRevert(MultiSigWalletMock.new(owners, 2));
      });

      it('should throw if created without any owners', async () => {
        await expectRevert(MultiSigWalletMock.new([], 2));
      });

      it('should throw if created without any requirements', async () => {
        await expectRevert(MultiSigWalletMock.new([accounts[0], accounts[1]], 0));
      });

      it('should throw if created with a requirement larger than the number of owners', async () => {
        await expectRevert(MultiSigWalletMock.new([accounts[0], accounts[1], accounts[2]], 10));
      });

      it('should throw if created with duplicate owners', async () => {
        await expectRevert(MultiSigWalletMock.new([accounts[0], accounts[1], accounts[2], accounts[1]], 3));
      });
    });

    context('success', async () => {
      const owners = [accounts[0], accounts[1], accounts[2]];
      const requirement = 2;

      it('should be initialized with 0 balance', async () => {
        const wallet = await MultiSigWalletMock.new(owners, requirement);

        expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(0);
      });

      it('should initialize owners', async () => {
        const wallet = await MultiSigWalletMock.new(owners, requirement);

        expect(owners).to.have.members(await wallet.getOwners.call());
      });

      it('should initialize owners\'s mapping', async () => {
        const wallet = await MultiSigWalletMock.new(owners, requirement);

        for (const owner of owners) {
          expect(await wallet.isOwner(owner)).to.be.true();
        }

        expect(await wallet.isOwner(accounts[9])).to.be.false();
      });

      it('should initialize requirement', async () => {
        const wallet = await MultiSigWalletMock.new(owners, requirement);

        expect(await wallet.required()).to.be.bignumber.equal(requirement);
      });

      it('should initialize with empty transaction count', async () => {
        const wallet = await MultiSigWalletMock.new(owners, requirement);

        expect(await wallet.transactionCount()).to.be.bignumber.equal(0);
      });
    });
  });

  describe('fallback function', async () => {
    const owners = [accounts[0], accounts[1], accounts[2]];
    const requirement = 2;
    let wallet;
    const sender = accounts[3];

    beforeEach(async () => {
      wallet = await MultiSigWalletMock.new(owners, requirement);
    });

    it('should not log empty deposits', async () => {
      const transaction = await wallet.sendTransaction({ from: sender, value: 0 });

      expect(transaction.logs).to.have.length(0);
    });

    it('should receive ETH', async () => {
      const senderBalance = web3.eth.getBalance(sender);
      const walletBalance = web3.eth.getBalance(wallet.address);
      expect(walletBalance).to.be.bignumber.equal(0);

      const value = 981;
      const transaction = await wallet.sendTransaction({ from: sender, value });

      expect(transaction.logs).to.have.length(1);
      const event = transaction.logs[0];
      expect(event.event).to.eql('Deposit');
      expect(event.args.sender).to.eql(sender);
      expect(Number(event.args.value)).to.eql(value);

      const gasUsed = DEFAULT_GAS_PRICE * transaction.receipt.gasUsed;
      const senderBalance2 = web3.eth.getBalance(sender);
      expect(senderBalance2.toNumber()).to.be.closeTo(senderBalance.minus(value).minus(gasUsed).toNumber(),
        GAS_COST_ERROR);

      const walletBalance2 = web3.eth.getBalance(wallet.address);
      expect(walletBalance2).to.be.bignumber.equal(walletBalance.plus(value));
    });

    it('should receive ERC20', async () => {
      const value = 211;
      const token = await TestERC20Token.new(value);

      const transaction = await token.transfer(sender, value);
      expect(transaction.logs).to.have.length(1);
      const event = transaction.logs[0];
      expect(event.event).not.to.eql('Deposit');

      const senderBalance = await token.balanceOf.call(sender);
      const walletBalance = await token.balanceOf.call(wallet.address);
      expect(senderBalance).to.be.bignumber.equal(value);
      expect(walletBalance).to.be.bignumber.equal(0);

      await token.transfer(wallet.address, value, { from: sender });

      const senderBalance2 = await token.balanceOf.call(sender);
      expect(senderBalance2).to.be.bignumber.equal(senderBalance.minus(value));

      const walletBalance2 = await token.balanceOf.call(wallet.address);
      expect(walletBalance2).to.be.bignumber.equal(walletBalance.plus(value));
    });
  });

  describe('transaction submission and confirmation', async () => {
    [
      { owners: [accounts[1], accounts[2]], requirement: 1 },
      { owners: [accounts[1], accounts[2]], requirement: 2 },
      { owners: [accounts[1], accounts[2], accounts[3]], requirement: 2 },
      { owners: [accounts[1], accounts[2], accounts[3]], requirement: 3 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4]], requirement: 1 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4]], requirement: 2 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4]], requirement: 3 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4]], requirement: 4 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]], requirement: 3 },
    ].forEach((spec) => {
      context(`with ${spec.owners.length} owners and requirement of ${spec.requirement}`, async () => {
        let wallet;
        let token;
        const initETHBalance = 666654;
        const initERC20Balance = 12345678;
        const value = 23400;
        const sender = spec.owners[0];
        const notOwner = accounts[8];
        const receiver = accounts[9];

        beforeEach(async () => {
          wallet = await MultiSigWalletMock.new(spec.owners, spec.requirement);
          await wallet.sendTransaction({ value: initETHBalance });
          expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(initETHBalance);

          token = await TestERC20Token.new(initERC20Balance);

          await token.transfer(wallet.address, initERC20Balance);

          expect(await token.balanceOf.call(wallet.address)).to.be.bignumber.equal(initERC20Balance);
          expect(await token.balanceOf.call(receiver)).to.be.bignumber.equal(0);
        });

        describe('submitTransaction', async () => {
          it('should throw an error, if sent from not an owner', async () => {
            await expectRevert(wallet.submitTransaction(receiver, value, [], { from: notOwner }));
          });

          it('should throw an error, if sent to a 0 address', async () => {
            await expectRevert(wallet.submitTransaction(null, value, [], { from: sender }));
          });
        });

        describe('confirmTransaction', async () => {
          it('should throw an error, if confirming the same transaction after submitting it', async () => {
            await wallet.submitTransaction(receiver, value, [], { from: sender });

            const transactionId = await wallet.transactionId();
            await expectRevert(wallet.confirmTransaction(transactionId, { from: sender }));
          });

          if (spec.requirement > 1) {
            it('should throw an error, if sent from not an owner', async () => {
              await wallet.submitTransaction(receiver, value, [], { from: sender });
              const transactionId = await wallet.transactionId();

              await expectRevert(wallet.confirmTransaction(transactionId, { from: notOwner }));
            });

            it('should throw an error, if confirming the same transaction twice', async () => {
              await wallet.submitTransaction(receiver, value, [], { from: sender });
              const transactionId = await wallet.transactionId();

              const confirmer = spec.owners[1];
              await wallet.confirmTransaction(transactionId, { from: confirmer });

              await expectRevert(wallet.confirmTransaction(transactionId, { from: confirmer }));
            });
          }

          it('should throw an error, if confirming a non-existing transaction', async () => {
            await expectRevert(wallet.confirmTransaction(12345, { from: spec.owners[0] }));
          });
        });

        describe('revokeConfirmation', async () => {
          if (spec.requirement > 1) {
            it('should throw an error, if sent from not an owner', async () => {
              await wallet.submitTransaction(receiver, value, [], { from: sender });
              const transactionId = await wallet.transactionId();

              const confirmer = spec.owners[1];
              await wallet.confirmTransaction(transactionId, { from: confirmer });

              await expectRevert(wallet.revokeConfirmation(transactionId, { from: notOwner }));
            });

            it('should throw an error, if asked to revoke a non-confirmed transaction', async () => {
              await wallet.submitTransaction(receiver, value, [], { from: sender });
              const transactionId = await wallet.transactionId();

              await expectRevert(wallet.revokeConfirmation(transactionId, { from: spec.owners[1] }));
            });
          }

          if (spec.requirement > 2) {
            it('should revoke a confirmation', async () => {
              await wallet.submitTransaction(receiver, value, [], { from: sender });
              const transactionId = await wallet.transactionId();

              const confirmer = spec.owners[1];
              await wallet.confirmTransaction(transactionId, { from: confirmer });
              expect(await wallet.getConfirmationCount.call(transactionId)).to.be.bignumber.equal(2);

              await wallet.revokeConfirmation(transactionId, { from: confirmer });
              expect(await wallet.getConfirmationCount.call(transactionId)).to.be.bignumber.equal(1);
            });
          }

          it('should throw an error, if asked to revoke an executed transaction', async () => {
            await wallet.submitTransaction(receiver, value, [], { from: sender });
            const transactionId = await wallet.transactionId();

            let confirmations = 1;
            for (let i = 1; i < spec.owners.length && confirmations < spec.requirement; i++) {
              await wallet.confirmTransaction(transactionId, { from: spec.owners[i] });
              confirmations++;
            }

            await expectRevert(wallet.revokeConfirmation(transactionId, { from: sender }));
          });
        });

        describe('executeTransaction', async () => {
          if (spec.requirement === 1) {
            return;
          }

          const isConfirmedBy = async (transactionId, address) => {
            for (const confirmer of (await wallet.getConfirmations.call(transactionId))) {
              if (confirmer === address) {
                return true;
              }
            }

            return false;
          };

          const isExecuted = async (transactionId) => {
            const transactionInfo = await wallet.transactions(transactionId);

            return transactionInfo[3];
          };

          const getTransactionCount = async (pending, executed) =>
            (await wallet.getTransactionCount.call(pending, executed)).toNumber();
          const getPendingCount = async () => getTransactionCount(true, false);
          const getExecutedCount = async () => getTransactionCount(false, true);

          const getTransactionIds = async (pending, executed) => {
            let count = 0;

            if (pending) {
              count += await getPendingCount();
            }

            if (executed) {
              count += await getExecutedCount();
            }

            if (count === 0) {
              return [];
            }

            const ids = await wallet.getTransactionIds.call(0, count, pending, executed);
            return ids.map(id => id.toNumber());
          };
          const getPendingIds = async () => getTransactionIds(true, false);
          const getExecutedIds = async () => getTransactionIds(false, true);

          context('executed', async () => {
            let transactionId;
            let confirmations;

            beforeEach(async () => {
              const receiverBalance = web3.eth.getBalance(receiver);

              await wallet.submitTransaction(receiver, value, [], { from: sender });
              transactionId = await wallet.transactionId();

              expect(await getPendingCount()).to.eql(1);
              expect(await getPendingIds()).to.have.members([transactionId.toNumber()]);
              expect(await getExecutedCount()).to.eql(0);
              expect(await getExecutedIds()).to.be.empty();

              confirmations = 1;

              for (let i = 1; i < spec.owners.length && confirmations < spec.requirement; i++) {
                await wallet.confirmTransaction(transactionId, { from: spec.owners[i] });
                confirmations++;

                expect(await isConfirmedBy(transactionId, spec.owners[i])).to.be.true();
                expect(await isExecuted(transactionId)).to.eql(confirmations === spec.requirement);
              }

              expect(await wallet.isConfirmed.call(transactionId)).to.be.true();
              expect(await isExecuted(transactionId)).to.be.true();
              expect(await getPendingCount()).to.eql(0);
              expect(await getPendingIds()).to.be.empty();
              expect(await getExecutedCount()).to.eql(1);
              expect(await getExecutedIds()).to.have.members([transactionId.toNumber()]);
              expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(initETHBalance - value);
              expect(web3.eth.getBalance(receiver)).to.be.bignumber.equal(receiverBalance.plus(value));
            });

            it('should throw, if called again', async () => {
              await expectRevert(wallet.executeTransaction(transactionId, { from: sender }));
            });
          });

          context('not executed', async () => {
            let transactionId;
            let confirmations;

            beforeEach(async () => {
              const receiverBalance = web3.eth.getBalance(receiver);

              await wallet.submitTransaction(receiver, value, [], { from: sender });
              transactionId = await wallet.transactionId();

              expect(await getPendingCount()).to.eql(1);
              expect(await getPendingIds()).to.have.members([transactionId.toNumber()]);
              expect(await getExecutedCount()).to.eql(0);
              expect(await getExecutedIds()).to.be.empty();

              confirmations = 1;

              for (let i = 1; i < spec.owners.length && confirmations < spec.requirement - 1; i++) {
                await wallet.confirmTransaction(transactionId, { from: spec.owners[i] });
                confirmations++;

                expect(await isConfirmedBy(transactionId, spec.owners[i])).to.be.true();
                expect(await isExecuted(transactionId)).to.eql(confirmations === spec.requirement);
              }

              expect(await wallet.isConfirmed.call(transactionId)).to.be.false();
              expect(await isExecuted(transactionId)).to.be.false();
              expect(await getPendingCount()).to.eql(1);
              expect(await getPendingIds()).to.have.members([transactionId.toNumber()]);
              expect(await getExecutedCount()).to.eql(0);
              expect(await getExecutedIds()).to.be.empty();
              expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(initETHBalance);
              expect(web3.eth.getBalance(receiver)).to.be.bignumber.equal(receiverBalance);
            });

            context('not confirmed', async () => {
              beforeEach(async () => {
                expect(await wallet.isConfirmed.call(transactionId)).to.be.false();
              });

              it('should be executed automatically, once final confirmation is received', async () => {
                const receiverBalance = web3.eth.getBalance(receiver);

                await wallet.confirmTransaction(transactionId, { from: spec.owners[confirmations] });

                expect(await wallet.isConfirmed.call(transactionId)).to.be.true();
                expect(await isExecuted(transactionId)).to.be.true();
                expect(await getPendingCount()).to.eql(0);
                expect(await getPendingIds()).to.be.empty();
                expect(await getExecutedCount()).to.eql(1);
                expect(await getExecutedIds()).to.have.members([transactionId.toNumber()]);
                expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(initETHBalance - value);
                expect(web3.eth.getBalance(receiver)).to.be.bignumber.equal(receiverBalance.plus(value));
              });

              it('should fail gracefully, if called by a confirmed owner', async () => {
                const receiverBalance = web3.eth.getBalance(receiver);

                expect(await isConfirmedBy(transactionId, sender)).to.be.true();
                await wallet.executeTransaction(transactionId, { from: sender });

                expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(initETHBalance);
                expect(web3.eth.getBalance(receiver)).to.be.bignumber.equal(receiverBalance);

                expect(await isExecuted(transactionId)).to.be.false();
              });

              it('should throw, if called by a non-confirmed owner', async () => {
                const notConfirmer = spec.owners[spec.owners.length - 1];
                expect(await isConfirmedBy(transactionId, notConfirmer)).to.be.false();

                await expectRevert(wallet.executeTransaction(transactionId, { from: notConfirmer }));
              });
            });

            context('confirmed', async () => {
              let transactionId2;

              beforeEach(async () => {
                const receiverBalance = web3.eth.getBalance(receiver);

                // Make sure that the final confirmation will trigger a failing transaction, for example by ensuring
                // there won't be enough ETH left.
                const walletBalance = web3.eth.getBalance(wallet.address).toNumber();
                await wallet.submitTransaction(receiver, walletBalance, [], { from: sender });
                transactionId2 = await wallet.transactionId();

                expect(await getPendingCount()).to.eql(2);
                expect(await getPendingIds()).to.have.members([transactionId.toNumber(), transactionId2.toNumber()]);
                expect(await getExecutedCount()).to.eql(0);
                expect(await getExecutedIds()).to.be.empty();

                let confirmations2 = 1;

                for (let i = 1; i < spec.owners.length && confirmations2 < spec.requirement; i++) {
                  await wallet.confirmTransaction(transactionId2, { from: spec.owners[i] });
                  confirmations2++;

                  expect(await isConfirmedBy(transactionId2, spec.owners[i])).to.be.true();
                  expect(await isExecuted(transactionId2)).to.eql(confirmations2 === spec.requirement);
                }

                expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(0);

                // Sending a final confirmation and even trying to explicitly trigger execution of the transaction
                // shouldn't mark it as executed, as there is explicitly not enough ETH to handle it.
                await wallet.confirmTransaction(transactionId, { from: spec.owners[confirmations] });
                await wallet.executeTransaction(transactionId, { from: sender });

                expect(await wallet.isConfirmed.call(transactionId)).to.be.true();
                expect(await isExecuted(transactionId)).to.be.false();
                expect(await getPendingCount()).to.eql(1);
                expect(await getPendingIds()).to.have.members([transactionId.toNumber()]);
                expect(await getExecutedCount()).to.eql(1);
                expect(await getExecutedIds()).to.have.members([transactionId2.toNumber()]);
                expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(0);
                expect(web3.eth.getBalance(receiver)).to.be.bignumber.equal(receiverBalance.plus(walletBalance));

                // Transfer ETH back to the wallet, so that the original transaction will succeed.
                await web3.eth.sendTransaction({ from: sender, to: wallet.address, value });
                expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(value);
              });

              it('should throw an error, if asked to be executed by not an owner', async () => {
                await expectRevert(wallet.executeTransaction(transactionId, { from: notOwner }));
              });

              if (spec.requirement < spec.owners.length) {
                it('should throw an error, if asked to be executed by an unconfirmed owner', async () => {
                  const notConfirmer = spec.owners[spec.owners.length - 1];
                  expect(await isConfirmedBy(transactionId, notConfirmer)).to.be.false();

                  await expectRevert(wallet.executeTransaction(transactionId, { from: notOwner }));
                });
              }

              it('should be executed successfully when retrying', async () => {
                const receiverBalance = web3.eth.getBalance(receiver);

                await wallet.executeTransaction(transactionId, { from: sender });

                expect(await wallet.isConfirmed.call(transactionId)).to.be.true();
                expect(await isExecuted(transactionId)).to.be.true();
                expect(await getPendingCount()).to.eql(0);
                expect(await getPendingIds()).to.be.empty();
                expect(await getExecutedCount()).to.eql(2);
                expect(await getExecutedIds()).to.have.members([transactionId.toNumber(), transactionId2.toNumber()]);
                expect(web3.eth.getBalance(wallet.address)).to.be.bignumber.equal(0);
                expect(web3.eth.getBalance(receiver)).to.be.bignumber.equal(receiverBalance.plus(value));
              });
            });
          });
        });

        const getBalance = async (address, coin) => {
          switch (coin) {
            case 'ETH':
              return web3.eth.getBalance(address);

            case 'ERC20':
              return token.balanceOf.call(address);

            default:
              throw new Error(`Invalid type: ${coin}!`);
          }
        };

        const submitTransaction = async (to, amount, from, coin) => {
          switch (coin) {
            case 'ETH':
              return wallet.submitTransaction(to, amount, [], { from });

            case 'ERC20': {
              const params = [to, amount];
              const encoded = web3EthAbi.encodeFunctionCall(ERC20_TRANSFER_ABI, params);

              return wallet.submitTransaction(token.address, 0, encoded, { from });
            }

            default:
              throw new Error(`Invalid type: ${coin}!`);
          }
        };

        [
          'ETH',
          'ERC20',
        ].forEach((coin) => {
          it(`should only send ${coin} when all confirmations were received`, async () => {
            await submitTransaction(receiver, value, spec.owners[0], coin);
            const transactionId = await wallet.transactionId();

            let confirmations = 1;

            for (let i = 1; i < spec.owners.length; i++) {
              const confirmer = spec.owners[i];

              const prevWalletBalance = await getBalance(wallet.address, coin);
              const prevReceiverBalance = await getBalance(receiver, coin);

              // If this is not the final confirmation - don't expect any change.
              if (confirmations < spec.requirement) {
                expect(await wallet.isConfirmed.call(transactionId)).to.be.false();

                await wallet.confirmTransaction(transactionId, { from: confirmer });
                confirmations++;
                expect(await wallet.getConfirmationCount.call(transactionId)).to.be.bignumber.equal(confirmations);

                // Should throw an error if trying to confirm the same transaction twice.
                await expectRevert(wallet.confirmTransaction(transactionId, { from: confirmer }));

                const walletBalance = await getBalance(wallet.address, coin);
                const receiverBalance = await getBalance(receiver, coin);

                if (confirmations === spec.requirement) {
                  expect(await wallet.isConfirmed.call(transactionId)).to.be.true();

                  expect(walletBalance).to.be.bignumber.equal(prevWalletBalance.minus(value));
                  expect(receiverBalance).to.be.bignumber.equal(prevReceiverBalance.plus(value));
                } else {
                  expect(await wallet.isConfirmed.call(transactionId)).to.be.false();

                  expect(walletBalance).to.be.bignumber.equal(prevWalletBalance);
                  expect(receiverBalance).to.be.bignumber.equal(prevReceiverBalance);
                }
              } else {
                expect(await wallet.isConfirmed.call(transactionId)).to.be.true();

                // Should throw an error if trying to confirm an already executed transaction.
                await expectRevert(wallet.confirmTransaction(transactionId, { from: confirmer }));

                const walletBalance = await getBalance(wallet.address, coin);
                const receiverBalance = await getBalance(receiver, coin);

                expect(walletBalance).to.be.bignumber.equal(prevWalletBalance);
                expect(receiverBalance).to.be.bignumber.equal(prevReceiverBalance);
              }
            }
          });
        });
      });
    });
  });

  describe('internal methods', async () => {
    [
      { owners: [accounts[1], accounts[2]], requirement: 1 },
      { owners: [accounts[1], accounts[2]], requirement: 2 },
      { owners: [accounts[1], accounts[2], accounts[3]], requirement: 2 },
      { owners: [accounts[1], accounts[2], accounts[3]], requirement: 3 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4]], requirement: 1 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4]], requirement: 2 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4]], requirement: 3 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4]], requirement: 4 },
      { owners: [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]], requirement: 3 },
    ].forEach((spec) => {
      context(`with ${spec.owners.length} owners and requirement of ${spec.requirement}`, async () => {
        let wallet;
        const notOwner = accounts[8];
        const notOwner2 = accounts[9];

        beforeEach(async () => {
          wallet = await MultiSigWalletMock.new(spec.owners, spec.requirement);
        });

        describe('addOwner', async () => {
          const addOwner = async (owner, from) => {
            const params = [owner];
            const encoded = web3EthAbi.encodeFunctionCall(MULTISIGWALLET_ABI.addOwner, params);

            let transaction = await wallet.submitTransaction(wallet.address, 0, encoded, { from });
            const transactionId = await wallet.transactionId();

            let confirmations = 1;

            for (let i = 1; i < spec.owners.length; i++) {
              const confirmer = spec.owners[i];

              // If this is not the final confirmation - confirm.
              if (confirmations < spec.requirement) {
                transaction = await wallet.confirmTransaction(transactionId, { from: confirmer });
                confirmations++;
              }
            }

            for (const log of transaction.logs) {
              if (log.event === 'ExecutionFailure') {
                throw new Error('invalid opcode');
              }
            }
          };

          it('should throw an error, if called directly', async () => {
            await expectRevert(wallet.addOwner(notOwner, { from: spec.owners[0] }));
          });

          it('should throw an error, if called by not an owner', async () => {
            await expectRevert(addOwner(notOwner2, notOwner));
          });

          it('should throw an error, if adding an empty owner', async () => {
            await expectRevert(addOwner('0000000000000000000000000000000000000000', spec.owners[0]));
          });

          it('should throw an error, if adding an existing owner', async () => {
            await expectRevert(addOwner(spec.owners[1], spec.owners[0]));
          });

          it('should add an owner', async () => {
            expect(await wallet.isOwner(notOwner)).to.be.false();

            await addOwner(notOwner, spec.owners[0]);

            expect(await wallet.isOwner(notOwner)).to.be.true();
          });
        });

        describe('removeOwner', async () => {
          const removeOwner = async (owner, from) => {
            const params = [owner];
            const encoded = web3EthAbi.encodeFunctionCall(MULTISIGWALLET_ABI.removeOwner, params);

            let transaction = await wallet.submitTransaction(wallet.address, 0, encoded, { from });
            const transactionId = await wallet.transactionId();

            let confirmations = 1;

            for (let i = 1; i < spec.owners.length; i++) {
              const confirmer = spec.owners[i];

              // If this is not the final confirmation - confirm.
              if (confirmations < spec.requirement) {
                transaction = await wallet.confirmTransaction(transactionId, { from: confirmer });
                confirmations++;
              }
            }

            for (const log of transaction.logs) {
              if (log.event === 'ExecutionFailure') {
                throw new Error('invalid opcode');
              }
            }
          };

          it('should throw an error, if called directly', async () => {
            await expectRevert(wallet.removeOwner(spec.owners[0], { from: spec.owners[0] }));
          });

          it('should throw an error, if called by not an owner', async () => {
            await expectRevert(removeOwner(spec.owners[0], notOwner));
          });

          it('should throw an error, if removing a non-existing owner', async () => {
            await expectRevert(removeOwner(notOwner, spec.owners[0]));
          });

          it('should remove an owner', async () => {
            const owner = spec.owners[1];
            const requirement = (await wallet.required()).toNumber();

            expect(await wallet.isOwner(owner)).to.be.true();

            await removeOwner(owner, spec.owners[0]);

            const newRequirement = (await wallet.required()).toNumber();
            if (spec.requirement > spec.owners.length - 1) {
              expect(newRequirement).to.eql(requirement - 1);
            } else {
              expect(newRequirement).to.eql(requirement);
            }

            expect(await wallet.isOwner(owner)).to.be.false();
          });
        });

        describe('replaceOwner', async () => {
          const replaceOwner = async (owner, newOwner, from) => {
            const params = [owner, newOwner];
            const encoded = web3EthAbi.encodeFunctionCall(MULTISIGWALLET_ABI.replaceOwner, params);

            let transaction = await wallet.submitTransaction(wallet.address, 0, encoded, { from });
            const transactionId = await wallet.transactionId();

            let confirmations = 1;

            for (let i = 1; i < spec.owners.length; i++) {
              const confirmer = spec.owners[i];

              // If this is not the final confirmation - confirm.
              if (confirmations < spec.requirement) {
                transaction = await wallet.confirmTransaction(transactionId, { from: confirmer });
                confirmations++;
              }
            }

            for (const log of transaction.logs) {
              if (log.event === 'ExecutionFailure') {
                throw new Error('invalid opcode');
              }
            }
          };

          it('should throw an error, if called directly', async () => {
            await expectRevert(wallet.replaceOwner(spec.owners[0], spec.owners[1], { from: spec.owners[0] }));
          });

          it('should throw an error, if called by not an owner', async () => {
            await expectRevert(replaceOwner(spec.owners[0], spec.owners[1], notOwner));
          });

          it('should throw an error, if replacing a non-existing owner', async () => {
            await expectRevert(replaceOwner(notOwner, spec.owners[1], spec.owners[0]));
          });

          it('should replace an owner', async () => {
            const owner = spec.owners[1];

            expect(await wallet.isOwner(owner)).to.be.true();
            expect(await wallet.isOwner(notOwner)).to.be.false();

            await replaceOwner(owner, notOwner, spec.owners[0]);

            expect(await wallet.isOwner(owner)).to.be.false();
            expect(await wallet.isOwner(notOwner)).to.be.true();
          });
        });

        describe('changeRequirement', async () => {
          const changeRequirement = async (requirement, from) => {
            const params = [requirement];
            const encoded = web3EthAbi.encodeFunctionCall(MULTISIGWALLET_ABI.changeRequirement, params);

            let transaction = await wallet.submitTransaction(wallet.address, 0, encoded, { from });
            const transactionId = await wallet.transactionId();

            let confirmations = 1;

            for (let i = 1; i < spec.owners.length; i++) {
              const confirmer = spec.owners[i];

              // If this is not the final confirmation - confirm.
              if (confirmations < spec.requirement) {
                transaction = await wallet.confirmTransaction(transactionId, { from: confirmer });
                confirmations++;
              }
            }

            for (const log of transaction.logs) {
              if (log.event === 'ExecutionFailure') {
                throw new Error('invalid opcode');
              }
            }
          };

          it('should throw an error, if called directly', async () => {
            const requirement = spec.requirement === 1 ? 2 : spec.requirement - 1;
            await expectRevert(wallet.changeRequirement(requirement, { from: spec.owners[0] }));
          });

          it('should throw an error, if called by not an owner', async () => {
            const requirement = spec.requirement === 1 ? 2 : spec.requirement - 1;
            await expectRevert(changeRequirement(requirement, notOwner));
          });

          if (spec.requirement < spec.owners.length) {
            it('should increase requirement by 1', async () => {
              let requirement = (await wallet.required()).toNumber();
              expect(requirement).to.eql(spec.requirement);

              await changeRequirement(spec.requirement + 1, spec.owners[0]);

              requirement = (await wallet.required()).toNumber();
              expect(requirement).to.eql(spec.requirement + 1);
            });
          } else {
            it('should decrease requirement by 1', async () => {
              let requirement = (await wallet.required()).toNumber();
              expect(requirement).to.eql(spec.requirement);

              await changeRequirement(spec.requirement - 1, spec.owners[0]);

              requirement = (await wallet.required()).toNumber();
              expect(requirement).to.eql(spec.requirement - 1);
            });
          }
        });
      });
    });
  });

  describe('events', async () => {
    const owner1 = accounts[1];
    const owner2 = accounts[2];
    const owner3 = accounts[3];

    const notOwner = accounts[4];
    const receiver = accounts[5];

    const initialFunds = 350;
    const transferredFunds = 100;

    let wallet;

    beforeEach(async () => {
      wallet = await MultiSigWalletMock.new([owner1, owner2, owner3], 3);
      await wallet.sendTransaction({ value: initialFunds });
    });

    it('should emit deposit event when calling fallback function', async () => {
      const result = await wallet.sendTransaction({ from: owner1, value: transferredFunds });

      expect(result.logs).to.have.length(1);

      const event = result.logs[0];
      expect(event.event).to.eql('Deposit');
      expect(event.args.sender).to.eql(owner1);
      expect(Number(event.args.value)).to.eql(transferredFunds);
    });

    it('should emit events when submitting transaction', async () => {
      const result = await wallet.submitTransaction(receiver, transferredFunds, [], { from: owner1 });

      expect(result.logs).to.have.length(2);

      const event = result.logs[0];
      expect(event.event).to.eql('Submission');
      expect(event.args.transactionId).to.be.bignumber.equal(0);

      const event2 = result.logs[1];
      expect(event2.event).to.eql('Confirmation');
      expect(event2.args.sender).to.eql(owner1);
      expect(event2.args.transactionId).to.be.bignumber.equal(0);
    });

    it('should emit events when confirming transaction', async () => {
      await wallet.submitTransaction(receiver, transferredFunds, [], { from: owner1 });

      let result = await wallet.confirmTransaction(0, { from: owner2 });

      expect(result.logs).to.have.length(1);

      const event = result.logs[0];
      expect(event.event).to.eql('Confirmation');
      expect(event.args.transactionId).to.be.bignumber.equal(0);

      result = await wallet.confirmTransaction(0, { from: owner3 });

      expect(result.logs).to.have.length(2);

      const event2 = result.logs[0];
      expect(event2.event).to.eql('Confirmation');
      expect(event2.args.transactionId).to.be.bignumber.equal(0);

      // Since this is the last required confirmation, an additional 'Execution' should be emitted.
      const event3 = result.logs[1];
      expect(event3.event).to.eql('Execution');
      expect(event3.args.transactionId).to.be.bignumber.equal(0);
    });

    it('should emit events when revoking confirmation', async () => {
      await wallet.submitTransaction(receiver, transferredFunds, [], { from: owner1 });

      // transactionId should be zero on first transaction.
      await wallet.confirmTransaction(0, { from: owner2 });
      const result = await wallet.revokeConfirmation(0, { from: owner2 });

      expect(result.logs).to.have.length(1);

      const event = result.logs[0];
      expect(event.event).to.eql('Revocation');
      expect(event.args.sender).to.eql(owner2);
      expect(event.args.transactionId).to.be.bignumber.equal(0);
    });

    it('should emit events when replacing owner', async () => {
      const encoded = web3EthAbi.encodeFunctionCall(MULTISIGWALLET_ABI.replaceOwner, [owner1, notOwner]);
      await wallet.submitTransaction(wallet.address, 0, encoded, { from: owner1 });
      await wallet.confirmTransaction(0, { from: owner2 });
      const result = await wallet.confirmTransaction(0, { from: owner3 });

      expect(result.logs).to.have.length(4);

      const event = result.logs[0];
      expect(event.event).to.eql('Confirmation');
      expect(event.args.transactionId).to.be.bignumber.equal(0);

      const event2 = result.logs[1];
      expect(event2.event).to.eql('OwnerRemoval');
      expect(event2.args.owner).to.eql(owner1);

      const event3 = result.logs[2];
      expect(event3.event).to.eql('OwnerAddition');
      expect(event3.args.owner).to.eql(notOwner);

      const event4 = result.logs[3];
      expect(event4.event).to.eql('Execution');
      expect(event4.args.transactionId).to.be.bignumber.equal(0);
    });

    it('should emit events when changing requirements', async () => {
      const encoded = web3EthAbi.encodeFunctionCall(MULTISIGWALLET_ABI.changeRequirement, [2]);
      await wallet.submitTransaction(wallet.address, 0, encoded, { from: owner1 });
      await wallet.confirmTransaction(0, { from: owner2 });
      const result = await wallet.confirmTransaction(0, { from: owner3 });

      expect(result.logs).to.have.length(3);

      const event = result.logs[0];
      expect(event.event).to.eql('Confirmation');
      expect(event.args.transactionId).to.be.bignumber.equal(0);

      const event2 = result.logs[1];
      expect(event2.event).to.eql('RequirementChange');
      expect(event2.args.required).to.be.bignumber.equal(2);

      const event3 = result.logs[2];
      expect(event3.event).to.eql('Execution');
      expect(event3.args.transactionId).to.be.bignumber.equal(0);
    });

    it('should emit events when execution fails', async () => {
      const encoded = web3EthAbi.encodeFunctionCall(MULTISIGWALLET_ABI.replaceOwner, [notOwner, notOwner]);
      await wallet.submitTransaction(wallet.address, 0, encoded, { from: owner1 });
      await wallet.confirmTransaction(0, { from: owner2 });
      const result = await wallet.confirmTransaction(0, { from: owner3 });

      expect(result.logs).to.have.length(2);

      const event = result.logs[0];
      expect(event.event).to.eql('Confirmation');
      expect(event.args.transactionId).to.be.bignumber.equal(0);

      const event2 = result.logs[1];
      expect(event2.event).to.eql('ExecutionFailure');
      expect(event2.args.transactionId).to.be.bignumber.equal(0);
    });

    it('should emit correct transaction IDs when submitting multiple transactions', async () => {
      let result = await wallet.submitTransaction(receiver, transferredFunds, [], { from: owner1 });

      expect(result.logs).to.have.length(2);

      const event = result.logs[0];
      expect(event.event).to.eql('Submission');
      expect(event.args.transactionId).to.be.bignumber.equal(0);

      const event2 = result.logs[1];
      expect(event2.event).to.eql('Confirmation');
      expect(event2.args.transactionId).to.be.bignumber.equal(0);

      result = await wallet.submitTransaction(receiver, transferredFunds, [], { from: owner1 });

      expect(result.logs).to.have.length(2);

      const event3 = result.logs[0];
      expect(event3.event).to.eql('Submission');
      expect(event3.args.transactionId).to.be.bignumber.equal(1);

      const event4 = result.logs[1];
      expect(event4.event).to.eql('Confirmation');
      expect(event4.args.transactionId).to.be.bignumber.equal(1);

      result = await wallet.submitTransaction(receiver, transferredFunds, [], { from: owner1 });

      expect(result.logs).to.have.length(2);

      const event5 = result.logs[0];
      expect(event5.event).to.eql('Submission');
      expect(event5.args.transactionId).to.be.bignumber.equal(2);

      const event6 = result.logs[1];
      expect(event6.event).to.eql('Confirmation');
      expect(event6.args.transactionId).to.be.bignumber.equal(2);
    });
  });
});
