# EIP-1271 ZKPassport Integration Guide

## Overview

The `ZKPassportEIP1271` contract implements the EIP-1271 standard for signature validation using ZKPassport proofs instead of traditional ECDSA signatures. This enables smart contracts to verify "signatures" that are actually zero-knowledge proofs of identity.

## What is EIP-1271?

EIP-1271 is a standard that allows smart contracts to validate signatures. It's commonly used for:
- Smart contract wallets (like Safe)
- DAO voting systems
- Meta-transactions
- Any system where a contract needs to act as a signer

## How It Works

### Traditional EIP-1271
```
User signs message → Contract verifies ECDSA signature → Returns magic value
```

### ZKPassport EIP-1271
```
User generates ZK proof → Contract verifies proof → Returns magic value
```

## Contract Interface

### Core Functions

#### `isValidSignature(bytes32 _hash, bytes memory _signature) → bytes4`
Standard EIP-1271 function for signature validation.

**Parameters:**
- `_hash`: The hash of the message (can be empty/zero for ZK proofs)
- `_signature`: ABI-encoded `ProofVerificationParams`

**Returns:**
- `0x1626ba7e` if valid
- `0xffffffff` if invalid

#### `isValidSignatureNow(bytes32 _hash, address _signer, bytes memory _signature) → bytes4`
Extended validation with signer parameter.

**Parameters:**
- `_hash`: The hash of the message
- `_signer`: Expected signer (should be contract address or zero)
- `_signature`: ABI-encoded proof parameters

**Returns:**
- `0x1626ba7e` if valid
- `0xffffffff` if invalid

## Usage Examples

### 1. Deploy and Setup

```javascript
// Deploy the EIP-1271 contract
const ZKPassportEIP1271 = await ethers.getContractFactory("ZKPassportEIP1271");
const eip1271 = await ZKPassportEIP1271.deploy(
    verifierAddress,    // ZKPassport verifier contract
    ownerAddress,       // Admin who can authorize signers
    true               // Enable replay protection
);

// Authorize a passport identity
const identityHash = "0x..."; // From ZKPassport proof
await eip1271.authorizeSigner(identityHash);
```

### 2. Generate Signature (Client-side)

```javascript
// Generate ZK proof using ZKPassport SDK
const zkPassport = new ZKPassport();
const proof = await zkPassport.generateProof({
    // Your identity data
});

// Encode proof as signature
const signature = ethers.utils.defaultAbiCoder.encode(
    ['bytes32', 'bytes', 'bytes32[]', 'bytes', 'uint256[]', 'uint256', 'string', 'string', 'bool'],
    [
        proof.vkeyHash,
        proof.proof,
        proof.publicInputs,
        proof.committedInputs,
        proof.committedInputCounts,
        proof.validityPeriodInDays,
        proof.domain,
        proof.scope,
        proof.devMode
    ]
);
```

### 3. Verify Signature

```javascript
// From another contract
interface IEIP1271 {
    function isValidSignature(bytes32 hash, bytes memory signature) 
        external view returns (bytes4);
}

contract YourContract {
    bytes4 constant MAGICVALUE = 0x1626ba7e;
    
    function verifyZKSignature(
        address signer,
        bytes32 messageHash,
        bytes memory signature
    ) public view returns (bool) {
        bytes4 result = IEIP1271(signer).isValidSignature(messageHash, signature);
        return result == MAGICVALUE;
    }
}
```

### 4. With Safe Wallet

```javascript
// Use ZKPassport signature in Safe transaction
const safeTx = await safe.createTransaction({
    to: targetAddress,
    data: txData,
    value: 0
});

// Instead of ECDSA signature, use ZK proof
const zkSignature = await generateZKProofSignature();

// Safe will call isValidSignature on the EIP1271 contract
await safe.executeTransaction(safeTx, zkSignature);
```

## Security Considerations

### 1. Replay Protection
- **Enabled by default**: Each proof can only be used once
- **Can be disabled**: For specific use cases where replay is acceptable
- **Recommendation**: Keep enabled for most applications

