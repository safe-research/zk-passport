const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying SafeRecovery contract...");
  console.log("Network:", hre.network.name);

  // Get the verifier address from environment variables
  const verifierAddress = process.env.ZK_PASSPORT_VERIFIER_ADDRESS;
  
  if (!verifierAddress) {
    throw new Error("ZK_PASSPORT_VERIFIER_ADDRESS environment variable is required");
  }

  console.log("Using ZKPassport Verifier at:", verifierAddress);

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the SafeRecovery contract
  console.log("\nDeploying SafeRecovery contract...");
  const SafeRecovery = await hre.ethers.getContractFactory("SafeRecovery");
  const safeRecovery = await SafeRecovery.deploy(verifierAddress);

  await safeRecovery.waitForDeployment();
  const contractAddress = await safeRecovery.getAddress();

  console.log("✅ SafeRecovery deployed to:", contractAddress);
  console.log("📋 Constructor args:", [verifierAddress]);

  // Wait for a few block confirmations before verification
  console.log("\n⏳ Waiting for block confirmations...");
  const deployTx = safeRecovery.deploymentTransaction();
  await deployTx.wait(5);

  // Verify the contract on the respective explorer
  if (shouldVerify()) {
    console.log("\n🔍 Verifying contract on explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [verifierAddress],
        network: hre.network.name
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
      if (error.message.includes("already verified")) {
        console.log("ℹ️  Contract was already verified.");
      }
    }
  } else {
    console.log("⚠️  Skipping verification: API key not found or network not supported");
  }

  // Save deployment info
  const fs = require("fs");
  const path = require("path");
  
  // Ensure deployments directory exists
  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    contractName: "SafeRecovery",
    network: hre.network.name,
    contractAddress: contractAddress,
    verifierAddress: verifierAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    blockNumber: deployTx.blockNumber,
    transactionHash: deployTx.hash,
    gasUsed: (await deployTx.wait()).gasUsed?.toString(),
    constructorArgs: [verifierAddress]
  };

  // Save as latest and timestamped file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const latestFile = path.join(deploymentsDir, "recovery-latest.json");
  const timestampedFile = path.join(deploymentsDir, `recovery-${hre.network.name}-${timestamp}.json`);

  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  fs.writeFileSync(timestampedFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📄 Deployment info saved to:");
  console.log("  -", latestFile);
  console.log("  -", timestampedFile);

  // Display summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("📍 Contract Address:", contractAddress);
  console.log("🌐 Network:", hre.network.name);
  console.log("🔑 Verifier Address:", verifierAddress);
  console.log("👤 Deployer:", deployer.address);
  console.log("⛽ Gas Used:", deploymentInfo.gasUsed || "Unknown");
  
  if (hre.network.name === "alfajores") {
    console.log("🔗 Explorer:", `https://alfajores.celoscan.io/address/${contractAddress}`);
  }

  console.log("\n📋 Next steps:");
  console.log("1. Update ZK_MODULE_ADDRESS in your frontend to:", contractAddress);
  console.log("2. Test the contract deployment with a registration transaction");
  console.log("3. Update your frontend ABI if needed");
  
  return {
    contractAddress,
    verifierAddress,
    deploymentInfo
  };
}

function shouldVerify() {
  const network = hre.network.name;
  
  // Check for API keys based on network
  if (network === "alfajores" || network === "celo") {
    return !!process.env.CELOSCAN_API_KEY;
  }
  if (network === "mainnet" || network === "sepolia" || network === "goerli") {
    return !!process.env.ETHERSCAN_API_KEY;
  }
  if (network === "polygon" || network === "mumbai") {
    return !!process.env.POLYGONSCAN_API_KEY;
  }
  
  return false;
}

// Allow script to be called directly or imported
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };