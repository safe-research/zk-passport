# ZKPassport Safe Recovery Module

## 📋 Overview

The ZKPassport Safe Recovery Module is a smart contract that enables Safe wallet recovery using zero-knowledge proof identity verification. It allows Safe owners to register their identity using ZKPassport and recover access to their Safe if they lose access to their owner keys.

## 🏗️ Architecture

### Core Components

1. **RecoveryModule.sol** - Main recovery module contract
2. **IZKPassportVerifier.sol** - Interface for ZKPassport verification
3. **IOwnerManager.sol** - Interface for Safe owner management

### Key Features

- **Identity-Based Recovery**: Use ZKPassport proofs to recover Safe access
- **Replay Protection**: Each proof can only be used once
- **Safe Integration**: Works as a Safe module for seamless integration
- **Guardian Registration**: Safe owners can register guardians for recovery

## 🔐 Security Considerations

### Current Implementation

The current implementation includes:
- ✅ **Replay Attack Protection**: Proofs are marked as used after first use
- ✅ **Identity Verification**: ZK proofs ensure only authorized identities can recover
- ✅ **Safe Module Security**: Leverages Safe's module system for secure execution

### Known Limitations

⚠️ **Front-Running Risk**: The current implementation may be vulnerable to front-running attacks. Consider implementing:
- Timelock mechanisms for recovery operations
- Two-phase commit-reveal schemes
- Owner validation before recovery execution

### Recommendations for Production

1. **Add Timelock**: Implement a delay period between recovery initiation and execution
2. **Multi-Guardian Support**: Require multiple guardians for high-value Safes
3. **Rate Limiting**: Limit recovery attempts to prevent abuse
4. **Emergency Pause**: Add circuit breaker functionality
5. **Event Monitoring**: Set up monitoring for recovery events

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-org/zk-passport
cd zk-passport/contracts

# Install dependencies
pnpm install

# Compile contracts
pnpm compile
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
npx hardhat test test/RecoveryModule.test.js
```

## 🚀 Deployment

### Prerequisites

1. Set up your `.env` file:
```bash
PRIVATE_KEY=your_private_key_here
ZK_PASSPORT_VERIFIER_ADDRESS=0x_verifier_address
ETHERSCAN_API_KEY=your_api_key
```

2. Deploy the contract:
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy-recovery.js --network sepolia

# Deploy to mainnet (use with caution)
npx hardhat run scripts/deploy-recovery.js --network mainnet
```

## 📖 Contract Interface

### Functions

#### `register(ProofVerificationParams params)`
Registers a Safe for recovery using a ZK proof.

**Parameters:**
- `params`: ZK proof verification parameters containing proof data

**Requirements:**
- Must be called by the Safe itself (through a transaction)
- Proof must be valid and verify successfully
- Safe address must be bound in the proof

**Events:**
- `SafeRegistered(address indexed safeAddress, bytes32 indexed uniqueIdentifier)`

#### `recover(params, safeAddress, oldOwner, previousOwner)`
Recovers a Safe by swapping an old owner with a new one.

**Parameters:**
- `params`: ZK proof verification parameters
- `safeAddress`: Address of the Safe to recover
- `oldOwner`: Current owner to be replaced
- `previousOwner`: Owner before oldOwner in the linked list (or 0x1 for sentinel)

**Requirements:**
- Safe must be registered for recovery
- Proof must match the registered identifier
- Proof must not have been used before
- New owner address must be bound in the proof

**Events:**
- `OwnerRecovered(address indexed safeAddress, address indexed oldOwner, address indexed newOwner, address recoverer)`

#### View Functions

- `isRegistered(address safeAddress)`: Check if a Safe is registered
- `getRecoveryIdentifier(address safeAddress)`: Get the recovery identifier
- `safeToRecoverer(address safeAddress)`: Get the registered unique identifier
- `isProofUsed(bytes proof)`: Check if a proof has been used

## 💡 Usage Example

### 1. Enable the Module on Your Safe

```javascript
// Using Safe SDK
const safeTransaction = await safeSdk.createEnableModuleTx(recoveryModuleAddress)
const txResponse = await safeSdk.executeTransaction(safeTransaction)
```

### 2. Register for Recovery

```javascript
// Generate ZK proof with ZKPassport SDK
const zkPassport = new ZKPassport()
const proof = await zkPassport.generateProof({
  // Your identity data
})

// Register through Safe transaction
const registerTx = await safeSdk.createTransaction({
  to: recoveryModuleAddress,
  data: encodeRegisterFunction(proof),
  value: '0'
})
await safeSdk.executeTransaction(registerTx)
```

### 3. Recover Safe Access

```javascript
// Generate recovery proof
const recoveryProof = await zkPassport.generateProof({
  // Identity data with new owner address bound
})

// Execute recovery
await recoveryModule.recover(
  recoveryProof,
  safeAddress,
  oldOwnerAddress,
  previousOwnerAddress
)
```

## 🔍 Auditing Checklist

When auditing this contract, pay special attention to:

- [ ] Front-running vulnerabilities in the recover function
- [ ] Proper validation of owner addresses
- [ ] Replay attack prevention mechanisms
- [ ] Safe module integration security
- [ ] ZKPassport verifier integration
- [ ] Access control and permissions
- [ ] Event emission for monitoring
- [ ] Error handling and revert messages

## 📊 Gas Optimization

Current gas costs (approximate):
- Registration: ~150,000 gas
- Recovery: ~200,000 gas

Optimization opportunities:
- Consider using packed structs for proof parameters
- Optimize storage layout for frequently accessed mappings
- Use assembly for low-level operations where safe

## 🤝 Contributing

Please read [CONTRIBUTING.md](../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## ⚠️ Disclaimer

This smart contract is provided as-is. While it includes security measures, it has not been formally audited. Use at your own risk in production environments. Always conduct thorough testing and consider professional auditing before mainnet deployment.

## 📞 Support

For questions and support:
- Open an issue on GitHub
- Join our Discord community
- Email: support@zkpassport.id

## 🔗 Resources

- [Safe Documentation](https://docs.safe.global/)
- [ZKPassport SDK](https://docs.zkpassport.id/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/)
