# ZK Passport Safe Recovery - Identity Verification with Zero-Knowledge Proofs

> [!WARNING]
> Code in this repository is not audited and may contain serious security holes. Use at your own risk.

A comprehensive project demonstrating how to build a decentralized identity verification system using [ZK Passport](https://zkpassport.id/). This project showcases the integration of zero-knowledge proof-based passport verification in a Next.js application with Safe wallet recovery functionality on the Sepolia testnet.

## 🎯 Project Overview

This project teaches developers how to:
- Build privacy-preserving identity verification flows
- Integrate ZK Passport SDK for passport-based verification
- Create user-friendly QR code-based authentication
- Handle zero-knowledge proofs for identity verification
- Implement Safe wallet recovery using ZK identity proofs
- Deploy and interact with smart contracts on Sepolia testnet

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Next.js App    │────▶│   ZK Passport   │────▶│ Recovery Module │
│  (Safe App)     │     │   Verifier      │     │   (Sepolia)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
    QR Code              ZK Proof Verification    Safe Wallet Recovery
   Generation             & Validation            (Guardian System)
```

## 🚀 Features

### Core Features
- **QR Code Authentication**: Dynamic QR code generation for seamless mobile verification
- **Zero-Knowledge Proofs**: Privacy-preserving identity verification without exposing personal data
- **Safe Wallet Integration**: Built as a Safe App for seamless wallet integration
- **Guardian Registration**: Register ZK identity as recovery guardian for Safe wallets
- **Safe Recovery**: Recover Safe wallet access using ZK identity verification
- **Module Management**: Enable/disable recovery modules on Safe wallets

### Technical Highlights
- **Next.js 14** with App Router for modern React development
- **TypeScript** for type-safe code
- **ZK Passport SDK** (`@zkpassport/sdk`) integration
- **Wagmi & Safe Protocol Kit** for Web3 interactions
- **Sepolia Testnet** deployment and testing
- **Responsive Design** with modern CSS
- **Error Handling** with detailed validation feedback

## 📋 Prerequisites

### Required
- **Node.js 20.x** or higher
- **pnpm** package manager
- **ZK Passport Mobile App** installed on your phone:
  - [iOS App Store](https://apps.apple.com/app/zkpassport/id6467755244)
  - [Google Play Store](https://play.google.com/store/apps/details?id=id.zkpassport.zkpassport)

### For Local Development
- **Git** for version control
- **Safe Wallet** for testing Safe App integration

### For Smart Contract Deployment
- **Ethereum wallet** with Sepolia ETH (for testnet deployment)
- **Hardhat** for contract deployment and testing
- **Etherscan API key** for contract verification on Sepolia

## 🛠️ Installation & Setup

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

### 3. Deploy Smart Contracts

First, create `contracts/.env` with the required variables:

```bash
# contracts/.env
PRIVATE_KEY=your_deployer_private_key
SEPOLIA_URL=https://eth-sepolia.public.blastapi.io
ETHERSCAN_API_KEY=your_etherscan_api_key
ZK_PASSPORT_VERIFIER_ADDRESS=0x62e33cC35e29130e135341586e8Cf9C2BAbFB3eE # example
```

Then deploy to Sepolia:

```bash
cd contracts
pnpm run deploy:recovery
```

After deployment, the address will be written to `contracts/deployments/recovery-latest.json` and a timestamped file.

### 4. Configure the Application

Update the module address in both files:

- `app/src/app/page.tsx`
- `app/src/components/ZKPassportSection.tsx`

Use the address from `contracts/deployments/recovery-latest.json`:

```typescript
const ZK_MODULE_ADDRESS = '0x...' // Deployed recovery module address
```

### 5. Start the Development Server
```bash
cd app
pnpm run dev
```

Visit `http://localhost:3000` to see the application.

### 6. Test as Safe App

To test the Safe App integration:
1. Open [Safe Wallet](https://app.safe.global)
2. Navigate to Apps section
3. Add custom app with URL: `http://localhost:3000`
4. The app will automatically connect to your Safe wallet

## 🔧 How It Works

### 1. Safe App Integration
When loaded as a Safe App:
- Automatically connects to the user's Safe wallet
- Displays Safe information (address, owners, modules)
- Checks if the ZK Recovery Module is enabled

### 2. Guardian Registration
Safe owners can register as recovery guardians:
- Generate QR code for ZK Passport verification
- Scan with ZK Passport mobile app to prove identity
- Submit transaction to register guardian on-chain
- Guardian identity is stored as a hash for privacy

### 3. Recovery Process
When recovery is needed:
- Generate recovery QR code
- Verify identity with ZK Passport app
- Specify old and new owner addresses
- Submit recovery transaction to replace Safe owner

### 4. Module Management
The app handles:
- Enabling the ZK Recovery Module on Safe wallets
- Checking module status and permissions
- Managing guardian registrations and recoveries

## 📝 Configuration Options

### Contract Addresses

Configure the recovery module address in `app/src/app/page.tsx` and `app/src/components/ZKPassportSection.tsx`.

```typescript
const ZK_MODULE_ADDRESS = '0x...'    // Recovery module contract address
```

Note: The example UI also references a `WITNESS_ADDRESS` placeholder for the Safe owners linked-list parameter. Adjust as needed for your Safe.

### ZK Passport Configuration
The app uses ZK Passport with the following settings:
- **Network**: Ethereum Sepolia testnet
- **Mode**: Compressed EVM proofs
- **Verification**: Identity verification without revealing personal data
- **Guardian System**: Hash-based identity storage for privacy

### Current Sepolia Deployment (example)
- Recovery Module: `0x2D2D70C1dC1DDEA79368F0D708fa5Ea125e59B31`
- ZKPassport Verifier: `0x62e33cC35e29130e135341586e8Cf9C2BAbFB3eE`

See `contracts/deployments/recovery-sepolia-*.json` for the latest values.

## 🏃‍♂️ Usage Guide

### Step 1: Deploy Recovery Module
1. Deploy the RecoveryModule contract to Sepolia
2. Update contract address in the app
3. Verify contract on Etherscan

### Step 2: Enable Module on Safe
1. Open the app in Safe Wallet
2. Connect to your Safe wallet
3. Enable the ZK Recovery Module
4. Confirm the transaction

### Step 3: Register Guardian
1. Click "Generate Verification Request"
2. Scan QR code with ZK Passport app
3. Complete identity verification
4. Submit guardian registration transaction

### Step 4: Test Recovery (Optional)
1. Use a different device/wallet to test recovery
2. Generate recovery QR code
3. Verify identity with same ZK Passport
4. Submit recovery transaction with new owner address

## 🚢 Deployment

### Vercel Deployment (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set build directory to `app/`
4. Deploy

### Manual Deployment
```bash
# Build the application
cd app
pnpm run build

# Start production server
pnpm start
```

### Production Considerations
- Ensure contract addresses are correctly configured
- Test Safe App integration on production domain
- Configure proper CORS headers for Safe integration

## 🐛 Troubleshooting

### Common Issues

#### Safe App Not Loading
- Ensure the app is accessible via HTTPS in production
- Check that manifest.json is properly configured
- Verify CORS headers are set correctly

#### ZK Passport Verification Failed
- Ensure you have the latest ZK Passport mobile app
- Check that the QR code is clearly visible
- Verify network connectivity on mobile device

#### Transaction Failures
- Ensure you have sufficient Sepolia ETH for gas
- Check that the recovery module contract is deployed
- Verify Safe wallet has the module enabled

#### Module Not Enabled
- Confirm you are a Safe owner
- Check that the Safe is deployed on Sepolia
- Ensure the module address is correct

## 📚 Project Structure

```
zk-passport/
├── app/                          # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main Safe App interface
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── providers.tsx     # Wagmi providers
│   │   │   └── globals.css       # Global styles
│   │   └── wagmi.ts              # Wagmi configuration
│   ├── public/
│   │   ├── manifest.json         # Safe App manifest
│   │   └── logo.svg              # App icon
│   ├── next.config.js            # Next.js configuration
│   └── package.json              # App dependencies
├── contracts/                    # Smart contracts
│   ├── contracts/
│   │   ├── contracts/
│   │   │   ├── RecoveryModule.sol          # ZK recovery module (contract: ZKPassportSafeRecovery)
│   │   │   └── RarimoRecoveryModule.sol    # Alternative implementation (Rarimo SDK)
│   │   ├── interface/                      # Interfaces (IOwnerManager, IZKPassportVerifier)
│   │   ├── deployments/                    # Deployment artifacts
│   │   └── test/                           # Contract tests
│   ├── scripts/
│   │   └── deploy-recovery.js    # Deployment script
│   ├── test/                     # Contract tests
│   ├── hardhat.config.js         # Hardhat configuration
│   └── package.json              # Contract dependencies
└── README.md                     # This file
```

## 🔗 Additional Resources

### Documentation
- [ZK Passport Documentation](https://docs.zkpassport.id/)
- [ZK Passport GitHub](https://github.com/zkpassport)
- [Safe Protocol Documentation](https://docs.safe.global/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Next.js Documentation](https://nextjs.org/docs)

### Community & Support
- [ZK Passport Discord](https://discord.gg/zkpassport)
- [Safe Community](https://forum.safe.global/)

### Related Projects
- [ZK Passport](https://zkpassport.id/)
- [Safe Wallet](https://safe.global/)
- [OpenPassport](https://openpassport.app/)

## 📄 License

This project is for educational purposes. Please refer to the repository license for usage terms.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
