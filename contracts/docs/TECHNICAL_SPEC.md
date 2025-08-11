# Technical Specification: ZKPassport Safe Recovery Module

## 1. System Overview

### 1.1 Purpose
The ZKPassport Safe Recovery Module provides a decentralized identity-based recovery mechanism for Safe multi-signature wallets using zero-knowledge proofs.

### 1.2 Key Components
- **Recovery Module Contract**: Core smart contract implementing recovery logic
- **ZKPassport Verifier**: External contract for proof verification
- **Safe Wallet**: Target multi-sig wallet for recovery

## 2. Contract Architecture

### 2.1 State Variables

```solidity
IZKPassportVerifier public immutable zkPassportVerifier;  // Verifier contract reference
mapping(address => bytes32) public safeToRecoverer;       // Safe -> Identity mapping
mapping(bytes => bool) public isProofUsed;                // Replay protection
```

### 2.2 Core Functions

#### 2.2.1 Registration Flow
```
User -> Safe -> RecoveryModule.register(proof) -> Verifier
         |                                           |
         |<-- SafeRegistered event <-----------------
```

**Process:**
1. User generates ZK proof with Safe address bound
2. Safe executes transaction to call `register()`
3. Module verifies proof via verifier contract
4. Module stores unique identifier for Safe
5. Emits `SafeRegistered` event

#### 2.2.2 Recovery Flow
```
User -> RecoveryModule.recover(proof, params) -> Verifier
              |                                      |
              |<-- Verification Result <-------------
              |
              v
         Safe.swapOwner() <- Module executes
              |
              v
        OwnerRecovered event
```

**Process:**
1. User generates recovery proof with new owner bound
2. Calls `recover()` with proof and target parameters
3. Module verifies proof and checks registration
4. Module executes owner swap on Safe
5. Emits `OwnerRecovered` event

## 3. Security Model

### 3.1 Threat Model

| Threat | Mitigation | Status |
|--------|------------|--------|
| Replay Attack | Proof marking system | ✅ Implemented |
| Identity Spoofing | ZK proof verification | ✅ Implemented |
| Unauthorized Recovery | Registration requirement | ✅ Implemented |
| Front-running | None | ⚠️ Vulnerable |
| Griefing Attack | None | ⚠️ Vulnerable |

### 3.2 Trust Assumptions
1. ZKPassport verifier correctly validates proofs
2. Safe module system is secure
3. Identity binding in proofs is cryptographically secure
4. Users protect their identity credentials

### 3.3 Security Invariants
- Each proof can only be used once
- Only registered Safes can be recovered
- New owner must be cryptographically bound to proof
- Recovery requires valid identity proof

## 4. Data Structures

### 4.1 ProofVerificationParams
```solidity
struct ProofVerificationParams {
    bytes32 vkeyHash;              // Verification key hash
    bytes proof;                   // ZK proof data
    bytes32[] publicInputs;        // Public inputs
    bytes committedInputs;         // Committed inputs
    uint256[] committedInputCounts; // Input counts
    uint256 validityPeriodInDays;  // Validity period
    string domain;                 // Domain identifier
    string scope;                  // Scope identifier
    bool devMode;                  // Development mode flag
}
```

### 4.2 Registration Data
- **Key**: Safe address
- **Value**: bytes32 unique identifier (passport hash)
- **Purpose**: Links Safe to authorized recovery identity

### 4.3 Proof Usage Tracking
- **Key**: Proof bytes
- **Value**: Boolean used flag
- **Purpose**: Prevents replay attacks

## 5. Gas Analysis

### 5.1 Operation Costs
| Operation | Estimated Gas | Factors |
|-----------|--------------|---------|
| Register | ~150,000 | Proof verification, storage write |
| Recover | ~200,000 | Proof verification, Safe interaction |
| View functions | ~5,000 | Storage reads only |

### 5.2 Optimization Opportunities
1. Pack struct data more efficiently
2. Use assembly for low-level operations
3. Optimize proof verification calls
4. Consider batching operations

## 6. Integration Requirements

### 6.1 Safe Wallet
- Must have module enabled
- Requires owner consensus for initial setup
- Compatible with Safe v1.3.0+

