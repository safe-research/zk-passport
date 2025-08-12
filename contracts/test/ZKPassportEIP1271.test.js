const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZKPassportEIP1271", function () {
  let eip1271Contract;
  let mockVerifier;
  let owner, user, attacker;
  let uniqueIdentifier;
  
  // EIP-1271 constants
  const MAGICVALUE = "0x1626ba7e";
  const INVALID_SIGNATURE = "0xffffffff";
  
  // Mock proof data
  const mockProof = {
    vkeyHash: ethers.utils.formatBytes32String("vkey"),
    proof: "0x1234567890abcdef",
    publicInputs: [ethers.utils.formatBytes32String("input1")],
    committedInputs: "0xabcdef",
    committedInputCounts: [1],
    validityPeriodInDays: 30,
    domain: "zkpassport.id",
    scope: "signature",
    devMode: false
  };

  beforeEach(async function () {
    [owner, user, attacker] = await ethers.getSigners();
    uniqueIdentifier = ethers.utils.formatBytes32String("passport123");

    // Deploy mock ZKPassport verifier
    const MockVerifier = await ethers.getContractFactory("MockZKPassportVerifier");
    mockVerifier = await MockVerifier.deploy();
    await mockVerifier.deployed();

    // Deploy EIP-1271 contract
    const ZKPassportEIP1271 = await ethers.getContractFactory("ZKPassportEIP1271");
    eip1271Contract = await ZKPassportEIP1271.deploy(
      mockVerifier.address,
      owner.address,
      true // Enable replay protection
    );
    await eip1271Contract.deployed();

    // Setup mock verifier
    await mockVerifier.setVerificationResult(true, uniqueIdentifier);
  });

  describe("Deployment", function () {
    it("Should set correct initial values", async function () {
      expect(await eip1271Contract.zkPassportVerifier()).to.equal(mockVerifier.address);
      expect(await eip1271Contract.owner()).to.equal(owner.address);
      expect(await eip1271Contract.replayProtectionEnabled()).to.be.true;
    });

    it("Should revert with zero addresses", async function () {
      const ZKPassportEIP1271 = await ethers.getContractFactory("ZKPassportEIP1271");
      
      await expect(
        ZKPassportEIP1271.deploy(ethers.constants.AddressZero, owner.address, true)
      ).to.be.revertedWith("ZeroAddress");
      
      await expect(
        ZKPassportEIP1271.deploy(mockVerifier.address, ethers.constants.AddressZero, true)
      ).to.be.revertedWith("ZeroAddress");
    });
  });

  describe("Signer Authorization", function () {
    it("Should allow owner to authorize signers", async function () {
      await expect(eip1271Contract.authorizeSigner(uniqueIdentifier))
        .to.emit(eip1271Contract, "SignerAuthorized")
        .withArgs(uniqueIdentifier);
      
      expect(await eip1271Contract.isAuthorized(uniqueIdentifier)).to.be.true;
    });

    it("Should allow owner to revoke signers", async function () {
      await eip1271Contract.authorizeSigner(uniqueIdentifier);
      
      await expect(eip1271Contract.revokeSigner(uniqueIdentifier))
        .to.emit(eip1271Contract, "SignerRevoked")
        .withArgs(uniqueIdentifier);
      
      expect(await eip1271Contract.isAuthorized(uniqueIdentifier)).to.be.false;
    });

    it("Should revert if non-owner tries to authorize", async function () {
      await expect(
        eip1271Contract.connect(attacker).authorizeSigner(uniqueIdentifier)
      ).to.be.revertedWith("OnlyOwner");
    });
  });

  describe("EIP-1271 Signature Validation", function () {
    let encodedSignature;

    beforeEach(async function () {
      // Authorize the signer
      await eip1271Contract.authorizeSigner(uniqueIdentifier);
      
      // Encode the proof as signature
      encodedSignature = await eip1271Contract.encodeProofParams(mockProof);
    });

    it("Should validate authorized signature", async function () {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test message"));
      
      const result = await eip1271Contract.isValidSignature(hash, encodedSignature);
      expect(result).to.equal(MAGICVALUE);
    });

    it("Should reject unauthorized signature", async function () {
      // Revoke authorization
      await eip1271Contract.revokeSigner(uniqueIdentifier);
      
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test message"));
      const result = await eip1271Contract.isValidSignature(hash, encodedSignature);
      
      expect(result).to.equal(INVALID_SIGNATURE);
    });

    it("Should reject invalid proof", async function () {
      await mockVerifier.setVerificationResult(false, uniqueIdentifier);
      
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test message"));
      const result = await eip1271Contract.isValidSignature(hash, encodedSignature);
      
      expect(result).to.equal(INVALID_SIGNATURE);
    });

    it("Should handle empty hash", async function () {
      const emptyHash = ethers.constants.HashZero;
      const result = await eip1271Contract.isValidSignature(emptyHash, encodedSignature);
      
      expect(result).to.equal(MAGICVALUE);
    });
  });

  describe("isValidSignatureNow", function () {
    let encodedSignature;

    beforeEach(async function () {
      await eip1271Contract.authorizeSigner(uniqueIdentifier);
      encodedSignature = await eip1271Contract.encodeProofParams(mockProof);
    });

    it("Should validate with contract address as signer", async function () {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      const result = await eip1271Contract.isValidSignatureNow(
        hash,
        eip1271Contract.address,
        encodedSignature
      );
      
      expect(result).to.equal(MAGICVALUE);
    });

    it("Should validate with zero address as signer", async function () {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      const result = await eip1271Contract.isValidSignatureNow(
        hash,
        ethers.constants.AddressZero,
        encodedSignature
      );
      
      expect(result).to.equal(MAGICVALUE);
    });

    it("Should reject with different signer address", async function () {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      const result = await eip1271Contract.isValidSignatureNow(
        hash,
        user.address,
        encodedSignature
      );
      
      expect(result).to.equal(INVALID_SIGNATURE);
    });
  });

  describe("Replay Protection", function () {
    let encodedSignature;

    beforeEach(async function () {
      await eip1271Contract.authorizeSigner(uniqueIdentifier);
      encodedSignature = await eip1271Contract.encodeProofParams(mockProof);
    });

    it("Should prevent replay when protection is enabled", async function () {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      // First validation marks proof as used
      await expect(eip1271Contract.validateSignature(hash, encodedSignature))
        .to.emit(eip1271Contract, "SignatureValidated")
        .withArgs(hash, uniqueIdentifier);
      
      // Second validation should fail
      await expect(
        eip1271Contract.validateSignature(hash, encodedSignature)
      ).to.be.revertedWith("ProofAlreadyUsed");
    });

    it("Should allow disabling replay protection", async function () {
      await eip1271Contract.setReplayProtection(false);
      expect(await eip1271Contract.replayProtectionEnabled()).to.be.false;
      
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      // Multiple validations should succeed
      await eip1271Contract.validateSignature(hash, encodedSignature);
      await eip1271Contract.validateSignature(hash, encodedSignature);
    });

    it("Should track used proofs", async function () {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      const proofHash = ethers.utils.keccak256(mockProof.proof);
      
      expect(await eip1271Contract.isProofUsed(proofHash)).to.be.false;
      
      await eip1271Contract.validateSignature(hash, encodedSignature);
      
      expect(await eip1271Contract.isProofUsed(proofHash)).to.be.true;
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      await expect(eip1271Contract.transferOwnership(user.address))
        .to.emit(eip1271Contract, "OwnershipTransferred")
        .withArgs(owner.address, user.address);
      
      expect(await eip1271Contract.getOwner()).to.equal(user.address);
    });

    it("Should revert on zero address transfer", async function () {
      await expect(
        eip1271Contract.transferOwnership(ethers.constants.AddressZero)
      ).to.be.revertedWith("ZeroAddress");
    });

    it("Should enforce owner-only functions", async function () {
      await expect(
        eip1271Contract.connect(attacker).transferOwnership(attacker.address)
      ).to.be.revertedWith("OnlyOwner");
      
      await expect(
        eip1271Contract.connect(attacker).setReplayProtection(false)
      ).to.be.revertedWith("OnlyOwner");
    });
  });

  describe("Encoding/Decoding", function () {
    it("Should correctly encode and decode proof params", async function () {
      const encoded = await eip1271Contract.encodeProofParams(mockProof);
      const decoded = await eip1271Contract.decodeProofParams(encoded);
      
      expect(decoded.vkeyHash).to.equal(mockProof.vkeyHash);
      expect(decoded.proof).to.equal(mockProof.proof);
      expect(decoded.publicInputs[0]).to.equal(mockProof.publicInputs[0]);
      expect(decoded.validityPeriodInDays).to.equal(mockProof.validityPeriodInDays);
      expect(decoded.domain).to.equal(mockProof.domain);
      expect(decoded.scope).to.equal(mockProof.scope);
      expect(decoded.devMode).to.equal(mockProof.devMode);
    });

    it("Should revert on empty signature", async function () {
      await expect(
        eip1271Contract.decodeProofParams("0x")
      ).to.be.revertedWith("InvalidSignatureFormat");
    });
  });

  describe("Integration Tests", function () {
    it("Should work with external contract calls", async function () {
      // Deploy a mock contract that uses EIP-1271
      const MockConsumer = await ethers.getContractFactory("MockEIP1271Consumer");
      const consumer = await MockConsumer.deploy();
      await consumer.deployed();
      
      // Authorize signer
      await eip1271Contract.authorizeSigner(uniqueIdentifier);
      
      // Create signature
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("important message"));
      const signature = await eip1271Contract.encodeProofParams(mockProof);
      
      // Verify through consumer contract
      const isValid = await consumer.verifySignature(
        eip1271Contract.address,
        hash,
        signature
      );
      
      expect(isValid).to.be.true;
    });
  });

  describe("Gas Usage", function () {
    let encodedSignature;

    beforeEach(async function () {
      await eip1271Contract.authorizeSigner(uniqueIdentifier);
      encodedSignature = await eip1271Contract.encodeProofParams(mockProof);
    });

    it("Should measure gas for signature validation", async function () {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      // Measure view function gas (estimate)
      const gasEstimate = await eip1271Contract.estimateGas.isValidSignature(
        hash,
        encodedSignature
      );
      
      console.log(`isValidSignature gas estimate: ${gasEstimate.toString()}`);
      expect(gasEstimate).to.be.lt(100000);
    });

    it("Should measure gas for state-changing validation", async function () {
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      
      const tx = await eip1271Contract.validateSignature(hash, encodedSignature);
      const receipt = await tx.wait();
      
      console.log(`validateSignature gas used: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(150000);
    });
  });
});

