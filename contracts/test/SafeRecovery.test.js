const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Load chai matchers for hardhat
require("@nomicfoundation/hardhat-chai-matchers");

describe("SafeRecovery", function () {
  let safeRecovery;
  let mockVerifier;
  let mockSafe;
  let owner, otherAccount;
  
  // Mock proof parameters
  const mockProofParams = {
    vkeyHash: ethers.keccak256(ethers.toUtf8Bytes("mock_vkey")),
    proof: "0x1234",
    publicInputs: [ethers.keccak256(ethers.toUtf8Bytes("mock_input"))],
    committedInputs: "0x5678",
    committedInputCounts: [1, 2, 3],
    validityPeriodInDays: 30,
    domain: "test.domain",
    scope: "test_scope",
    devMode: true
  };

  const mockUniqueId = ethers.keccak256(ethers.toUtf8Bytes("unique_id_123"));

  async function deployContractsFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    // Deploy mock verifier
    const MockVerifier = await ethers.getContractFactory("MockZKPassportVerifier");
    const mockVerifier = await MockVerifier.deploy();
    await mockVerifier.waitForDeployment();

    // Deploy mock Safe
    const MockSafe = await ethers.getContractFactory("MockSafe");
    const mockSafe = await MockSafe.deploy();
    await mockSafe.waitForDeployment();

    // Deploy SafeRecovery contract
    const SafeRecovery = await ethers.getContractFactory("SafeRecovery");
    const safeRecovery = await SafeRecovery.deploy(await mockVerifier.getAddress());
    await safeRecovery.waitForDeployment();

    return { safeRecovery, mockVerifier, mockSafe, owner, otherAccount };
  }

  beforeEach(async function () {
    ({ safeRecovery, mockVerifier, mockSafe, owner, otherAccount } = await loadFixture(deployContractsFixture));
  });

  describe("Deployment", function () {
    it("Should set the correct verifier address", async function () {
      expect(await safeRecovery.zkPassportVerifier()).to.equal(await mockVerifier.getAddress());
    });

    it("Should revert if verifier address is zero", async function () {
      const SafeRecovery = await ethers.getContractFactory("SafeRecovery");
      await expect(
        SafeRecovery.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(safeRecovery, "ZeroAddress");
    });
  });

  describe("Registration", function () {
    beforeEach(async function () {
      // Setup mock verifier to return successful verification
      await mockVerifier.setVerificationResult(true, mockUniqueId);
    });

    it("Should register a Safe successfully when called from Safe address", async function () {
      // Impersonate the Safe contract to call register
      await ethers.provider.send("hardhat_impersonateAccount", [await mockSafe.getAddress()]);
      const safeSigner = await ethers.getSigner(await mockSafe.getAddress());
      
      // Fund the Safe account for gas
      await owner.sendTransaction({
        to: await mockSafe.getAddress(),
        value: ethers.parseEther("1.0")
      });

      await expect(
        safeRecovery.connect(safeSigner).register(mockProofParams, await mockSafe.getAddress())
      ).to.emit(safeRecovery, "SafeRegistered")
        .withArgs(await mockSafe.getAddress(), mockUniqueId);

      expect(await safeRecovery.safeToRecoverer(await mockSafe.getAddress())).to.equal(mockUniqueId);
      expect(await safeRecovery.isRegistered(await mockSafe.getAddress())).to.be.true;
      expect(await safeRecovery.getRecoveryIdentifier(await mockSafe.getAddress())).to.equal(mockUniqueId);
      
      // Stop impersonating
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [await mockSafe.getAddress()]);
    });

    it("Should revert registration when not called from Safe address", async function () {
      await expect(
        safeRecovery.register(mockProofParams, await mockSafe.getAddress())
      ).to.be.revertedWith("Only Safe can register a guardian");
    });

    it("Should revert registration with zero address", async function () {
      // The contract checks msg.sender == safeAddress first, so zero address will trigger the "Only Safe can register" error
      await expect(
        safeRecovery.register(mockProofParams, ethers.ZeroAddress)
      ).to.be.revertedWith("Only Safe can register a guardian");
    });

    it("Should revert registration with invalid proof", async function () {
      await mockVerifier.setVerificationResult(false, ethers.ZeroHash);
      
      // Impersonate the Safe contract
      await ethers.provider.send("hardhat_impersonateAccount", [await mockSafe.getAddress()]);
      const safeSigner = await ethers.getSigner(await mockSafe.getAddress());
      await owner.sendTransaction({
        to: await mockSafe.getAddress(),
        value: ethers.parseEther("1.0")
      });
      
      await expect(
        safeRecovery.connect(safeSigner).register(mockProofParams, await mockSafe.getAddress())
      ).to.be.revertedWithCustomError(safeRecovery, "InvalidProof");
      
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [await mockSafe.getAddress()]);
    });
  });

  describe("Recovery", function () {
    beforeEach(async function () {
      // Setup mock verifier and register the safe
      await mockVerifier.setVerificationResult(true, mockUniqueId);
      
      // Register the Safe (as the Safe itself)
      await ethers.provider.send("hardhat_impersonateAccount", [await mockSafe.getAddress()]);
      const safeSigner = await ethers.getSigner(await mockSafe.getAddress());
      await owner.sendTransaction({
        to: await mockSafe.getAddress(),
        value: ethers.parseEther("1.0")
      });
      
      await safeRecovery.connect(safeSigner).register(mockProofParams, await mockSafe.getAddress());
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [await mockSafe.getAddress()]);
    });

    it("Should recover successfully with valid proof", async function () {
      const oldOwner = owner.address;
      const newOwner = otherAccount.address;
      const previousOwner = owner.address; // In a real scenario, this would be the actual previous owner

      await expect(
        safeRecovery.recover(
          mockProofParams,
          await mockSafe.getAddress(),
          oldOwner,
          newOwner,
          previousOwner
        )
      ).to.emit(safeRecovery, "OwnerRecovered")
        .withArgs(await mockSafe.getAddress(), oldOwner, newOwner, owner.address);
    });

    it("Should revert recovery with zero addresses", async function () {
      await expect(
        safeRecovery.recover(
          mockProofParams,
          ethers.ZeroAddress,
          owner.address,
          otherAccount.address,
          owner.address
        )
      ).to.be.revertedWithCustomError(safeRecovery, "ZeroAddress");

      await expect(
        safeRecovery.recover(
          mockProofParams,
          await mockSafe.getAddress(),
          ethers.ZeroAddress,
          otherAccount.address,
          owner.address
        )
      ).to.be.revertedWithCustomError(safeRecovery, "ZeroAddress");

      await expect(
        safeRecovery.recover(
          mockProofParams,
          await mockSafe.getAddress(),
          owner.address,
          ethers.ZeroAddress,
          owner.address
        )
      ).to.be.revertedWithCustomError(safeRecovery, "ZeroAddress");
    });

    it("Should revert recovery with invalid proof", async function () {
      await mockVerifier.setVerificationResult(false, ethers.ZeroHash);

      await expect(
        safeRecovery.recover(
          mockProofParams,
          await mockSafe.getAddress(),
          owner.address,
          otherAccount.address,
          owner.address
        )
      ).to.be.revertedWithCustomError(safeRecovery, "InvalidProof");
    });

    it("Should revert recovery for unregistered Safe", async function () {
      // Deploy a new unregistered Safe
      const MockSafe = await ethers.getContractFactory("MockSafe");
      const unregisteredSafe = await MockSafe.deploy();
      await unregisteredSafe.waitForDeployment();

      await expect(
        safeRecovery.recover(
          mockProofParams,
          await unregisteredSafe.getAddress(),
          owner.address,
          otherAccount.address,
          owner.address
        )
      ).to.be.revertedWithCustomError(safeRecovery, "SafeNotRegistered");
    });

    it("Should revert recovery when Safe transaction fails", async function () {
      // Make the mock Safe fail the transaction
      await mockSafe.setShouldFail(true);

      await expect(
        safeRecovery.recover(
          mockProofParams,
          await mockSafe.getAddress(),
          owner.address,
          otherAccount.address,
          owner.address
        )
      ).to.be.revertedWithCustomError(safeRecovery, "OwnerSwapFailed");
    });
  });

  describe("View Functions", function () {
    it("Should return false for unregistered Safe", async function () {
      expect(await safeRecovery.isRegistered(await mockSafe.getAddress())).to.be.false;
      expect(await safeRecovery.getRecoveryIdentifier(await mockSafe.getAddress())).to.equal(ethers.ZeroHash);
    });

    it("Should return correct values for registered Safe", async function () {
      await mockVerifier.setVerificationResult(true, mockUniqueId);
      
      // Register the Safe (as the Safe itself)
      await ethers.provider.send("hardhat_impersonateAccount", [await mockSafe.getAddress()]);
      const safeSigner = await ethers.getSigner(await mockSafe.getAddress());
      await owner.sendTransaction({
        to: await mockSafe.getAddress(),
        value: ethers.parseEther("1.0")
      });
      
      await safeRecovery.connect(safeSigner).register(mockProofParams, await mockSafe.getAddress());
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [await mockSafe.getAddress()]);

      expect(await safeRecovery.isRegistered(await mockSafe.getAddress())).to.be.true;
      expect(await safeRecovery.getRecoveryIdentifier(await mockSafe.getAddress())).to.equal(mockUniqueId);
    });
  });
});