### 2. Signer Authorization
- Only authorized identity hashes can create valid signatures
- Owner can add/remove authorized signers
- Consider implementing multi-sig for owner actions

### 3. Proof Validation
- Relies on external ZKPassport verifier
- Ensure verifier contract is trusted and audited
- Consider upgradeability pattern for verifier

### 4. Front-Running
- Signature validation is read-only (no front-running risk)
- State-changing `validateSignature` marks proofs as used atomically

## Integration Patterns

### Pattern 1: DAO Voting
```solidity
contract DAO {
    function vote(bytes32 proposalId, bool support, bytes memory signature) external {
        // Verify voter identity via ZK proof
        require(
            eip1271.isValidSignature(
                keccak256(abi.encode(proposalId, support)),
                signature
            ) == MAGICVALUE,
            "Invalid signature"
        );
        // Process vote...
    }
}
```

### Pattern 2: Meta-Transactions
```solidity
contract MetaTx {
    function executeMetaTx(
        address from,
        address to,
        bytes memory data,
        bytes memory signature
    ) external {
        bytes32 hash = keccak256(abi.encode(from, to, data, nonce[from]));
        require(
            eip1271.isValidSignatureNow(hash, from, signature) == MAGICVALUE,
            "Invalid signature"
        );
        // Execute transaction...
    }
}
```

### Pattern 3: Access Control
```solidity
contract SecureVault {
    address public eip1271Verifier;
    
    modifier onlyAuthorized(bytes memory proof) {
        require(
            IEIP1271(eip1271Verifier).isValidSignature(
                bytes32(0), // No specific message
                proof
            ) == 0x1626ba7e,
            "Unauthorized"
        );
        _;
    }
    
    function withdraw(uint256 amount, bytes memory proof) 
        external 
        onlyAuthorized(proof) 
    {
        // Withdraw logic...
    }
}
```

## Gas Optimization

### Costs
- `isValidSignature` (view): ~50,000 gas
- `validateSignature` (state-changing): ~100,000 gas
- Authorization management: ~25,000 gas

### Tips
1. Cache authorization status off-chain when possible
2. Batch multiple validations in a single transaction
3. Use events for monitoring instead of repeated queries

## Testing

```bash
# Run EIP-1271 tests
npx hardhat test test/ZKPassportEIP1271.test.js

# With gas reporting
REPORT_GAS=true npx hardhat test test/ZKPassportEIP1271.test.js
```

## Deployment Checklist

- [ ] Deploy ZKPassport verifier first
- [ ] Deploy EIP-1271 contract with verifier address
- [ ] Set appropriate owner
- [ ] Decide on replay protection setting
- [ ] Authorize initial signers
- [ ] Test with actual ZK proofs
- [ ] Verify contracts on explorer
- [ ] Set up monitoring for events

## Common Issues

### "Invalid signature format"
- Ensure proof is properly ABI-encoded
- Check all struct fields are included
- Verify encoding order matches

### "Unauthorized signer"
- Check identity hash is authorized
- Verify proof generates expected identifier
- Ensure authorization transaction was successful

### "Proof already used"
- Replay protection is enabled
- Generate a new proof for each signature
- Consider disabling for read-only operations

## Advanced Features

### Multi-Signature Support
Extend the contract to require multiple ZK proofs:
```solidity
function isValidMultiSignature(
    bytes32 hash,
    bytes[] memory signatures,
    uint256 threshold
) external view returns (bytes4);
```

### Time-Bound Signatures
Add expiration to signatures:
```solidity
function isValidSignatureUntil(
    bytes32 hash,
    bytes memory signature,
    uint256 deadline
) external view returns (bytes4);
```

### Delegated Signatures
Allow identity holders to delegate signing power:
```solidity
mapping(bytes32 => bytes32) public delegations;
```

## Resources

- [EIP-1271 Specification](https://eips.ethereum.org/EIPS/eip-1271)
- [ZKPassport Documentation](https://docs.zkpassport.id)
- [Safe Smart Account](https://docs.safe.global)
- [OpenZeppelin EIP-1271](https://docs.openzeppelin.com/contracts/4.x/api/interfaces#IERC1271)

