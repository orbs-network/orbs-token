import chai from 'chai';
import dirtyChai from 'dirty-chai';
import BigNumber from 'bignumber.js';

import expectRevert from './helpers/expectRevert';

const { expect } = chai;
chai.use(dirtyChai);

const OrbsToken = artifacts.require('../contracts/OrbsToken.sol');

contract('OrbsToken', (accounts) => {
  let token;
  const distributor = accounts[0];

  const TOTAL_SUPPLY = new BigNumber(10 * (10 ** 9) * (10 ** 18)); // 10B

  describe('construction', async () => {
    context('invalid arguments', async () => {
      it('should not allow to initialize with a 0 distributor', async () => {
        await expectRevert(OrbsToken.new(0));
      });
    });

    context('success', async () => {
      beforeEach(async () => {
        token = await OrbsToken.new(distributor);
      });

      it('should return correct name after construction', async () => {
        expect(await token.name.call()).to.eql('Orbs');
      });

      it('should return correct symbol after construction', async () => {
        expect(await token.symbol.call()).to.eql('ORBS');
      });

      it('should return correct decimal points after construction', async () => {
        expect(await token.decimals.call()).to.be.bignumber.equal(18);
      });

      it('should return correct initial totalSupply after construction', async () => {
        expect(await token.totalSupply.call()).to.be.bignumber.equal(TOTAL_SUPPLY);
      });

      it('should transfer the total supply to the distributor', async () => {
        expect(await token.balanceOf.call(distributor)).to.be.bignumber.equal(TOTAL_SUPPLY);
      });
    });
  });
});