### 6.2 ZKPassport Verifier
- Must implement IZKPassportVerifier interface
- Deployed on same network
- Maintains proof validity rules

### 6.3 Frontend Requirements
- ZKPassport SDK integration
- Safe SDK for transaction building
- Web3 provider for blockchain interaction

## 7. Upgrade Path

### 7.1 Current Limitations
1. No timelock on recovery
2. Single guardian model
3. No emergency pause
4. Vulnerable to front-running

### 7.2 Proposed Enhancements
1. **Timelock System**: Add delay between initiation and execution
2. **Multi-Guardian**: Require multiple proofs for recovery
3. **Rate Limiting**: Limit recovery attempts
4. **Access Control**: Add role-based permissions
5. **Emergency Pause**: Circuit breaker functionality

## 8. Testing Strategy

### 8.1 Unit Tests
- Contract deployment
- Registration flow
- Recovery flow
- Access control
- Replay protection
- Edge cases

### 8.2 Integration Tests
- Safe module interaction
- Verifier integration
- Multi-owner scenarios
- Gas optimization

### 8.3 Security Tests
- Fuzzing for unexpected inputs
- Formal verification of invariants
- Audit simulation scenarios

## 9. Deployment Checklist

### 9.1 Pre-deployment
- [ ] Audit completion
- [ ] Test coverage > 95%
- [ ] Gas optimization complete
- [ ] Documentation updated
- [ ] Security review passed

### 9.2 Deployment Steps
1. Deploy verifier contract
2. Deploy recovery module with verifier address
3. Verify contracts on explorer
4. Enable module on target Safes
5. Register guardians
6. Monitor events

### 9.3 Post-deployment
- [ ] Monitor for unusual activity
- [ ] Set up alerting systems
- [ ] Document known issues
- [ ] Plan upgrade timeline

## 10. API Reference

### 10.1 Write Functions

#### register(ProofVerificationParams params)
- **Access**: Safe only (via transaction)
- **Purpose**: Register Safe for recovery
- **Gas**: ~150,000
- **Events**: SafeRegistered

#### recover(params, safeAddress, oldOwner, previousOwner)
- **Access**: Anyone with valid proof
- **Purpose**: Execute recovery
- **Gas**: ~200,000
- **Events**: OwnerRecovered

### 10.2 Read Functions

#### isRegistered(address safeAddress) → bool
- **Purpose**: Check registration status
- **Gas**: ~5,000

#### getRecoveryIdentifier(address safeAddress) → bytes32
- **Purpose**: Get registered identifier
- **Gas**: ~5,000

#### safeToRecoverer(address) → bytes32
- **Purpose**: Direct mapping access
- **Gas**: ~2,500

#### isProofUsed(bytes) → bool
- **Purpose**: Check proof usage
- **Gas**: ~2,500

## 11. Error Codes

| Error | Description | Mitigation |
|-------|-------------|------------|
| InvalidProof | Proof verification failed | Check proof generation |
| SafeNotRegistered | Safe not registered for recovery | Register first |
| OwnerSwapFailed | Safe rejected owner swap | Check Safe state |
| ZeroAddress | Invalid zero address provided | Validate inputs |
| ProofAlreadyUsed | Proof replay attempt | Generate new proof |

## 12. Event Monitoring

### 12.1 Critical Events
- `SafeRegistered`: New recovery setup
- `OwnerRecovered`: Recovery executed

### 12.2 Monitoring Strategy
1. Set up event listeners for all recovery events
2. Alert on recovery initiations
3. Track proof usage patterns
4. Monitor for anomalous activity

## 13. Compliance & Legal

### 13.1 Considerations
- GDPR compliance for identity data
- Jurisdiction-specific recovery laws
- KYC/AML requirements
- Data retention policies

### 13.2 Recommendations
1. Legal review before production deployment
2. Clear terms of service
3. Privacy policy for identity data
4. Incident response plan

## 14. References

- [Safe Documentation](https://docs.safe.global/)
- [ZKPassport Protocol](https://zkpassport.id/docs)
- [EIP-4337 Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [Zero-Knowledge Proof Theory](https://zkp.science/)
