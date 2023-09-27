const truffleAssert = require("truffle-assertions");
const decodeError = require("../utils/decodeError");

const { increaseTimeTo } = require("../utils/increaseTime");

const SecurityTokenImmutable = artifacts.require("SecurityTokenImmutable");
const ProxySecurityToken = artifacts.require("ProxySecurityToken");
const Factory = artifacts.require("Factory");

const name = "name";
const code = "code";
const assetType = "asset type";
const amount = 10;
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
let rules = {
  pausable: false,
  rulesModifiable: true,
  voteToWithdraw: false,
  dayToWithdraw: 0,
  startFundraising: Math.floor(Date.now() / 1000),
  endFundraising: Math.floor(Date.now() / 1000) + 1000000000,
  maxSupply: 10000,
};

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

let date;
// let tokenOnchainID;

contract("SECURITY TOKEN", async accounts => {
  const walletDeployer = accounts[0];
  const walletFirstFounder = accounts[1];
  const walletNewOwner = accounts[2];
  const agent = accounts[8];

  it("SUCCESS : Should deploy smart contract security token", async () => {
    this.SecurityTokenImmutableContract = await SecurityTokenImmutable.new(
      name,
      code,
      rules,
    ); // we deploy contract

    this.ProxySecurityTokenContract = await ProxySecurityToken.new(
      this.SecurityTokenImmutableContract.address,
    ); // we deploy contract
  });

  describe("ERC-20 MODULE", async () => {
    // it("SUCCESS : Should get name of security token", async () => {
    //   const callName = await this.ProxySecurityTokenContract.name();
    //   assert.equal(callName, name);
    // });

    // it("SUCCESS : Should get code of security token", async () => {
    //   const callCode = await this.ProxySecurityTokenContract.code();
    //   assert.equal(callCode, code);
    // });

    // it("SUCCESS : Should get assetType of security token", async () => {
    //   const callAssetType = await this.ProxySecurityTokenContract.assetType();
    //   assert.equal(callAssetType, assetType);
    // });

    it("ERROR : Should not mint because security token immutable is not linked", async () => {
      await truffleAssert.reverts(
        this.ProxySecurityTokenContract.mint(walletFirstFounder, amount, {
          from: walletFirstFounder,
          value: amount,
        }),
      );
    });

    it("SUCCESS : Should setAddressProxy of SecurityTokenImmutableContract", async () => {
      await this.SecurityTokenImmutableContract.setAddressProxy(
        this.ProxySecurityTokenContract.address,
      );
    });

    it("SUCCESS : Should get totalSupply of security token", async () => {
      const callTotalSupply = await this.SecurityTokenImmutableContract.totalSupply();
      assert.equal(`${+callTotalSupply}`, 0);
    });

    it("SUCCESS : Should get balance from first founder before mint", async () => {
      const balanceBeforeMint = await this.SecurityTokenImmutableContract.balanceOf(
        walletFirstFounder,
      );
      assert.equal(`${+balanceBeforeMint}`, 0);
    });

    it("SUCCESS : Should get transfers from first founder before mint", async () => {
      const transfers = await this.SecurityTokenImmutableContract.transfers(0, 0);
      assert.equal(transfers.length, 0);
    });

    it("ERROR : Should not mint with not enough value eth", async () => {
      try {
        await this.ProxySecurityTokenContract.mint(walletDeployer, amount, {
          from: walletFirstFounder,
          value: 1,
        });
      } catch (error) {
        // const decodedError = await decodeError(error);
        // assert.equal(decodedError.errorFunction, "NotWriter(address)");
        // assert.equal(decodedError.decoded.sender, walletFirstFounder);
      }
    });

    it("SUCCESS : Should mint with deployer account", async () => {
      date = Math.floor(Date.now() / 10000);
      await this.ProxySecurityTokenContract.mint(walletFirstFounder, amount, {
        from: walletFirstFounder,
        value: amount,
      });
    });

    it("SUCCESS : Should get balance from first founder after mint", async () => {
      const balanceAfterMint = await this.SecurityTokenImmutableContract.balanceOf(
        walletFirstFounder,
      );
      assert.equal(`${+balanceAfterMint}`, amount);
    });

    it("SUCCESS : Should get transfers after mint of first founder", async () => {
      const transfers = await this.SecurityTokenImmutableContract.transfers(0, 0);
      assert.equal(transfers.length, 1);
      assert.equal(transfers[0].transferType, "mint");
      assert.equal(transfers[0].from, ADDRESS_ZERO);
      assert.equal(transfers[0].to, walletFirstFounder);
      assert.equal(transfers[0].amount, amount);
      // assert.equal(Math.floor(transfers[0].date / 10), date);
    });

    it("ERROR : Should not burn with first founder account more of balance", async () => {
      try {
        await this.ProxySecurityTokenContract.burn(walletFirstFounder, amount + 1, {
          from: walletFirstFounder,
        });
      } catch (error) {
        // const decodedError = await decodeError(error);
        // assert.equal(decodedError.errorFunction, "NotWriter(address)");
        // assert.equal(decodedError.decoded.sender, walletFirstFounder);
      }
    });

    it("SUCCESS : Should randomly mint and burn some token with two other account", async () => {
      for (let index = 3; index < 7; index++) {
        let random = randomIntFromInterval(1, 10);
        await this.ProxySecurityTokenContract.mint(accounts[index], amount * random, {
          from: accounts[index],
          value: amount * random,
        });

        await this.ProxySecurityTokenContract.burn(
          accounts[index],
          amount * random - randomIntFromInterval(1, 10),
          {
            from: accounts[index],
          },
        );
      }
    });

    it("SUCCESS : Should burn with deployer account", async () => {
      const totalSupply = await this.SecurityTokenImmutableContract.totalSupply();
      const tokenBalanceWalletBeforeBurn =
        await this.SecurityTokenImmutableContract.balanceOf(walletFirstFounder);
      const contractBalance = await web3.eth.getBalance(
        this.SecurityTokenImmutableContract.address,
      );
      const ethBalanceWalletBeforeBurn = await web3.eth.getBalance(walletFirstFounder);

      console.log("tokenBalanceWalletBeforeBurn", +tokenBalanceWalletBeforeBurn);
      console.log("ethBalanceWalletBeforeBurn", ethBalanceWalletBeforeBurn + "");
      console.log("totalSupply", +totalSupply);
      console.log("contractBalance", +contractBalance);
      console.log("amount", +amount);

      const currentValueOneToken = (+contractBalance * 100) / (+totalSupply * 100);

      console.log("current value", +currentValueOneToken);

      const refoundableOffChain = Math.floor(currentValueOneToken * amount);

      console.log("refoundableOffChain", +refoundableOffChain);

      const refoundableOnChain = await this.ProxySecurityTokenContract.refoundable(
        amount,
        {
          from: walletDeployer,
        },
      );

      assert.equal(+refoundableOnChain, +refoundableOffChain);

      console.log("refoundableOnChain", +refoundableOnChain);

      await this.ProxySecurityTokenContract.burn(walletFirstFounder, amount, {
        from: walletDeployer,
      });

      const tokenBalanceWalletAfterBurn =
        await this.SecurityTokenImmutableContract.balanceOf(walletFirstFounder);

      const ethBalanceWalletAfterBurn = await web3.eth.getBalance(walletFirstFounder);

      console.log("tokenBalanceWalletAfterBurn", +tokenBalanceWalletAfterBurn);
      console.log("ethBalanceWalletAfterBurn", ethBalanceWalletAfterBurn + "");

      assert.equal(
        +ethBalanceWalletAfterBurn - refoundableOnChain,
        +ethBalanceWalletBeforeBurn,
      );

      date = Math.floor(Date.now() / 10000);
    });

    it("SUCCESS : Should get transfers after burn of first founder", async () => {
      const transfers = await this.SecurityTokenImmutableContract.transfers(0, 0);
      assert.equal(transfers.length, 10);

      assert.equal(transfers[0].transferType, "mint");
      assert.equal(transfers[0].from, ADDRESS_ZERO);
      assert.equal(transfers[0].to, walletFirstFounder);
      assert.equal(transfers[0].amount, amount);

      assert.equal(transfers[9].transferType, "burn");
      assert.equal(transfers[9].from, walletFirstFounder);
      assert.equal(transfers[9].to, ADDRESS_ZERO);
      assert.equal(transfers[9].amount, amount);
      // assert.equal(Math.floor(transfers[1].date / 10), date);
    });

    it("SUCCESS : Should transfer owner ship", async () => {
      const ownerBeforeTransferOwnership = await this.ProxySecurityTokenContract.owner();
      assert.equal(ownerBeforeTransferOwnership, walletDeployer);

      await this.ProxySecurityTokenContract.transferOwnership(walletNewOwner);
      await this.SecurityTokenImmutableContract.transferOwnership(walletNewOwner);

      await this.SecurityTokenImmutableContract.increaseAllowance(
        walletNewOwner,
        "20000000000",
      );

      await this.SecurityTokenImmutableContract.increaseAllowance(
        walletDeployer,
        "20000000000",
      );

      const ownerAfterTransferOwnership = await this.ProxySecurityTokenContract.owner();
      assert.equal(ownerAfterTransferOwnership, walletNewOwner);
    });

    it("ERROR : Should not transfer with walletDeployer no balance", async () => {
      const canTransfer = await this.ProxySecurityTokenContract.canTransfer(
        walletNewOwner,
        walletNewOwner,
        walletFirstFounder,
        amount,
      );
      assert.equal(canTransfer, "0x52");
      await truffleAssert.reverts(
        this.ProxySecurityTokenContract.transfer(walletFirstFounder, amount, {
          from: walletNewOwner,
        }),
      );
    });

    it("SUCCESS : Should mint with new owner account to new owner", async () => {
      await this.ProxySecurityTokenContract.mint(walletNewOwner, amount, {
        from: walletNewOwner,
        value: amount,
      });
      const balance = await this.SecurityTokenImmutableContract.balanceOf(walletNewOwner);
      assert.equal(`${+balance}`, amount);
    });

    it("SUCCESS : Should transfer with walletDeployer", async () => {
      const canTransfer = await this.ProxySecurityTokenContract.canTransfer(
        walletNewOwner,
        walletNewOwner,
        walletDeployer,
        amount,
      );
      assert.equal(canTransfer, "0x51");

      await this.ProxySecurityTokenContract.transfer(walletDeployer, amount, {
        from: walletNewOwner,
      });
      const balance = await this.SecurityTokenImmutableContract.balanceOf(walletDeployer);
      assert.equal(`${+balance}`, amount);
    });

    it("SUCCESS : Should transfer with new owner account", async () => {
      const canTransfer = await this.ProxySecurityTokenContract.canTransfer(
        walletNewOwner,
        walletDeployer,
        walletFirstFounder,
        amount,
      );
      assert.equal(canTransfer, "0x51");

      await this.ProxySecurityTokenContract.transferFrom(
        walletDeployer,
        walletFirstFounder,
        amount,
        {
          from: walletNewOwner,
        },
      );
      const balance = await this.SecurityTokenImmutableContract.balanceOf(
        walletFirstFounder,
      );
      assert.equal(`${+balance}`, amount);
    });

    it("SUCCESS : Should get transfers after burn of first founder", async () => {
      const transfers = await this.SecurityTokenImmutableContract.transfers(0, 0, {
        from: walletNewOwner,
      });
      assert.equal(transfers.length, 13);

      assert.equal(transfers[0].transferType, "mint");
      assert.equal(transfers[0].from, ADDRESS_ZERO);
      assert.equal(transfers[0].to, walletFirstFounder);
      assert.equal(transfers[0].amount, amount);

      assert.equal(transfers[9].transferType, "burn");
      assert.equal(transfers[9].from, walletFirstFounder);
      assert.equal(transfers[9].to, ADDRESS_ZERO);
      assert.equal(transfers[9].amount, amount);

      assert.equal(transfers[10].transferType, "mint");
      assert.equal(transfers[10].from, ADDRESS_ZERO);
      assert.equal(transfers[10].to, walletNewOwner);
      assert.equal(transfers[10].amount, amount);

      assert.equal(transfers[11].transferType, "transfer");
      assert.equal(transfers[11].from, walletNewOwner);
      assert.equal(transfers[11].to, walletDeployer);
      assert.equal(transfers[11].amount, amount);

      assert.equal(transfers[12].transferType, "transfer");
      assert.equal(transfers[12].from, walletDeployer);
      assert.equal(transfers[12].to, walletFirstFounder);
      assert.equal(transfers[12].amount, amount);
    });
  });

  describe("BURN ALL", async () => {
    it("SUCCESS : Should burn with deployer account", async () => {
      const totalSupplyBeforeAllBurn =
        await this.SecurityTokenImmutableContract.totalSupply();
      const contractBalanceBeforeAllBurn = await web3.eth.getBalance(
        this.SecurityTokenImmutableContract.address,
      );
      console.log("totalSupplyBeforeAllBurn", +totalSupplyBeforeAllBurn);
      console.log("contractBalanceBeforeAllBurn", +contractBalanceBeforeAllBurn);
      for (let index = 0; index < accounts.length; index++) {
        const balance = await this.SecurityTokenImmutableContract.balanceOf(
          accounts[index],
        );
        if (+balance > 0)
          await this.ProxySecurityTokenContract.burn(accounts[index], +balance, {
            from: accounts[index],
          });
      }
      const totalSupplyAfterAllBurn =
        await this.SecurityTokenImmutableContract.totalSupply();
      const contractBalanceAfterAllBurn = await web3.eth.getBalance(
        this.SecurityTokenImmutableContract.address,
      );
      console.log("totalSupplyAfterAllBurn", +totalSupplyAfterAllBurn);
      console.log("contractBalanceAfterAllBurn", +contractBalanceAfterAllBurn);
    });
  });

  describe("WITHDRAW OWNER", async () => {
    it("ERROR : Should not withdraw because not enough eth", async () => {
      await truffleAssert.reverts(
        this.ProxySecurityTokenContract.withdraw(amount, walletNewOwner, {
          from: walletNewOwner,
        }),
      );
    });

    it("ERROR : Should not withdraw because not owner of contract", async () => {
      await truffleAssert.reverts(
        this.ProxySecurityTokenContract.withdraw(amount, walletDeployer, {
          from: walletDeployer,
        }),
      );
    });

    it(`SUCCESS : Should increase block timestamp to ${dayWaitedRandom} day`, async () => {
      const now = new Date();
      const someDaysLater = new Date();
      someDaysLater.setDate(now.getDate() + dayWaitedRandom);

      const blockTimeStampBeforeIncreaseTime =
        await this.ProxySecurityTokenContract._now();
      assert.equal(
        Math.floor(+blockTimeStampBeforeIncreaseTime / 100),
        Math.floor(+now / 100000),
      );

      await increaseTimeTo(Math.floor(+someDaysLater / 1000));

      const blockTimeStampAfterIncreaseTime =
        await this.ProxySecurityTokenContract._now();
      assert.equal(
        Math.floor(+blockTimeStampAfterIncreaseTime / 100),
        Math.floor(+someDaysLater / 100000),
      );
    });

    it("SUCCESS : Should randomly mint and burn some token with two other account", async () => {
      for (let index = 3; index < 7; index++) {
        let random = randomIntFromInterval(1, 10);
        await this.ProxySecurityTokenContract.mint(accounts[index], amount * random, {
          from: accounts[index],
          value: amount * random,
        });

        await this.ProxySecurityTokenContract.burn(
          accounts[index],
          amount * random - randomIntFromInterval(1, 10),
          {
            from: accounts[index],
          },
        );
      }
    });

    it("SUCCESS : Should withdraw because not owner of contract", async () => {
      const contractBalanceBeforeWithdraw = await web3.eth.getBalance(
        this.ProxySecurityTokenContract.address,
      );
      const walletFirstFounderBeforeWithdraw = await web3.eth.getBalance(
        walletFirstFounder,
      );
      await this.ProxySecurityTokenContract.withdraw(
        +contractBalanceBeforeWithdraw,
        walletFirstFounder,
        {
          from: walletNewOwner,
        },
      );

      const contractBalanceAfterWithdraw = await web3.eth.getBalance(
        this.ProxySecurityTokenContract.address,
      );
      const walletFirstFounderAfterWithdraw = await web3.eth.getBalance(
        walletFirstFounder,
      );

      assert.equal(
        +walletFirstFounderAfterWithdraw,
        +walletFirstFounderBeforeWithdraw + +contractBalanceBeforeWithdraw,
      );

      assert.equal(contractBalanceAfterWithdraw, 0);
    });

    it("SUCCESS : Should burn all remaining balances with deployer account", async () => {
      const totalSupplyBeforeAllBurn =
        await this.SecurityTokenImmutableContract.totalSupply();
      const contractBalanceBeforeAllBurn = await web3.eth.getBalance(
        this.ProxySecurityTokenContract.address,
      );
      console.log("totalSupplyBeforeAllBurn", +totalSupplyBeforeAllBurn);
      console.log("contractBalanceBeforeAllBurn", +contractBalanceBeforeAllBurn);
      for (let index = 0; index < accounts.length; index++) {
        const balance = await this.SecurityTokenImmutableContract.balanceOf(
          accounts[index],
        );
        if (+balance > 0)
          await this.ProxySecurityTokenContract.burn(accounts[index], +balance, {
            from: accounts[index],
          });
      }
      const totalSupplyAfterAllBurn =
        await this.SecurityTokenImmutableContract.totalSupply();
      const contractBalanceAfterAllBurn = await web3.eth.getBalance(
        this.ProxySecurityTokenContract.address,
      );
      console.log("totalSupplyAfterAllBurn", +totalSupplyAfterAllBurn);
      console.log("contractBalanceAfterAllBurn", +contractBalanceAfterAllBurn);
    });

    it("SUCCESS : Should randomly mint and burn some token with two other account, then withdraw only 50 % of balance contract", async () => {
      for (let index = 3; index < 7; index++) {
        let random = randomIntFromInterval(1, 10);
        await this.ProxySecurityTokenContract.mint(accounts[index], amount * random, {
          from: accounts[index],
          value: amount * random,
        });

        await this.ProxySecurityTokenContract.burn(
          accounts[index],
          amount * random - randomIntFromInterval(1, 10),
          {
            from: accounts[index],
          },
        );
      }

      const contractBalanceBeforeWithdraw = await web3.eth.getBalance(
        this.ProxySecurityTokenContract.address,
      );
      await this.ProxySecurityTokenContract.withdraw(
        Math.floor(+contractBalanceBeforeWithdraw / 2),
        walletFirstFounder,
        {
          from: walletNewOwner,
        },
      );
    });

    it("SUCCESS : Should burn all remaining balances with deployer account", async () => {
      const totalSupplyBeforeAllBurn =
        await this.SecurityTokenImmutableContract.totalSupply();
      const contractBalanceBeforeAllBurn = await web3.eth.getBalance(
        this.ProxySecurityTokenContract.address,
      );
      console.log("totalSupplyBeforeAllBurn", +totalSupplyBeforeAllBurn);
      console.log("contractBalanceBeforeAllBurn", +contractBalanceBeforeAllBurn);
      for (let index = 0; index < accounts.length; index++) {
        const balance = await this.SecurityTokenImmutableContract.balanceOf(
          accounts[index],
        );
        if (+balance > 0) {
          const refoundableOnChain = await this.ProxySecurityTokenContract.refoundable(
            balance,
            {
              from: walletDeployer,
            },
          );
          console.log("refoundable account [" + index + "]", +refoundableOnChain);
          console.log("balance account [" + index + "]", +balance);
          await this.ProxySecurityTokenContract.burn(accounts[index], +balance, {
            from: accounts[index],
          });
        }
      }
      const totalSupplyAfterAllBurn =
        await this.SecurityTokenImmutableContract.totalSupply();
      const contractBalanceAfterAllBurn = await web3.eth.getBalance(
        this.ProxySecurityTokenContract.address,
      );
      console.log("totalSupplyAfterAllBurn", +totalSupplyAfterAllBurn);
      console.log("contractBalanceAfterAllBurn", +contractBalanceAfterAllBurn);
    });
  });

  describe("FACTORY", async () => {
    it("SUCCESS : Deploy contract factory", async () => {
      this.FactoryContract = await Factory.new(); // we deploy contract
    });
    it("SUCCESS : Add security contract to factory", async () => {
      await this.FactoryContract.addSecurityToken(
        this.SecurityTokenImmutableContract.address,
      );
    });
    it("SUCCESS : list security tokens contract", async () => {
      const list = await this.FactoryContract.listSecurityTokens(0);
      assert.equal(list.length, 1);
      assert.equal(list[0], this.SecurityTokenImmutableContract.address);
    });
    it("SUCCESS : count security tokens contract", async () => {
      const count = await this.FactoryContract.getCountSecurityToken();
      assert.equal(count, 1);
    });
  });

  describe("RULES", async () => {
    it("SUCCESS : Get rules", async () => {
      rules = await this.SecurityTokenImmutableContract.getRules({
        from: walletNewOwner,
      });
      console.log(rules);
    });

    it("SUCCESS : Set rules, rule modifiable to false", async () => {
      rules = {
        ...rules,
        rulesModifiable: false,
      };
      await this.SecurityTokenImmutableContract.setRules(rules, {
        from: walletNewOwner,
      });
    });

    it("ERROR : Set rules, rule modifiable to true but rules is now not modifiable", async () => {
      rules = {
        ...rules,
        rulesModifiable: true,
      };
      await truffleAssert.reverts(
        this.SecurityTokenImmutableContract.setRules(rules, {
          from: walletNewOwner,
        }),
      );
    });
  });
  //TODO withdraw in period
  //TODO inject capital
  //TODO set fundraising
});
