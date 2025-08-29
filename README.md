# ZK Passport Safe Recovery - Privacy-Preserving Wallet Recovery

> [!WARNING]
> This code is for demonstration purposes and has not been formally audited. Use at your own risk in production environments.

A comprehensive project demonstrating privacy-preserving wallet recovery using [ZK Passport](https://zkpassport.id/) zero-knowledge proofs. This repository showcases how to build a complete identity verification system with Safe wallet recovery functionality, featuring both smart contracts and a user-friendly Next.js application.

## 🎯 Project Overview

This project demonstrates how to:
- **Build privacy-preserving identity verification** using zero-knowledge proofs
- **Integrate ZK Passport SDK** for passport-based authentication
- **Create user-friendly QR code flows** for mobile verification
- **Implement Safe wallet recovery** using ZK identity proofs
- **Deploy and interact with smart contracts** on Sepolia testnet
- **Develop Safe Apps** with modern Web3 tooling

## 🏗️ Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│    Next.js App      │────▶│   ZK Passport       │────▶│  Recovery Module    │
│   (Safe App)        │     │   Verifier          │     │   (Smart Contract)  │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
   QR Code Generation      ZK Proof Verification      Safe Wallet Recovery
   Mobile Integration       Identity Validation        Guardian System
```

## ✨ Key Features

### 🔐 Privacy-First Identity Verification
- **Zero-knowledge proofs** for passport verification
- **No personal data exposure** during authentication
- **Mobile-first experience** with QR code integration
- **Secure identity hashing** for guardian registration

### 🛡️ Safe Wallet Integration
- **Built as a Safe App** for seamless wallet integration
- **Module-based architecture** for secure recovery operations
- **Guardian registration system** for wallet recovery
- **Owner replacement functionality** with ZK proof validation

### ⚡ Modern Tech Stack
- **Next.js 14** with App Router and TypeScript
- **Wagmi & Viem** for Ethereum interactions
- **Safe Protocol Kit** for Safe wallet operations
- **ZK Passport SDK** for identity verification
- **Hardhat** for smart contract development
- **React Query** for efficient data management

## 📋 Prerequisites

### Required Software
- **Node.js 20.x** or higher
- **pnpm** package manager
- **Git** for version control

### Mobile App
- **ZK Passport Mobile App** installed on your device:
  - [iOS App Store](https://apps.apple.com/app/zkpassport/id6467755244)
  - [Google Play Store](https://play.google.com/store/apps/details?id=id.zkpassport.zkpassport)

### For Development & Testing
- **Safe Wallet** for testing Safe App integration
- **Sepolia ETH** for transaction fees (get from [Sepolia Faucet](https://sepoliafaucet.com/))
- **Ethereum wallet** configured for Sepolia testnet

### For Contract Deployment
- **Private key** of deployer wallet with Sepolia ETH
- **Etherscan API key** for contract verification (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd zk-passport
```

### 2. Install Dependencies
```bash
# Install app dependencies
cd app
pnpm install

# Install contract dependencies
cd ../contracts
pnpm install
```

### 3. Deploy Smart Contracts (Optional)

If you want to deploy your own contracts, create `contracts/.env`:

```bash
# contracts/.env
PRIVATE_KEY=your_deployer_private_key
SEPOLIA_URL=https://eth-sepolia.public.blastapi.io
ETHERSCAN_API_KEY=your_etherscan_api_key
ZK_PASSPORT_VERIFIER_ADDRESS=0x62e33cC35e29130e135341586e8Cf9C2BAbFB3eE
```

Deploy to Sepolia:
```bash
cd contracts
npx hardhat run scripts/deploy-recovery.js --network sepolia
```

### 4. Configure the Application

Update contract addresses in:
- `app/src/utils/constants.ts`

```typescript
export const ZK_MODULE_ADDRESS = '0x...' // Your deployed contract address
```

### 5. Start Development

```bash
cd app
pnpm dev
```

Visit `http://localhost:3000` to see the application.

### 6. Test as Safe App

1. Open [Safe Wallet](https://app.safe.global)
2. Navigate to Apps → Add Custom App
3. Enter URL: `http://localhost:3000`
4. The app will load within Safe Wallet interface

## 🔧 How It Works

### Guardian Registration Flow
1. **Safe Owner** opens the app within Safe Wallet
2. **Enable Module** if not already enabled on the Safe
3. **Generate QR Code** for identity verification
4. **Scan with ZK Passport** mobile app to prove identity
5. **Submit Transaction** to register as guardian on-chain
6. **Identity Hash** is stored securely (no personal data)

### Recovery Process
1. **Generate Recovery QR** with new owner address bound to proof
2. **Verify Identity** using the same ZK Passport mobile app
3. **Submit Recovery** transaction specifying old and new owner
4. **ZK Proof Validation** ensures only authorized recovery
5. **Owner Replacement** executed through Safe's module system

### Security Features
- **Replay Protection**: Each proof can only be used once
- **Identity Binding**: Proofs are cryptographically bound to specific addresses
- **Module Security**: Leverages Safe's battle-tested module system
- **Privacy Preservation**: No personal data stored on-chain

## 📁 Project Structure

```
zk-passport/
├── app/                              # Next.js Safe App
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Main application interface
│   │   │   ├── layout.tsx           # Root layout with providers
│   │   │   ├── providers.tsx        # Wagmi & React Query setup
│   │   │   └── globals.css          # Global styles
│   │   ├── components/
│   │   │   ├── ZKPassportSection.tsx           # Main ZK Passport component
│   │   │   ├── ZKPassportSection.module.css    # Component styles
│   │   │   └── CandideZKPassportSection.tsx    # Alternative implementation
│   │   ├── hooks/
│   │   │   ├── useSafeInfo.ts       # Safe wallet information
│   │   │   ├── useRecovererInfo.ts  # Guardian information
│   │   │   └── useSafeValidation.ts # Validation utilities
│   │   ├── utils/
│   │   │   ├── constants.ts         # Contract addresses & ABIs
│   │   │   ├── safeHelpers.ts       # Safe wallet utilities
│   │   │   └── abi.ts              # Smart contract ABIs
│   │   └── wagmi.ts                # Wagmi configuration
│   ├── public/
│   │   ├── manifest.json           # Safe App manifest
│   │   └── logo.svg               # App icon
│   └── package.json
├── contracts/                       # Smart Contracts
│   ├── contracts/
│   │   ├── ZKPassportSafeRecovery.sol          # Main recovery contract
│   │   └── mocks/                              # Mock contracts for testing
│   ├── interfaces/
│   │   ├── IZKPassportVerifier.sol             # ZK verifier interface
│   │   └── IOwnerManager.sol                   # Safe owner manager interface
│   ├── scripts/
│   │   └── deploy-recovery.js       # Deployment script
│   ├── deployments/                # Deployment artifacts
│   ├── test/                       # Contract tests
│   ├── hardhat.config.ts           # Hardhat configuration
│   └── package.json
└── README.md                       # This file
```

## 🧪 Testing & Development

### Contract Testing
```bash
cd contracts

# Run all tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Run specific test
npx hardhat test test/ZKPassportSafeRecovery.test.js
```

### Application Testing
```bash
cd app

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### End-to-End Testing
1. Deploy contracts to Sepolia testnet
2. Configure app with deployed contract addresses
3. Test complete flow in Safe Wallet:
   - Enable recovery module
   - Register as guardian
   - Test recovery process

## 🚢 Deployment

### Smart Contracts
```bash
cd contracts

# Deploy to Sepolia
npx hardhat run scripts/deploy-recovery.js --network sepolia

# Verify contract (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Application

#### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set build directory to `app/`
4. Configure environment variables if needed
5. Deploy

#### Manual Deployment
```bash
cd app
pnpm build
pnpm start
```

### Production Considerations
- Ensure HTTPS is enabled for Safe App integration
- Configure proper CORS headers
- Test Safe App manifest in production environment
- Monitor contract events for security

## 🔒 Security Considerations

### Current Implementation
- ✅ **Replay Attack Protection**: Proofs marked as used after verification
- ✅ **Identity Verification**: ZK proofs ensure authorized access
- ✅ **Safe Module Security**: Leverages Safe's proven module system
- ✅ **Privacy Preservation**: No personal data stored on-chain

### Known Limitations
⚠️ **Front-Running Risk**: Current implementation may be vulnerable to front-running attacks

### Production Recommendations
1. **Add Timelock Mechanisms** for recovery operations
2. **Implement Multi-Guardian Support** for high-value Safes
3. **Add Rate Limiting** to prevent abuse
4. **Set Up Event Monitoring** for recovery activities
5. **Consider Emergency Pause** functionality
6. **Conduct Professional Security Audit**

## 🐛 Troubleshooting

### Common Issues

**Safe App Not Loading**
- Ensure HTTPS is configured in production
- Check `manifest.json` configuration
- Verify CORS headers are properly set

**ZK Passport Verification Failed**
- Update to latest ZK Passport mobile app
- Ensure QR code is clearly visible and scannable
- Check mobile device network connectivity
- Verify camera permissions

**Transaction Failures**
- Confirm sufficient Sepolia ETH for gas fees
- Check contract deployment and address configuration
- Verify Safe wallet has recovery module enabled
- Ensure connected account is Safe owner

**Module Not Enabled**
- Confirm you are a Safe owner
- Check Safe is deployed on correct network (Sepolia)
- Verify module address is correct in configuration

## 📚 Documentation & Resources

### Project Documentation
- [Contracts README](contracts/README.md) - Smart contract details and API
- [App README](app/README.md) - Application setup and configuration

### External Resources
- [ZK Passport Documentation](https://docs.zkpassport.id/)
- [Safe Protocol Documentation](https://docs.safe.global/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)

### Community & Support
- [ZK Passport Discord](https://discord.gg/zkpassport)
- [Safe Community Forum](https://forum.safe.global/)

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with proper testing
4. **Commit your changes** (`git commit -m 'Add amazing feature'`)
5. **Push to the branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This project is provided for educational and demonstration purposes. While it includes security measures, it has not been formally audited. Always conduct thorough testing and consider professional security auditing before any production deployment.

## 🙏 Acknowledgments

- [ZK Passport](https://zkpassport.id/) for zero-knowledge identity verification
- [Safe](https://safe.global/) for secure wallet infrastructure
- [OpenPassport](https://openpassport.app/) for open-source passport verification
- The Ethereum community for building the decentralized web

---

**Built with ❤️ for a privacy-preserving future**