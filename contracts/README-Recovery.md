# SafeRecovery Module Deployment Guide

This guide explains how to deploy and verify the SafeRecovery contract using [Hardhat](https://hardhat.org/hardhat-runner/docs/getting-started#quick-start).

## 📋 Prerequisites

1. **Node.js** (v16 or later)
2. **pnpm** (recommended package manager)
3. **Private key** for deployment
4. **ZKPassport Verifier address**
5. **Explorer API key** (for contract verification)

## 🔧 Environment Setup

Create a `.env` file in the `contracts/` directory with the following variables:

```bash
# Deployment Configuration
PRIVATE_KEY=your_private_key_here

# ZKPassport Configuration
ZK_PASSPORT_VERIFIER_ADDRESS=0x_your_zkpassport_verifier_address_here

# Explorer API Keys for Verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Optional: Custom Network URLs
SEPOLIA_URL=https://eth-sepolia.public.blastapi.io
```

### 🔑 Getting API Keys

- **Celoscan**: Get your API key from [Celoscan](https://celoscan.io/apis)
- **Etherscan**: Get your API key from [Etherscan](https://etherscan.io/apis)
- **Polygonscan**: Get your API key from [Polygonscan](https://polygonscan.com/apis)

## 📦 Installation

Install dependencies using pnpm:

```bash
cd contracts
pnpm install
```

## 🏗️ Compilation

Compile the contracts:

```bash
pnpm compile
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
pnpm test
```

The tests cover:
- ✅ Contract deployment
- ✅ Safe registration with ZK proofs
- ✅ Owner recovery functionality
- ✅ Error handling and edge cases
- ✅ View functions

## 🚀 Deployment

### Deploy to Alfajores (Celo Testnet)

```bash
pnpm run deploy:recovery
```

### Deploy to Localhost (for testing)

First, start a local Hardhat node:

```bash
npx hardhat node
```

Then deploy in another terminal:

```bash
pnpm run deploy:recovery:localhost
```

### Deploy to Other Networks

You can deploy to any configured network:

```bash
npx hardhat run scripts/deploy-recovery.js --network <network-name>
```

Available networks:
- `alfajores` (Celo Testnet)
- `celo` (Celo Mainnet)
- `sepolia` (Ethereum Testnet)
- `localhost` (Local development)

## 🔍 Contract Verification

The deployment script automatically attempts verification if:
1. An appropriate API key is found in the environment
2. The network supports verification

### Manual Verification

If automatic verification fails, you can verify manually:

```bash
npx hardhat verify --network alfajores <CONTRACT_ADDRESS> <VERIFIER_ADDRESS>
```

Example:
```bash
npx hardhat verify --network alfajores 0x123...abc 0x456...def
```

## 📄 Deployment Artifacts

After deployment, the following files are created:

- `deployments/recovery-latest.json` - Latest deployment info
- `deployments/recovery-<network>-<timestamp>.json` - Timestamped deployment record

Example deployment info:
```json
{
  "contractName": "SafeRecovery",
  "network": "alfajores",
  "contractAddress": "0x...",
  "verifierAddress": "0x...",
  "deployedAt": "2024-01-15T10:30:00.000Z",
  "deployer": "0x...",
  "blockNumber": 12345,
  "transactionHash": "0x...",
  "gasUsed": "1234567",
  "constructorArgs": ["0x..."]
}
```

## 🔧 Frontend Integration

After deployment, update your frontend configuration:

1. **Update the contract address** in your frontend:
   ```typescript
   const ZK_MODULE_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';
   ```

2. **Update the ABI** if you made changes to the contract interface

3. **Test the integration** with a registration transaction

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm compile` | Compile all contracts |
| `pnpm test` | Run the test suite |
| `pnpm run deploy:recovery` | Deploy to Alfajores |
| `pnpm run deploy:recovery:localhost` | Deploy to localhost |
| `pnpm run verify:recovery` | Manual verification |

## 🌐 Network Configuration

The project supports multiple networks:

### Alfajores (Celo Testnet)
- **Chain ID**: 44787
- **RPC**: https://alfajores-forno.celo-testnet.org
- **Explorer**: https://alfajores.celoscan.io

### Celo Mainnet
- **Chain ID**: 42220
- **RPC**: https://forno.celo.org
- **Explorer**: https://celoscan.io

### Sepolia (Ethereum Testnet)
- **Chain ID**: 11155111
- **RPC**: https://eth-sepolia.public.blastapi.io
- **Explorer**: https://sepolia.etherscan.io

## 🔒 Security Considerations

1. **Private Key Security**: Never commit your private key to version control
2. **Verifier Address**: Ensure you're using the correct ZKPassport verifier address
3. **Network Selection**: Double-check you're deploying to the intended network
4. **Gas Estimation**: Monitor gas costs, especially on mainnet
5. **Contract Verification**: Always verify contracts on public explorers

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid verifier address"**
   - Ensure `ZK_PASSPORT_VERIFIER_ADDRESS` is set correctly
   - Verify the address exists on the target network

2. **"Insufficient funds"**
   - Check your wallet balance on the target network
   - Get testnet tokens from faucets for testnets

3. **"Verification failed"**
   - Check if your API key is correct
   - Ensure you're using the right network name
   - Try manual verification with constructor arguments

4. **"Network not supported"**
   - Check if the network is configured in `hardhat.config.js`
   - Verify the network URL is accessible

### Getting Help

- Check the [Hardhat documentation](https://hardhat.org/hardhat-runner/docs/getting-started#quick-start)
- Review the contract tests for usage examples
- Ensure all environment variables are properly set

## 📝 Contract Interface

The SafeRecovery contract provides the following main functions:

### `register(ProofVerificationParams params, address safeAddress)`
Register a Safe for recovery using a ZK proof.

### `recover(ProofVerificationParams params, address safeAddress, address oldOwner, address newOwner, address previousOwner)`
Recover a Safe by swapping owners using a ZK proof.

### `isRegistered(address safeAddress) → bool`
Check if a Safe is registered for recovery.

### `getRecoveryIdentifier(address safeAddress) → bytes32`
Get the recovery identifier for a registered Safe.

## 🎉 Success!

Once deployed successfully, you'll see output similar to:

```
============================================================
🎉 DEPLOYMENT COMPLETE!
============================================================
📍 Contract Address: 0x...
🌐 Network: alfajores
🔑 Verifier Address: 0x...
👤 Deployer: 0x...
⛽ Gas Used: 1234567
🔗 Explorer: https://alfajores.celoscan.io/address/0x...

📋 Next steps:
1. Update ZK_MODULE_ADDRESS in your frontend to: 0x...
2. Test the contract deployment with a registration transaction
3. Update your frontend ABI if needed
```

Your SafeRecovery module is now deployed and ready to use! 🚀