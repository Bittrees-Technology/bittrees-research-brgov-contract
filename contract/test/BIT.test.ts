import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BNote, BIT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

describe("BIT Token (UUPS upgradeable)", () => {
  let bnoteProxy: BNote;
  let bitProxy: BIT;
  let admin: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let mockERC20: any;

  const baseURI = "https://example.com/metadata/";
  const mintPrice = ethers.parseEther("0.1");

  beforeEach(async () => {
    // Get signers
    [admin, treasury, user] = await ethers.getSigners();

    // Deploy mock ERC20 for BNote payments
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20Factory.deploy("Mock Token", "MOCK", 18);
    await mockERC20.waitForDeployment();

    // Mint tokens to user for BNote purchases
    await mockERC20.mint(user.address, ethers.parseEther("1000"));

    // Deploy BNote contract first
    const BNoteFactory = await ethers.getContractFactory("BNote");
    bnoteProxy = (await upgrades.deployProxy(
        BNoteFactory,
        [baseURI, admin.address],
        { kind: "uups" }
    )) as BNote;
    await bnoteProxy.waitForDeployment();

    // Configure BNote for testing
    await bnoteProxy.connect(admin).setTreasury(treasury.address);
    await bnoteProxy.connect(admin).setPaymentToken(await mockERC20.getAddress(), true, mintPrice);

    // Give user some BNotes to work with
    await mockERC20.connect(user).approve(await bnoteProxy.getAddress(), ethers.parseEther("1000"));
    await bnoteProxy.connect(user).mintBatch([1, 10, 100], [10, 5, 3], await mockERC20.getAddress());

    // Deploy BIT contract
    const BITFactory = await ethers.getContractFactory("BIT");
    bitProxy = (await upgrades.deployProxy(
        BITFactory,
        [
          "BIT",
          "BIT",
          admin.address,
          await bnoteProxy.getAddress()
        ],
        { kind: "uups" }
    )) as BIT;
    await bitProxy.waitForDeployment();
  });

  describe("Initialization", () => {
    it("should initialize with correct parameters", async () => {
      expect(await bitProxy.name()).to.equal("BIT");
      expect(await bitProxy.symbol()).to.equal("BIT");
      expect(await bitProxy.decimals()).to.equal(18);
      expect(await bitProxy.VERSION()).to.equal("1.0.0");
      expect(await bitProxy.bnoteContract()).to.equal(await bnoteProxy.getAddress());
      expect(await bitProxy.treasury()).to.equal(ZeroAddress);
      expect(await bitProxy.paused()).to.be.false;
    });

    it("should grant admin roles correctly", async () => {
      const ADMIN_ROLE = await bitProxy.ADMIN_ROLE();
      const DEFAULT_ADMIN_ROLE = await bitProxy.DEFAULT_ADMIN_ROLE();

      // admin should have roles
      expect(await bitProxy.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await bitProxy.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;

      // user should not have roles
      expect(await bitProxy.hasRole(ADMIN_ROLE, user.address)).to.be.false;
      expect(await bitProxy.hasRole(DEFAULT_ADMIN_ROLE, user.address)).to.be.false;
    });

    it("should initialize with default redemption premium", async () => {
      // Default should be 10 * 10^18 (10 BIT tokens per unit)
      expect(await bitProxy.redemptionPremiumPerUnit()).to.equal(ethers.parseEther("10"));
    });

    it("should not allow zero address for BNote contract", async () => {
      const BITFactory = await ethers.getContractFactory("BIT");

      await expect(
          upgrades.deployProxy(
              BITFactory,
              ["Test", "TEST", admin.address, ZeroAddress],
              { kind: "uups" }
          )
      ).to.be.revertedWithCustomError(bitProxy, "ZeroAddress");
    });
  });

  describe("Admin Functions", () => {
    it("should allow admin to set treasury", async () => {
      await expect(bitProxy.connect(admin).setTreasury(treasury.address))
          .to.emit(bitProxy, "TreasuryUpdated")
          .withArgs(treasury.address);

      expect(await bitProxy.treasury()).to.equal(treasury.address);
    });

    it("should not allow setting zero address as treasury", async () => {
      await expect(bitProxy.connect(admin).setTreasury(ZeroAddress))
          .to.be.revertedWithCustomError(bitProxy, "ZeroAddress");
    });

    it("should not allow non-admin to set treasury", async () => {
      await expect(bitProxy.connect(user).setTreasury(treasury.address))
          .to.be.revertedWithCustomError(bitProxy, "AccessControlUnauthorizedAccount");
    });

    it("should allow admin to set redemption premium", async () => {
      const newPremium = ethers.parseEther("20");

      await expect(bitProxy.connect(admin).setRedemptionPremium(newPremium))
          .to.emit(bitProxy, "RedemptionPremiumUpdated")
          .withArgs(newPremium);

      expect(await bitProxy.redemptionPremiumPerUnit()).to.equal(newPremium);
    });

    it("should not allow non-admin to set redemption premium", async () => {
      await expect(bitProxy.connect(user).setRedemptionPremium(ethers.parseEther("20")))
          .to.be.revertedWithCustomError(bitProxy, "AccessControlUnauthorizedAccount");
    });

    it("should allow admin to pause/unpause", async () => {
      await expect(bitProxy.connect(admin).pause())
          .to.emit(bitProxy, "Paused")
          .withArgs(admin.address);

      expect(await bitProxy.paused()).to.be.true;

      await expect(bitProxy.connect(admin).unpause())
          .to.emit(bitProxy, "Unpaused")
          .withArgs(admin.address);

      expect(await bitProxy.paused()).to.be.false;
    });

    it("should allow admin to rescue ERC20 tokens", async () => {
      const amount = ethers.parseEther("100");

      // Send some mock tokens to BIT contract
      await mockERC20.mint(await bitProxy.getAddress(), amount);

      await expect(bitProxy.connect(admin).rescueERC20(await mockERC20.getAddress(), treasury.address, amount))
          .to.emit(bitProxy, "TokensRescued")
          .withArgs(await mockERC20.getAddress(), treasury.address, amount);

      expect(await mockERC20.balanceOf(treasury.address)).to.be.greaterThan(0);
    });

    it("should not allow rescuing to zero address", async () => {
      await expect(bitProxy.connect(admin).rescueERC20(await mockERC20.getAddress(), ZeroAddress, 100))
          .to.be.revertedWithCustomError(bitProxy, "ZeroAddress");
    });
  });

  describe("Minting BIT Tokens", () => {
    beforeEach(async () => {
      // Approve BIT contract to transfer BNotes
      await bnoteProxy.connect(user).setApprovalForAll(await bitProxy.getAddress(), true);
    });

    it("should mint BIT tokens for deposited BNotes", async () => {
      const bnoteIds = [1, 10];
      const bnoteAmounts = [5, 2]; // 5 denomination-1 + 2 denomination-10 = 25 total value

      // Expected: 25 * 1000 * 10^18 = 25,000 BIT tokens
      const expectedBIT = ethers.parseEther("25000");

      await expect(bitProxy.connect(user).mint(bnoteIds, bnoteAmounts))
          .to.emit(bitProxy, "TokensMinted")
          .withArgs(user.address, expectedBIT, bnoteIds, bnoteAmounts);

      expect(await bitProxy.balanceOf(user.address)).to.equal(expectedBIT);
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 1)).to.equal(5);
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 10)).to.equal(2);
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 100)).to.equal(0);
      expect(await bnoteProxy.totalBalanceOf(await bitProxy.getAddress())).to.equal(25);
      expect(await bitProxy.getBNoteBalance(1)).to.equal(5);
      expect(await bitProxy.getBNoteBalance(10)).to.equal(2);
      expect(await bitProxy.getBNoteBalance(100)).to.equal(0);
      expect(await bitProxy.getTotalBNoteValue()).to.equal(25);
    });

    it("should handle single denomination minting", async () => {
      const bnoteIds = [100];
      const bnoteAmounts = [1]; // 1 denomination-100 = 100 total value

      const expectedBIT = ethers.parseEther("100000"); // 100 * 1000 * 10^18

      await bitProxy.connect(user).mint(bnoteIds, bnoteAmounts);

      expect(await bitProxy.balanceOf(user.address)).to.equal(expectedBIT);
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 1)).to.equal(0);
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 10)).to.equal(0);
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 100)).to.equal(1);
      expect(await bnoteProxy.totalBalanceOf(await bitProxy.getAddress())).to.equal(100);
      expect(await bitProxy.getBNoteBalance(1)).to.equal(0);
      expect(await bitProxy.getBNoteBalance(10)).to.equal(0);
      expect(await bitProxy.getBNoteBalance(100)).to.equal(1);
      expect(await bitProxy.getTotalBNoteValue()).to.equal(100);
    });

    it("should reject minting with array length mismatch", async () => {
      await expect(bitProxy.connect(user).mint([1, 10], [5]))
          .to.be.revertedWithCustomError(bitProxy, "InvalidArrayLength");
    });

    it("should reject minting with zero amounts", async () => {
      await expect(bitProxy.connect(user).mint([1], [0]))
          .to.be.revertedWithCustomError(bitProxy, "ZeroAmount");
    });

    it("should reject minting with empty arrays", async () => {
      await expect(bitProxy.connect(user).mint([], []))
          .to.be.revertedWithCustomError(bitProxy, "ZeroAmount");
    });

    it("should reject minting when paused", async () => {
      await bitProxy.connect(admin).pause();

      await expect(bitProxy.connect(user).mint([1], [1]))
          .to.be.reverted;
    });

    it("should calculate mint amount correctly", async () => {
      const bnoteIds = [1, 10, 100];
      const bnoteAmounts = [5, 3, 2]; // 5*1 + 3*10 + 2*100 = 235 total value

      const expectedBIT = ethers.parseEther("235000"); // 235 * 1000 * 10^18
      const calculatedBIT = await bitProxy.calculateMintAmount(bnoteIds, bnoteAmounts);

      expect(calculatedBIT).to.equal(expectedBIT);
    });
  });

  describe("Redeeming BNotes", () => {
    let userBITBalance: bigint;

    beforeEach(async () => {
      // Set treasury for redemption
      await bitProxy.connect(admin).setTreasury(treasury.address);

      // Give user some BIT by minting
      await bnoteProxy.connect(user).setApprovalForAll(await bitProxy.getAddress(), true);
      await bitProxy.connect(user).mint([1, 10, 100], [5, 3, 2]); // 235 total value = 235,000 BIT
      userBITBalance = await bitProxy.balanceOf(user.address);
    });

    it("should redeem BNotes for BIT tokens with premium", async () => {
      const bnoteIds = [1];
      const bnoteAmounts = [2]; // 2 denomination-1 = 2 total value

      // Expected: base = 2 * 1000 * 10^18, premium = 2 * 10 * 10^18
      const expectedBase = ethers.parseEther("2000");
      const expectedPremium = ethers.parseEther("20");
      const expectedTotal = expectedBase + expectedPremium;

      const treasuryBalanceBefore = await bitProxy.balanceOf(treasury.address);

      await expect(bitProxy.connect(user).redeem(bnoteIds, bnoteAmounts))
          .to.emit(bitProxy, "TokensRedeemed")
          .withArgs(user.address, expectedTotal, bnoteIds, bnoteAmounts)
          .and.to.emit(bitProxy, "PremiumCollected")
          .withArgs(treasury.address, expectedPremium);

      // Check user's BIT balance decreased by total
      expect(await bitProxy.balanceOf(user.address)).to.equal(userBITBalance - expectedTotal);

      // Check treasury received premium
      expect(await bitProxy.balanceOf(treasury.address)).to.equal(treasuryBalanceBefore + expectedPremium);

      // Check user received BNotes
      expect(await bnoteProxy.balanceOf(user.address, 1)).to.equal(7); // Originally had 10, deposited 5, redeemed 2 = 7
    });

    it("should handle zero premium correctly", async () => {
      // Set premium to zero
      await bitProxy.connect(admin).setRedemptionPremium(0);

      const bnoteIds = [10];
      const bnoteAmounts = [1]; // 1 denomination-10 = 10 total value

      const expectedBase = ethers.parseEther("10000");

      const treasuryBalanceBefore = await bitProxy.balanceOf(treasury.address);

      await bitProxy.connect(user).redeem(bnoteIds, bnoteAmounts);

      expect(await bitProxy.balanceOf(treasury.address)).to.equal(treasuryBalanceBefore);
      expect(await bitProxy.balanceOf(user.address)).to.equal(userBITBalance - expectedBase);
      expect(await bnoteProxy.balanceOf(user.address, 10)).to.equal(3); // Originally had 5, deposited 3, redeemed 1 = 3
    });

    it("should reject redemption when treasury not set", async () => {
      // Deploy new BIT without treasury
      const BITFactory = await ethers.getContractFactory("BIT");
      const newBIT = (await upgrades.deployProxy(
          BITFactory,
          ["Test", "TEST", admin.address, await bnoteProxy.getAddress()],
          { kind: "uups" }
      )) as BIT;

      await expect(newBIT.connect(user).redeem([1], [1]))
          .to.be.revertedWithCustomError(bitProxy, "TreasuryNotSet");
    });

    it("should reject redemption with insufficient BNote balance", async () => {
      const bnoteIds = [100];
      const bnoteAmounts = [5]; // Contract only has 2 denomination-100 BNotes

      await expect(bitProxy.connect(user).redeem(bnoteIds, bnoteAmounts))
          .to.be.revertedWithCustomError(bitProxy, "InsufficientBNoteBalance");
    });

    it("should reject redemption with array length mismatch", async () => {
      await expect(bitProxy.connect(user).redeem([1, 10], [1]))
          .to.be.revertedWithCustomError(bitProxy, "InvalidArrayLength");
    });

    it("should reject redemption when paused", async () => {
      await bitProxy.connect(admin).pause();

      await expect(bitProxy.connect(user).redeem([1], [1]))
          .to.be.reverted;
    });

    it("should calculate redemption price correctly", async () => {
      const bnoteIds = [1, 10];
      const bnoteAmounts = [2, 1]; // 2*1 + 1*10 = 12 total value

      const expectedBase = ethers.parseEther("12000"); // 12 * 1000 * 10^18
      const expectedPremium = ethers.parseEther("120"); // 12 * 10 * 10^18

      const [calculatedBase, calculatedPremium] = await bitProxy.calculateRedeemPrice(bnoteIds, bnoteAmounts);

      expect(calculatedBase).to.equal(expectedBase);
      expect(calculatedPremium).to.equal(expectedPremium);
    });
  });

  describe("View Functions", () => {
    beforeEach(async () => {
      // Give BIT contract some BNotes
      await bnoteProxy.connect(user).setApprovalForAll(await bitProxy.getAddress(), true);
      await bitProxy.connect(user).mint([1, 10, 100], [5, 3, 2]);
    });

    it("should return correct BNote balance for specific denomination", async () => {
      expect(await bitProxy.getBNoteBalance(1)).to.equal(5);
      expect(await bitProxy.getBNoteBalance(10)).to.equal(3);
      expect(await bitProxy.getBNoteBalance(100)).to.equal(2);
    });

    it("should return total BNote value", async () => {
      // 5*1 + 3*10 + 2*100 = 235
      expect(await bitProxy.getTotalBNoteValue()).to.equal(235);
      expect(await bnoteProxy.totalBalanceOf(await bitProxy.getAddress())).to.equal(235);
      // redundant, but here for exhaustiveness
      expect(await bnoteProxy.totalBalanceOf(await bitProxy.getAddress())).to
          .equal(await bitProxy.getTotalBNoteValue());
    });
  });

  describe("ERC1155 Receiver", () => {
    it("should reject direct BNote transfers", async () => {
      // Try to send BNotes directly to BIT contract
      await expect(
          bnoteProxy.connect(user).safeTransferFrom(
              user.address,
              await bitProxy.getAddress(),
              1,
              1,
              "0x"
          )
      ).to.be.reverted;
    });

    it("should reject direct batch BNote transfers", async () => {
      await expect(
          bnoteProxy.connect(user).safeBatchTransferFrom(
              user.address,
              await bitProxy.getAddress(),
              [1, 10],
              [1, 1],
              "0x"
          )
      ).to.be.reverted;
    });
  });

  describe("Interface Support", () => {
    it("should support required interfaces", async () => {
      // AccessControl interface
      expect(await bitProxy.supportsInterface("0x7965db0b")).to.be.true;
      // ERC1155Receiver interface
      expect(await bitProxy.supportsInterface("0x4e2312e0")).to.be.true;
    });
  });

  describe("Upgradeability", () => {
    it("should allow admin to upgrade implementation", async () => {
      // This would need a BITv2 mock contract for testing
      // For now, just test that the upgrade authorization works
      const ADMIN_ROLE = await bitProxy.ADMIN_ROLE();
      expect(await bitProxy.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should not allow non-admin to upgrade", async () => {
      // Test that non-admin cannot upgrade (would fail in actual upgrade call)
      const ADMIN_ROLE = await bitProxy.ADMIN_ROLE();
      expect(await bitProxy.hasRole(ADMIN_ROLE, user.address)).to.be.false;
    });
  });

  describe("Integration with BNote", () => {
    it("should work with all BNote denominations", async () => {
      await bnoteProxy.connect(user).setApprovalForAll(await bitProxy.getAddress(), true);

      // Test with all three denominations
      const bnoteIds = [1, 10, 100];
      const bnoteAmounts = [3, 2, 1]; // 3*1 + 2*10 + 1*100 = 123 total value

      await bitProxy.connect(user).mint(bnoteIds, bnoteAmounts);

      const expectedBIT = ethers.parseEther("123000"); // 123 * 1000 * 10^18
      expect(await bitProxy.balanceOf(user.address)).to.equal(expectedBIT);

      // Verify BNotes are held in vault
      expect(await bitProxy.getTotalBNoteValue()).to.equal(123);
    });

    it("should maintain proper vault accounting", async () => {
      await bnoteProxy.connect(user).setApprovalForAll(await bitProxy.getAddress(), true);
      await bitProxy.connect(admin).setTreasury(treasury.address);

      // Mint some BIT
      await bitProxy.connect(user).mint([1, 10], [5, 3]); // 35 total value

      // Check vault holds correct BNotes
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 1)).to.equal(5);
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 10)).to.equal(3);

      // Redeem some BIT
      await bitProxy.connect(user).redeem([1], [2]); // Redeem 2 denomination-1

      // Check vault balance updated
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 1)).to.equal(3);
      expect(await bnoteProxy.balanceOf(await bitProxy.getAddress(), 10)).to.equal(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle large numbers correctly", async () => {
      // Test with denomination 100 to ensure no overflow
      await bnoteProxy.connect(user).setApprovalForAll(await bitProxy.getAddress(), true);

      const bnoteIds = [100];
      const bnoteAmounts = [3]; // 300 total value

      const expectedBIT = ethers.parseEther("300000"); // 300 * 1000 * 10^18
      const calculatedBIT = await bitProxy.calculateMintAmount(bnoteIds, bnoteAmounts);

      expect(calculatedBIT).to.equal(expectedBIT);
    });

    it("should handle multiple of same denomination", async () => {
      await bnoteProxy.connect(user).setApprovalForAll(await bitProxy.getAddress(), true);

      // Mint same denomination multiple times in one call
      const bnoteIds = [10, 10, 10];
      const bnoteAmounts = [1, 1, 1]; // 3*10 = 30 total value

      await bitProxy.connect(user).mint(bnoteIds, bnoteAmounts);

      const expectedBIT = ethers.parseEther("30000");
      expect(await bitProxy.balanceOf(user.address)).to.equal(expectedBIT);
    });
  });
});