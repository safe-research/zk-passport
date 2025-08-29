# ZK Passport Safe Recovery App

A Next.js application that enables Safe wallet recovery using zero-knowledge proof identity verification through [ZK Passport](https://zkpassport.id/). This project demonstrates privacy-preserving identity verification and Safe wallet recovery functionality on the Sepolia testnet.

## 🎯 Overview

This application allows Safe wallet owners to:
- **Register as guardians** using their passport identity verified through zero-knowledge proofs
- **Recover Safe wallets** by proving their identity without revealing personal information
- **Manage recovery modules** on Safe wallets with a user-friendly interface
- **Generate QR codes** for seamless mobile verification using the ZK Passport app

## ✨ Key Features

### 🔐 Privacy-Preserving Identity Verification
- Zero-knowledge proof-based passport verification
- No personal data exposed during verification process
- Secure identity hashing for guardian registration

### 📱 Mobile-First Experience
- QR code generation for easy mobile app integration
- Real-time verification status updates
- Responsive design for all device types

### 🛡️ Safe Wallet Integration
- Built as a Safe App for seamless wallet integration
- Module management (enable/disable recovery modules)
- Guardian registration and recovery functionality
- Support for Safe wallet owner validation

### ⚡ Modern Tech Stack
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Wagmi** for Ethereum interactions
- **Safe Protocol Kit** for Safe wallet operations
- **ZK Passport SDK** for identity verification
- **React Query** for efficient data fetching

## 🛠️ Prerequisites

### Required Software
- **Node.js 20.x** or higher
- **pnpm** package manager (configured in `packageManager` field)

### Mobile App
- **ZK Passport Mobile App** installed on your phone:
  - [iOS App Store](https://apps.apple.com/app/zkpassport/id6467755244)
  - [Google Play Store](https://play.google.com/store/apps/details?id=id.zkpassport.zkpassport)

### Wallet & Network
- **Safe Wallet** for testing Safe App integration
- **Sepolia ETH** for transaction fees
- **Sepolia testnet** configured in your wallet

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Development Server
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### 3. Open in Safe Wallet
1. Open Safe Wallet
2. Go to Apps → Add Custom App
3. Enter the app URL: `http://localhost:3000` (for development)
4. Load the app within Safe Wallet

## 📋 Usage Guide

### Step 1: Connect & Validate
1. Ensure you're connected to Sepolia testnet
2. Verify you're a Safe owner
3. Check if the recovery module is enabled

### Step 2: Enable Recovery Module (if needed)
1. Click "Enable Module" if not already enabled
2. Confirm the transaction in Safe Wallet
3. Wait for confirmation

### Step 3: Register as Guardian
1. Click "Generate Verification Request"
2. Scan the QR code with ZK Passport mobile app
3. Complete identity verification on your phone
4. Submit the guardian registration transaction
5. Confirm in Safe Wallet

### Step 4: Test Recovery (Optional)
1. Use the recovery section to test wallet recovery
2. Enter old owner address (to be replaced)
3. Enter new owner address (replacement)
4. Generate recovery QR code
5. Verify identity with ZK Passport app
6. Submit recovery transaction

## ⚙️ Configuration

### Environment Variables
The app uses the following configuration (defined in `src/utils/constants.ts`):

```typescript
// Recovery module contract address
export const ZK_MODULE_ADDRESS = '0x...'

// ZK Passport verifier contract
export const ZK_VERIFIER_ADDRESS = '0x...'
```

### Network Configuration
Configured for Sepolia testnet in `src/wagmi.ts`:
- Chain ID: 11155111
- RPC endpoints configured via Wagmi

## 🏗️ Project Structure

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Main application page
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # Wagmi & React Query providers
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ZKPassportSection.tsx     # Main ZK Passport component
│   │   └── ZKPassportSection.module.css
│   ├── hooks/
│   │   ├── useSafeInfo.ts     # Safe wallet information hook
│   │   ├── useRecovererInfo.ts # Guardian information hook
│   │   └── useSafeValidation.ts # Safe validation utilities
│   ├── utils/
│   │   ├── constants.ts       # Contract addresses & ABIs
│   │   ├── safeHelpers.ts     # Safe wallet utilities
│   │   └── abi.ts            # Smart contract ABIs
│   └── wagmi.ts              # Wagmi configuration
├── public/
│   ├── manifest.json         # Safe App manifest
│   └── logo.svg             # App icon
└── package.json
```

## 🔧 Key Dependencies

### Core Framework
- `next`: Next.js 14 framework
- `react`: React 18 library
- `typescript`: TypeScript support

### Web3 Integration
- `wagmi`: Ethereum React hooks
- `viem`: TypeScript Ethereum library
- `@safe-global/protocol-kit`: Safe wallet integration
- `@safe-global/safe-apps-sdk`: Safe App development kit

### ZK Passport
- `@zkpassport/sdk`: ZK Passport SDK for identity verification
- `@rarimo/zk-passport-react`: Alternative Rarimo implementation

### UI & Utilities
- `react-qr-code`: QR code generation
- `@tanstack/react-query`: Data fetching and caching

## 🚢 Deployment

### Development
```bash
pnpm dev
```

### Production Build
```bash
pnpm build
pnpm start
```

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set build directory to `app/` if needed
3. Deploy with default Next.js settings

## 🧪 Testing

The app includes comprehensive validation:
- Network validation (Sepolia testnet required)
- Safe owner validation
- Module enablement checks
- Address format validation
- Transaction status monitoring

## 🔒 Security Considerations

### Current Implementation
- ✅ Replay attack protection via proof uniqueness
- ✅ Zero-knowledge identity verification
- ✅ Safe module security model
- ✅ Input validation and sanitization

### Production Recommendations
- Implement additional timelock mechanisms
- Add multi-guardian requirements for high-value Safes
- Set up monitoring for recovery events
- Consider rate limiting for recovery attempts

## 🐛 Troubleshooting

### Common Issues

**Safe App Not Loading**
- Ensure HTTPS in production
- Check manifest.json configuration
- Verify CORS headers

**ZK Passport Verification Failed**
- Update to latest ZK Passport mobile app
- Ensure clear QR code visibility
- Check mobile device network connectivity

**Transaction Failures**
- Verify sufficient Sepolia ETH for gas
- Confirm recovery module deployment
- Check Safe module enablement status

## 📚 Related Documentation

- [ZK Passport Documentation](https://zkpassport.id/)
- [Safe Wallet Developer Docs](https://docs.safe.global/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)

## 🤝 Contributing

This project demonstrates ZK Passport integration with Safe wallets. For production use, please review the security considerations and implement additional safeguards as needed.

## ⚠️ Disclaimer

This code is for demonstration purposes and has not been audited. Use at your own risk in production environments.