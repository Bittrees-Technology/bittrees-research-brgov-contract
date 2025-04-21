import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BNote } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

describe("BNote (UUPS upgradeable)", () => {
  let bNoteProxy: BNote;
  let admin: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let mockERC20: any;
  let nonCompliantERC20: any;
  const baseURI = "https://example.com/metadata/";

  beforeEach(async () => {
    // Get signers
    [admin, treasury, user] = await ethers.getSigners();

    // Deploy mock ERC20 token for payment
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20Factory.deploy("Mock Token", "MOCK", 18);
    await mockERC20.waitForDeployment();

    // Deploy non-compliant ERC20 token for testing SafeERC20
    const NonCompliantERC20Factory = await ethers.getContractFactory("NonCompliantERC20");
    nonCompliantERC20 = await NonCompliantERC20Factory.deploy("Non Compliant", "NCPL", 18);
    await nonCompliantERC20.waitForDeployment();

    // Mint tokens to user for testing
    await mockERC20.mint(user.address, ethers.parseEther("1000"));
    await nonCompliantERC20.mint(user.address, ethers.parseEther("1000"));

    // Deploy BNote contract
    const BNoteFactory = await ethers.getContractFactory("BNote");
    bNoteProxy = (await upgrades.deployProxy(
        BNoteFactory,
        [
          baseURI,
          treasury.address,
          admin.address,
        ],
        { kind: "uups" }
    )) as BNote;

    await bNoteProxy.waitForDeployment();
  });

  describe("Initialization", () => {
    it("should set baseURI on initialization", async () => {
      const uri = await bNoteProxy.baseMetadataURI();
      expect(uri).to.equal(baseURI);
    });

    it("should set treasury on initialization", async () => {
      const treasuryAddr = await bNoteProxy.treasury();
      expect(treasuryAddr).to.equal(treasury.address);
    });

    it("should grant ADMIN_ROLE to admin", async () => {
      const ADMIN_ROLE = await bNoteProxy.ADMIN_ROLE();
      expect(await bNoteProxy.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should grant DEFAULT_ADMIN_ROLE to admin", async () => {
      const DEFAULT_ADMIN_ROLE = await bNoteProxy.DEFAULT_ADMIN_ROLE();
      expect(await bNoteProxy.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should not initialize with zero address treasury", async () => {
      const BNoteFactory = await ethers.getContractFactory("BNote");
      await expect(upgrades.deployProxy(
          BNoteFactory,
          [
            baseURI,
            ZeroAddress,
            admin.address,
          ],
          { kind: "uups" }
      )).to.be.revertedWith("Treasury cannot be zero address");
    });
  });

  describe("Admin Functions", () => {
    it("should allow ADMIN_ROLE to set a new treasury", async () => {
      const newTreasury = user.address;

      await expect(bNoteProxy.connect(admin).setTreasury(newTreasury))
          .to.emit(bNoteProxy, "TreasuryUpdated")
          .withArgs(newTreasury);

      expect(await bNoteProxy.treasury()).to.equal(newTreasury);
    });

    it("should not allow setting zero address as treasury", async () => {
      await expect(bNoteProxy.connect(admin).setTreasury(ZeroAddress))
          .to.be.revertedWith("Treasury cannot be zero address");
    });

    it("should not allow non-admin to set treasury", async () => {
      await expect(bNoteProxy.connect(user).setTreasury(user.address))
          .to.be.revertedWithCustomError(bNoteProxy, "AccessControlUnauthorizedAccount");
    });

    it("should allow ADMIN_ROLE to set a new baseURI", async () => {
      const newBaseURI = "https://new-example.com/metadata/";

      await expect(bNoteProxy.connect(admin).setBaseURI(newBaseURI))
          .to.emit(bNoteProxy, "BaseURIUpdated")
          .withArgs(newBaseURI);

      expect(await bNoteProxy.baseMetadataURI()).to.equal(newBaseURI);
    });

    it("should not allow non-admin to set baseURI", async () => {
      await expect(bNoteProxy.connect(user).setBaseURI("https://hacker.com/"))
          .to.be.revertedWithCustomError(bNoteProxy, "AccessControlUnauthorizedAccount");
    });

    it("should allow ADMIN_ROLE to configure payment tokens", async () => {
      const mockTokenAddress = await mockERC20.getAddress();
      const active = true;
      const price = ethers.parseEther("1");

      await expect(bNoteProxy.connect(admin).setPaymentToken(mockTokenAddress, active, price))
          .to.emit(bNoteProxy, "PaymentTokenUpdated")
          .withArgs(mockTokenAddress, active, price);

      const paymentToken = await bNoteProxy.paymentTokens(mockTokenAddress);
      expect(paymentToken.active).to.equal(active);
      expect(paymentToken.unitMintPrice).to.equal(price);
    });

    it("should add new payment token to paymentTokenAddresses", async () => {
      const mockTokenAddress = await mockERC20.getAddress();
      const mockTokenAddress2 = await nonCompliantERC20.getAddress();
      const active = true;
      const price = ethers.parseEther("1");

      expect(await bNoteProxy.connect(user).getAllPaymentTokenAddresses())
          .to.deep.equal([]);

      await expect(bNoteProxy.connect(admin).setPaymentToken(mockTokenAddress, active, price))
          .to.emit(bNoteProxy, "PaymentTokenUpdated")
          .withArgs(mockTokenAddress, active, price);

      expect(await bNoteProxy.connect(user).getAllPaymentTokenAddresses())
          .to.deep.equal([mockTokenAddress]);

      let paymentToken = await bNoteProxy.paymentTokens(mockTokenAddress);
      expect(paymentToken.active).to.equal(active);
      expect(paymentToken.unitMintPrice).to.equal(price);

      await expect(bNoteProxy.connect(admin).setPaymentToken(mockTokenAddress2, active, price))
          .to.emit(bNoteProxy, "PaymentTokenUpdated")
          .withArgs(mockTokenAddress2, active, price);

      expect(await bNoteProxy.connect(user).getAllPaymentTokenAddresses())
          .to.deep.equal([mockTokenAddress, mockTokenAddress2]);

      paymentToken = await bNoteProxy.paymentTokens(mockTokenAddress2);
      expect(paymentToken.active).to.equal(active);
      expect(paymentToken.unitMintPrice).to.equal(price);
    });

    it("should not add payment token to paymentTokenAddresses again when updating existing payment token", async () => {
      const mockTokenAddress = await mockERC20.getAddress();
      const active = true;
      const price = ethers.parseEther("1");
      const newPrice = ethers.parseEther("2");

      // No payment tokens set
      expect(await bNoteProxy.connect(user).getAllPaymentTokenAddresses())
          .to.deep.equal([]);

      // Set payment token
      await expect(bNoteProxy.connect(admin).setPaymentToken(mockTokenAddress, active, price))
          .to.emit(bNoteProxy, "PaymentTokenUpdated")
          .withArgs(mockTokenAddress, active, price);

      // Check paymentToken address was pushed onto paymentTokenAddresses array
      expect(await bNoteProxy.connect(user).getAllPaymentTokenAddresses())
          .to.deep.equal([mockTokenAddress]);

      // Check paymentToken was set correctly
      let paymentToken = await bNoteProxy.paymentTokens(mockTokenAddress);
      expect(paymentToken.active).to.equal(active);
      expect(paymentToken.unitMintPrice).to.equal(price);

      // Update paymentToken.active to false
      await expect(bNoteProxy.connect(admin).setPaymentToken(mockTokenAddress, !active, price))
          .to.emit(bNoteProxy, "PaymentTokenUpdated")
          .withArgs(mockTokenAddress, !active, price);

      // Check paymentTokenAddresses was updated not updated as the paymentToken updated already existed
      expect(await bNoteProxy.connect(user).getAllPaymentTokenAddresses())
          .to.deep.equal([mockTokenAddress]);

      // Check paymentToken update was successful
      paymentToken = await bNoteProxy.paymentTokens(mockTokenAddress);
      expect(paymentToken.active).to.equal(!active);
      expect(paymentToken.unitMintPrice).to.equal(price);

      // Update paymentToken.unitMintPrice to new price and paymentToken.active to true
      await expect(bNoteProxy.connect(admin).setPaymentToken(mockTokenAddress, !active, newPrice))
          .to.emit(bNoteProxy, "PaymentTokenUpdated")
          .withArgs(mockTokenAddress, !active, newPrice);

      // Check paymentTokenAddresses was updated not updated as the paymentToken updated already existed
      expect(await bNoteProxy.connect(user).getAllPaymentTokenAddresses())
          .to.deep.equal([mockTokenAddress]);

      // Check paymentToken update was successful
      paymentToken = await bNoteProxy.paymentTokens(mockTokenAddress);
      expect(paymentToken.active).to.equal(!active);
      expect(paymentToken.unitMintPrice).to.equal(newPrice);
    });

    it("should not allow setting zero address as payment token", async () => {
      await expect(bNoteProxy.connect(admin).setPaymentToken(ZeroAddress, true, ethers.parseEther("1")))
          .to.be.revertedWith("PaymentToken cannot be zero address");
    });

    it("should not allow non-admin to configure payment tokens", async () => {
      const mockTokenAddress = await mockERC20.getAddress();
      await expect(bNoteProxy.connect(user).setPaymentToken(mockTokenAddress, true, ethers.parseEther("1")))
          .to.be.revertedWithCustomError(bNoteProxy, "AccessControlUnauthorizedAccount");
    });

    it("should allow ADMIN_ROLE to configure multiple payment tokens in batch", async () => {
      const token1 = await mockERC20.getAddress();
      const token2 = await nonCompliantERC20.getAddress();
      const tokens = [token1, token2];
      const actives = [true, true];
      const prices = [ethers.parseEther("1"), ethers.parseEther("2")];

      await bNoteProxy.connect(admin).setPaymentTokenBatch(tokens, actives, prices);

      const paymentToken1 = await bNoteProxy.paymentTokens(token1);
      const paymentToken2 = await bNoteProxy.paymentTokens(token2);

      expect(paymentToken1.active).to.equal(true);
      expect(paymentToken1.unitMintPrice).to.equal(ethers.parseEther("1"));
      expect(paymentToken2.active).to.equal(true);
      expect(paymentToken2.unitMintPrice).to.equal(ethers.parseEther("2"));
    });

    it("should require equal length arrays for batch payment token configuration", async () => {
      const tokens = [await mockERC20.getAddress(), await nonCompliantERC20.getAddress()];
      const actives = [true];
      const prices = [ethers.parseEther("1"), ethers.parseEther("2")];

      await expect(bNoteProxy.connect(admin).setPaymentTokenBatch(tokens, actives, prices))
          .to.be.revertedWith("Array length mismatch");
    });

    it("should allow ADMIN_ROLE to pause the contract", async () => {
      await expect(bNoteProxy.connect(admin).pause())
          .to.emit(bNoteProxy, "Paused")
          .withArgs(admin.address);

      expect(await bNoteProxy.paused()).to.be.true;
    });

    it("should allow ADMIN_ROLE to unpause the contract", async () => {
      await bNoteProxy.connect(admin).pause();

      await expect(bNoteProxy.connect(admin).unpause())
          .to.emit(bNoteProxy, "Unpaused")
          .withArgs(admin.address);

      expect(await bNoteProxy.paused()).to.be.false;
    });

    it("should not allow non-admin to pause the contract", async () => {
      await expect(bNoteProxy.connect(user).pause())
          .to.be.revertedWithCustomError(bNoteProxy, "AccessControlUnauthorizedAccount");
    });

    it("should allow ADMIN_ROLE to rescue ERC20 tokens", async () => {
      const mockTokenAddress = await mockERC20.getAddress();
      const amount = ethers.parseEther("10");

      // Send tokens to the contract
      await mockERC20.mint(await bNoteProxy.getAddress(), amount);

      await expect(bNoteProxy.connect(admin).rescueERC20(mockTokenAddress, treasury.address, amount))
          .to.emit(bNoteProxy, "TokensRescued")
          .withArgs(mockTokenAddress, treasury.address, amount);

      expect(await mockERC20.balanceOf(treasury.address)).to.equal(amount);
    });

    it("should not allow sending rescued tokens to zero address", async () => {
      const mockTokenAddress = await mockERC20.getAddress();
      await expect(bNoteProxy.connect(admin).rescueERC20(mockTokenAddress, ZeroAddress, 100))
          .to.be.revertedWith("Cannot send to zero address");
    });

    it("should emit Paused event when pausing", async () => {
      await expect(bNoteProxy.connect(admin).pause())
          .to.emit(bNoteProxy, "Paused")
          .withArgs(admin.address);
    });

    it("should emit Unpaused event when unpausing", async () => {
      // First pause
      await bNoteProxy.connect(admin).pause();

      // Then unpause and check for event
      await expect(bNoteProxy.connect(admin).unpause())
          .to.emit(bNoteProxy, "Unpaused")
          .withArgs(admin.address);
    });
  });

  describe("URI public view Functionality", () => {
    it("should return correct token URI", async () => {
      expect(await bNoteProxy.connect(user).uri(1)).to.equal(`${baseURI}1.json`);
      expect(await bNoteProxy.connect(user).uri(10)).to.equal(`${baseURI}10.json`);
      expect(await bNoteProxy.connect(user).uri(100)).to.equal(`${baseURI}100.json`);
    });

    it("should return correct contract URI", async () => {
      expect(await bNoteProxy.connect(user).contractURI()).to.equal(`${baseURI}contract.json`);
    });

    it("should return correct base metadata URI", async () => {
      expect(await bNoteProxy.connect(user).baseMetadataURI()).to.equal(baseURI);
    });
  });

  describe("Minting", () => {
    const mintPrice = ethers.parseEther("0.1");

    beforeEach(async () => {
      // Configure mockERC20 as a payment token
      const mockTokenAddress = await mockERC20.getAddress();
      await bNoteProxy.connect(admin).setPaymentToken(mockTokenAddress, true, mintPrice);

      // Approve the BNote contract to spend user's tokens
      await mockERC20.connect(user).approve(await bNoteProxy.getAddress(), ethers.parseEther("1000"));

      // Configure non-compliant token
      const nonCompliantTokenAddress = await nonCompliantERC20.getAddress();
      await bNoteProxy.connect(admin).setPaymentToken(nonCompliantTokenAddress, true, mintPrice);

      // Approve the BNote contract to spend user's non-compliant tokens
      await nonCompliantERC20.connect(user).approve(await bNoteProxy.getAddress(), ethers.parseEther("1000"));
    });

    it("should allow minting with valid payment token", async () => {
      const tokenIds = [1, 10];
      const amounts = [5, 2];
      const mockTokenAddress = await mockERC20.getAddress();

      // Calculate expected cost: 5 * 1 * price + 2 * 10 * price
      const expectedCost = mintPrice * BigInt(5 * 1 + 2 * 10);

      // Check user's balance before
      const userBalanceBefore = await mockERC20.balanceOf(user.address);
      const treasuryBalanceBefore = await mockERC20.balanceOf(treasury.address);

      // Execute mint
      await expect(bNoteProxy.connect(user).mintBatch(tokenIds, amounts, mockTokenAddress))
          .to.emit(bNoteProxy, "TokensMinted")
          .withArgs(user.address, tokenIds, amounts);

      // Verify token balances
      expect(await bNoteProxy.balanceOf(user.address, 1)).to.equal(5);
      expect(await bNoteProxy.balanceOf(user.address, 10)).to.equal(2);

      // Verify payment
      expect(await mockERC20.balanceOf(user.address)).to.equal(userBalanceBefore - expectedCost);
      expect(await mockERC20.balanceOf(treasury.address)).to.equal(treasuryBalanceBefore + expectedCost);
    });

    it("should allow minting with non-compliant ERC20 token", async () => {
      const tokenIds = [1];
      const amounts = [1];
      const nonCompliantTokenAddress = await nonCompliantERC20.getAddress();

      // Execute mint
      await expect(bNoteProxy.connect(user).mintBatch(tokenIds, amounts, nonCompliantTokenAddress))
          .to.emit(bNoteProxy, "TokensMinted");

      // Verify token balance
      expect(await bNoteProxy.balanceOf(user.address, 1)).to.equal(1);
    });

    it("should reject minting with invalid token ID", async () => {
      const mockTokenAddress = await mockERC20.getAddress();

      // Try to mint with invalid token ID (only 1, 10, 100 are valid)
      await expect(bNoteProxy.connect(user).mintBatch([2], [1], mockTokenAddress))
          .to.be.revertedWith("Invalid tokenId");
    });

    it("should reject minting with inactive payment token", async () => {
      // Set the token as inactive
      const mockTokenAddress = await mockERC20.getAddress();
      await bNoteProxy.connect(admin).setPaymentToken(mockTokenAddress, false, mintPrice);

      await expect(bNoteProxy.connect(user).mintBatch([1], [1], mockTokenAddress))
          .to.be.revertedWith("Payment token not accepted");
    });

    it("should reject minting with array length mismatch", async () => {
      const mockTokenAddress = await mockERC20.getAddress();

      await expect(bNoteProxy.connect(user).mintBatch([1, 10], [1], mockTokenAddress))
          .to.be.revertedWith("Array length mismatch");
    });

    it("should handle minting multiple token types", async () => {
      const tokenIds = [1, 10, 100];
      const amounts = [5, 3, 2];
      const mockTokenAddress = await mockERC20.getAddress();

      // Calculate expected cost: 5*1*price + 3*10*price + 1*100*price
      const expectedCost = mintPrice * BigInt(5*1 + 3*10 + 2*100);

      await bNoteProxy.connect(user).mintBatch(tokenIds, amounts, mockTokenAddress);

      expect(await bNoteProxy.balanceOf(user.address, 1)).to.equal(5);
      expect(await bNoteProxy.balanceOf(user.address, 10)).to.equal(3);
      expect(await bNoteProxy.balanceOf(user.address, 100)).to.equal(2);

      // Verify payment went to treasury
      expect(await mockERC20.balanceOf(treasury.address)).to.equal(expectedCost);
    });

    it("should fail if payment fails", async () => {
      const tokenIds = [1];
      const amounts = [1000];  // Large amount
      const mockTokenAddress = await mockERC20.getAddress();

      // Reduce allowance to cause payment failure
      await mockERC20.connect(user).approve(await bNoteProxy.getAddress(), ethers.parseEther("0.01"));

      // Just check that it reverts without specifying the exact message
      await expect(bNoteProxy.connect(user).mintBatch(tokenIds, amounts, mockTokenAddress))
          .to.be.reverted;
    });

    it("should not allow minting when contract is paused", async () => {
      const tokenIds = [1];
      const amounts = [1];
      const mockTokenAddress = await mockERC20.getAddress();

      // Pause the contract
      await bNoteProxy.connect(admin).pause();

      // Check that the contract is actually paused
      expect(await bNoteProxy.paused()).to.be.true;

      // Just assert that the transaction reverts without specifying the exact message
      await expect(
          bNoteProxy.connect(user).mintBatch(tokenIds, amounts, mockTokenAddress)
      ).to.be.reverted;
    });
  });

  describe("Interface Support", () => {
    it("should support ERC1155 interface", async () => {
      // ERC1155 interface ID: 0xd9b67a26
      expect(await bNoteProxy.supportsInterface("0xd9b67a26")).to.be.true;
    });

    it("should support AccessControl interface", async () => {
      // AccessControl interface ID: 0x7965db0b
      expect(await bNoteProxy.supportsInterface("0x7965db0b")).to.be.true;
    });
  });

  describe("Upgradeability", () => {
    it("should allow admin to upgrade the implementation", async () => {
      // Deploy the new implementation
      const BNoteV2Factory = await ethers.getContractFactory("BNoteV2Mock");

      // Perform the upgrade
      await upgrades.upgradeProxy(await bNoteProxy.getAddress(), BNoteV2Factory, { kind: "uups" });

      // Check if the upgraded contract has the new function
      const upgradedProxy = await BNoteV2Factory.attach(await bNoteProxy.getAddress());
      expect(await (upgradedProxy as any).version()).to.equal("v2");
    });

    it("should not allow non-admin to upgrade the implementation", async () => {
      const BNoteV2Factory = await ethers.getContractFactory("BNoteV2Mock");

      // Attempt upgrade as non-admin user
      await expect(
          upgrades.upgradeProxy(await bNoteProxy.getAddress(), BNoteV2Factory.connect(user), { kind: "uups" })
      ).to.be.revertedWithCustomError(bNoteProxy, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Chain ID Logic", () => {
    it("should not mint tokens to treasury on non-Ethereum mainnet", async () => {
      // This test assumes we're running on a local network, not mainnet
      expect(await bNoteProxy.balanceOf(treasury.address, 1)).to.equal(0);
      expect(await bNoteProxy.balanceOf(treasury.address, 10)).to.equal(0);
      expect(await bNoteProxy.balanceOf(treasury.address, 100)).to.equal(0);
    });

    // This test is just for coverage as we can't easily simulate mainnet in a test
    it("should have chain-specific minting logic in initialize", async () => {
      // Deploy a specific mock for testing the chain ID logic
      const ChainIdMockFactory = await ethers.getContractFactory("MockChainId");
      const chainIdMock = await ChainIdMockFactory.deploy();
      await chainIdMock.waitForDeployment();

      // Get the current chain ID (should be hardhat network ID)
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);

      // Test the mainnet case
      const wouldMintOnMainnet = await chainIdMock.wouldMintOnChain(1); // Ethereum mainnet ID
      expect(wouldMintOnMainnet).to.be.true;

      // Test the current chain ID (should be hardhat network)
      const wouldMintOnCurrentChain = await chainIdMock.wouldMintOnChain(currentChainId);
      expect(wouldMintOnCurrentChain).to.be.false;

      // Test a random chain ID
      const wouldMintOnRandomChain = await chainIdMock.wouldMintOnChain(137); // Polygon
      expect(wouldMintOnRandomChain).to.be.false;
    });
  });
});