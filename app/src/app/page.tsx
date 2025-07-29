'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import Safe, {
  Eip1193Provider
} from '@safe-global/protocol-kit'
import QRCode from "react-qr-code";
import {
  MetaTransactionData,
  OperationType
} from '@safe-global/types-kit'
import { encodeFunctionData } from 'viem';

const ZK_MODULE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_verifierAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "vkeyHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes",
            "name": "proof",
            "type": "bytes"
          },
          {
            "internalType": "bytes32[]",
            "name": "publicInputs",
            "type": "bytes32[]"
          },
          {
            "internalType": "bytes",
            "name": "committedInputs",
            "type": "bytes"
          },
          {
            "internalType": "uint256[]",
            "name": "committedInputCounts",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "validityPeriodInDays",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "domain",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "scope",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "devMode",
            "type": "bool"
          }
        ],
        "internalType": "struct ProofVerificationParams",
        "name": "params",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "safeAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "oldOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      }
    ],
    "name": "recover",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "vkeyHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes",
            "name": "proof",
            "type": "bytes"
          },
          {
            "internalType": "bytes32[]",
            "name": "publicInputs",
            "type": "bytes32[]"
          },
          {
            "internalType": "bytes",
            "name": "committedInputs",
            "type": "bytes"
          },
          {
            "internalType": "uint256[]",
            "name": "committedInputCounts",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "validityPeriodInDays",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "domain",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "scope",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "devMode",
            "type": "bool"
          }
        ],
        "internalType": "struct ProofVerificationParams",
        "name": "params",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "safeAddress",
        "type": "address"
      }
    ],
    "name": "register",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "safeToRecoverer",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "zkPassportVerifier",
    "outputs": [
      {
        "internalType": "contract IZKPassportVerifier",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// verifier address: 0x62e33cC35e29130e135341586e8Cf9C2BAbFB3eE
// module address: 0x75155d07f805eC2758eF6e2900B11F5988d17424

const ZK_MODULE_ADDRESS = '0x2D2D70C1dC1DDEA79368F0D708fa5Ea125e59B31'
const WITNESS_ADDRESS = '0x0000000000000000000000000000000000000001'

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  
  // Track transaction status and refresh Safe info when confirmed
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })
  
  const [ethereumAddress, setEthereumAddress] = useState('0x7af06A5E7226075DF00402A556f5529cf6D836CC')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState("");
  const [queryUrl, setQueryUrl] = useState("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState("");
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [requestInProgress, setRequestInProgress] = useState(false);
  
  // Recovery-specific state variables
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryQueryUrl, setRecoveryQueryUrl] = useState("");
  const [recoveryUniqueIdentifier, setRecoveryUniqueIdentifier] = useState("");
  const [recoveryVerified, setRecoveryVerified] = useState<boolean | undefined>(undefined);
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);
  
  // Guardian registration transaction tracking
  const [guardianTxHash, setGuardianTxHash] = useState<`0x${string}` | undefined>(undefined);
  
  // Enable module transaction tracking
  const [enableModuleTxHash, setEnableModuleTxHash] = useState<`0x${string}` | undefined>(undefined);
  
  // Recovery owner change addresses
  const [oldOwnerAddress, setOldOwnerAddress] = useState("");
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  
  // Enable module state
  const [enableModuleLoading, setEnableModuleLoading] = useState(false);
  const [enableModuleMessage, setEnableModuleMessage] = useState("");
  
  // Track guardian registration transaction status  
  const { 
    isLoading: isGuardianTxConfirming, 
    isSuccess: isGuardianTxConfirmed 
  } = useWaitForTransactionReceipt({
    hash: guardianTxHash,
  })
  
  // Track enable module transaction status
  const { 
    isLoading: isEnableModuleTxConfirming, 
    isSuccess: isEnableModuleTxConfirmed 
  } = useWaitForTransactionReceipt({
    hash: enableModuleTxHash,
  })

  const zkPassportRef = useRef<ZKPassport | null>(null);

  const [safeInfo, setSafeInfo] = useState<{
    address: string
    owners: string[]
    threshold: number
    isDeployed: boolean
    modules: string[]
  } | null>(null)

  // Read the safeToRecoverer mapping to check if Safe is registered for recovery
  const { data: recovererUniqueId, isError: readError, isLoading: readLoading } = useReadContract({
    address: ZK_MODULE_ADDRESS as `0x${string}`,
    abi: ZK_MODULE_ABI,
    functionName: 'safeToRecoverer',
    args: [ethereumAddress as `0x${string}`],
  })

  // Helper function to check if connected address is a Safe owner
  const isConnectedAddressOwner = () => {
    if (!account.address || !safeInfo) return false;
    return safeInfo.owners.some(owner => 
      owner.toLowerCase() === account.address!.toLowerCase()
    );
  };

  // Helper function to check if Safe is registered for recovery (has a guardian set)
  const isSafeRegisteredForRecovery = () => {
    // Check if recovererUniqueId exists and is not the zero hash (empty/unset)
    return recovererUniqueId && 
           recovererUniqueId !== '0x0000000000000000000000000000000000000000000000000000000000000000' &&
           recovererUniqueId !== '0x' &&
           !readError &&
           !readLoading;
  };

  // Helper function to validate Ethereum address format
  const isValidEthereumAddress = (address: string) => {
    return address.match(/^0x[a-fA-F0-9]{40}$/) !== null;
  };

  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport();
    }
  }, []);

  // Monitor transaction status for recovery
  useEffect(() => {
    if (hash) {
      console.log("Transaction hash:", hash);
      setRecoveryMessage(`Transaction submitted! Hash: ${hash}`);
    }
  }, [hash]);

  useEffect(() => {
    if (isConfirming) {
      console.log("Transaction confirming...");
      setRecoveryMessage("Transaction confirming...");
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isConfirmed) {
      console.log("Transaction confirmed!");
      setRecoveryMessage("Transaction confirmed successfully!");
      setRecoveryInProgress(false);
      
      // Automatically refresh Safe information after successful transaction
      setTimeout(() => {
        handleLoad();
        console.log("Safe information refreshed after transaction confirmation");
      }, 2000);
    }
  }, [isConfirmed]);

  useEffect(() => {
    if (writeError) {
      console.error("Transaction error:", writeError);
      setRecoveryMessage(`Transaction failed: ${writeError.message}`);
      setRecoveryInProgress(false);
    }
  }, [writeError]);

  // Monitor guardian registration transaction status
  useEffect(() => {
    if (guardianTxHash) {
      console.log("Guardian registration transaction hash:", guardianTxHash);
      setMessage(`Guardian registration transaction submitted! Hash: ${guardianTxHash}`);
    }
  }, [guardianTxHash]);

  useEffect(() => {
    if (isGuardianTxConfirming) {
      console.log("Guardian registration transaction confirming...");
      setMessage("Guardian registration transaction confirming...");
    }
  }, [isGuardianTxConfirming]);

  useEffect(() => {
    if (isGuardianTxConfirmed) {
      console.log("Guardian registration transaction confirmed!");
      setMessage("Guardian registration confirmed successfully!");
      setRequestInProgress(false);
      
      // Automatically refresh Safe information after successful guardian registration
      setTimeout(() => {
        handleLoad();
        console.log("Safe information refreshed after guardian registration confirmation");
      }, 2000);
    }
  }, [isGuardianTxConfirmed]);

  // Monitor enable module transaction status
  useEffect(() => {
    if (enableModuleTxHash) {
      console.log("Enable module transaction hash:", enableModuleTxHash);
      setEnableModuleMessage(`Enable module transaction submitted! Hash: ${enableModuleTxHash}`);
    }
  }, [enableModuleTxHash]);

  useEffect(() => {
    if (isEnableModuleTxConfirming) {
      console.log("Enable module transaction confirming...");
      setEnableModuleMessage("Enable module transaction confirming...");
    }
  }, [isEnableModuleTxConfirming]);

  useEffect(() => {
    if (isEnableModuleTxConfirmed) {
      console.log("Enable module transaction confirmed!");
      setEnableModuleMessage("ZK Module enabled successfully!");
      setEnableModuleLoading(false);
      
      // Automatically refresh Safe information after successful module enablement
      setTimeout(() => {
        handleLoad();
        console.log("Safe information refreshed after enable module confirmation");
      }, 2000);
    }
  }, [isEnableModuleTxConfirmed]);

  const createRequest = async () => {
    if (!zkPassportRef.current) {
      return;
    }
    
    // Check if connected address is a Safe owner before creating request
    if (!isConnectedAddressOwner()) {
      setMessage("Error: Only Safe owners can register modules");
      return;
    }
    
    setMessage("");
    setQueryUrl("");
    setUniqueIdentifier("");
    setVerified(undefined);
    setGuardianTxHash(undefined); // Reset previous transaction tracking

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Proof of humanhood",
      mode: "compressed-evm",
      devMode: false,
    });

    const {
      // The address of the deployed verifier contract
      address,
      // The function name to call on the verifier contract
      functionName,
      // The ABI of the verifier contract
      abi,
    } = zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

    console.log(address, functionName, abi);
    const {
      url,
      onRequestReceived,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onReject,
      onError,
    } = queryBuilder
    // .disclose('birthdate')
    // .eq('birthdate', new D ate('1990-01-01'))
      .done();

    setQueryUrl(url);
    console.log(url);

    setRequestInProgress(true);

    onRequestReceived(() => {
      console.log("QR code scanned");
      setMessage("Request received");
    });

    onGeneratingProof(() => {
      console.log("Generating proof");
      setMessage("Generating proof...");
    });

    let proof: ProofResult | undefined;

    onProofGenerated((result: ProofResult) => {
      console.log("Proof result", result);
      proof = result;
      setMessage(`Proofs received`);
      setRequestInProgress(false);
    });

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      console.log("Result", result);
      console.log("Unique identifier", uniqueIdentifier);
      console.log("Verified", verified);
      console.log("Query result errors", queryResultErrors);

      // Check if connected address is a Safe owner before proceeding
      if (!isConnectedAddressOwner()) {
        console.error("Access denied: Only Safe owners can register modules");
        setMessage("Error: Only Safe owners can register modules");
        setRequestInProgress(false);
        return;
      }

      const provider = await account.connector?.getProvider()
      const protocolKit = await Safe.init({
        provider: provider as Eip1193Provider,
        signer: account.address,
        safeAddress: ethereumAddress
      })

      // Get verification parameters
      const verifierParams = zkPassportRef.current!.getSolidityVerifierParameters({
        proof: proof!,
        // Use the same scope as the one you specified with the request function
        // Enable dev mode if you want to use mock passports, otherwise keep it false
        devMode: false,
      });


      const safeTransactionData: MetaTransactionData = {
        to: ZK_MODULE_ADDRESS,
        value: '0', // 1 wei
        data: encodeFunctionData({
          abi: ZK_MODULE_ABI,
          functionName: "register",
          // @ts-ignore
          args: [verifierParams, safeInfo!.address]
        }),
        operation: OperationType.Call
      }

      const transaction = await protocolKit.createTransaction({transactions: [safeTransactionData]})
      await protocolKit.signTransaction(transaction)
      const executeTxResponse = await protocolKit.executeTransaction(transaction)
      const txHash = executeTxResponse.hash
      console.log("Execute transaction response", executeTxResponse)
      
      // Start tracking the guardian registration transaction
      if (txHash) {
        setGuardianTxHash(txHash as `0x${string}`);
      }
      
      console.log("Result of the query", result);
      console.log("Query result errors", queryResultErrors);
      setMessage("Result received");
      setUniqueIdentifier(uniqueIdentifier || "");
      setVerified(verified);
      setRequestInProgress(false);

    });

    onReject(() => {
      console.log("User rejected");
      setMessage("User rejected the request");
      setRequestInProgress(false);
    });

    onError((error: unknown) => {
      console.error("Error", error);
      setMessage("An error occurred");
      setRequestInProgress(false);
    });
  };

  const handleRecovery = async () => {
    if (!zkPassportRef.current) {
      return;
    }
    
    // Reset recovery state
    setRecoveryMessage("");
    setRecoveryQueryUrl("");
    setRecoveryUniqueIdentifier("");
    setRecoveryVerified(undefined);

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Safe Recovery - Verify your identity to recover access",
      mode: "compressed-evm",
      devMode: false,
    });

    const {
      // The address of the deployed verifier contract
      address,
      // The function name to call on the verifier contract
      functionName,
      // The ABI of the verifier contract
      abi,
    } = zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

    console.log("Recovery verifier details:", address, functionName, abi);
    
    const {
      url,
      onRequestReceived,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onReject,
      onError,
    } = queryBuilder
      // Same settings as createRequest - can add specific disclosures here if needed
      .done();

    setRecoveryQueryUrl(url);
    console.log("Recovery QR URL:", url);

    setRecoveryInProgress(true);

    onRequestReceived(() => {
      console.log("Recovery QR code scanned");
      setRecoveryMessage("Recovery request received");
    });

    onGeneratingProof(() => {
      console.log("Generating recovery proof");
      setRecoveryMessage("Generating recovery proof...");
    });

    let recoveryProof: ProofResult | undefined;

    onProofGenerated((result: ProofResult) => {
      console.log("Recovery proof result", result);
      recoveryProof = result;
      setRecoveryMessage("Recovery proof received");
      setRecoveryInProgress(false);
    });

    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      console.log("Recovery result", result);
      console.log("Recovery unique identifier", uniqueIdentifier);
      console.log("Recovery verified", verified);
      console.log("Recovery query result errors", queryResultErrors);

      // Get verification parameters for the recovery transaction
      const verifierParams = zkPassportRef.current!.getSolidityVerifierParameters({
        proof: recoveryProof!,
        devMode: false,
      });

      // Convert parameters for wagmi compatibility
      const wagmiVerifierParams = {
        ...verifierParams,
        vkeyHash: verifierParams.vkeyHash as `0x${string}`,
        proof: verifierParams.proof as `0x${string}`,
        publicInputs: verifierParams.publicInputs as `0x${string}`[],
        committedInputs: verifierParams.committedInputs as `0x${string}`,
        committedInputCounts: verifierParams.committedInputCounts.map((count: number) => BigInt(count)),
        validityPeriodInDays: BigInt(verifierParams.validityPeriodInDays)
      };

      try {
        // Validate addresses
        if (!oldOwnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          setRecoveryMessage("Error: Invalid current owner address format");
          setRecoveryInProgress(false);
          return;
        }

        if (!newOwnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          setRecoveryMessage("Error: Invalid new owner address format");
          setRecoveryInProgress(false);
          return;
        }

        // Execute recovery transaction using wagmi with actual addresses
        await writeContract({
          address: ZK_MODULE_ADDRESS as `0x${string}`,
          abi: ZK_MODULE_ABI,
          functionName: 'recover',
          // @ts-ignore - Type compatibility between ZKPassport SDK and wagmi
          args: [
            wagmiVerifierParams,
            ethereumAddress as `0x${string}`, // safeAddress
            oldOwnerAddress as `0x${string}`, // oldOwner (from input)
            newOwnerAddress as `0x${string}`, // newOwner (from input)
            WITNESS_ADDRESS as `0x${string}`, // previousOwner (needs Safe owner list knowledge)
          ],
        });

        console.log("Recovery transaction submitted successfully");
        setRecoveryMessage("Recovery transaction submitted - waiting for confirmation");
        
      } catch (err) {
        console.error("Recovery transaction failed:", err);
        setRecoveryMessage("Recovery transaction failed: " + (err instanceof Error ? err.message : 'Unknown error'));
        setRecoveryInProgress(false);
        return;
      }

      setRecoveryUniqueIdentifier(uniqueIdentifier || "");
      setRecoveryVerified(verified);
      setRecoveryInProgress(false);
    });

    onReject(() => {
      console.log("Recovery request rejected");
      setRecoveryMessage("Recovery request was rejected");
      setRecoveryInProgress(false);
    });

    onError((error: unknown) => {
      console.error("Recovery error", error);
      setRecoveryMessage("An error occurred during recovery");
      setRecoveryInProgress(false);
    });
  };

  const handleEnableModule = async () => {
    if (!account.address || !safeInfo) {
      setEnableModuleMessage("Error: No wallet connected or Safe not loaded");
      return;
    }

    // Check if user is a Safe owner
    if (!isConnectedAddressOwner()) {
      setEnableModuleMessage("Error: Only Safe owners can enable modules");
      return;
    }

    setEnableModuleLoading(true);
    setEnableModuleMessage("");
    setEnableModuleTxHash(undefined); // Reset previous tracking

    try {
      const provider = await account.connector?.getProvider();
      const protocolKit = await Safe.init({
        provider: provider as Eip1193Provider,
        signer: account.address,
        safeAddress: ethereumAddress
      });

      // Create transaction to enable the module
      const safeTransactionData: MetaTransactionData = {
        to: safeInfo.address,
        value: '0',
        data: encodeFunctionData({
          abi: [
            {
              "inputs": [{"internalType": "address", "name": "module", "type": "address"}],
              "name": "enableModule",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ],
          functionName: "enableModule",
          args: [ZK_MODULE_ADDRESS]
        }),
        operation: OperationType.Call
      };

      const transaction = await protocolKit.createTransaction({transactions: [safeTransactionData]});
      const txResponse = await protocolKit.signTransaction(transaction);
      console.log("Enable module transaction signed:", txResponse);
      
      const executeTxResponse = await protocolKit.executeTransaction(transaction);
      const txHash = executeTxResponse.hash;
      console.log("Enable module transaction executed:", executeTxResponse);
      
      // Start tracking the enable module transaction
      if (txHash) {
        setEnableModuleTxHash(txHash as `0x${string}`);
      }

      
    } catch (err) {
      console.error("Error enabling module:", err);
      setEnableModuleMessage("Error enabling module: " + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setEnableModuleLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!ethereumAddress.trim()) {
      setLoadError('Please enter a Safe address')
      return
    }

    if (!account.address) {
      setLoadError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setLoadError(null)
    setSafeInfo(null)
    const provider = await account.connector?.getProvider()
    try {
      // Initialize the Protocol Kit with the existing Safe address
      const protocolKit = await Safe.init({
        provider: provider as Eip1193Provider,
        signer: account.address,
        safeAddress: ethereumAddress.trim()
      })

      // Check if the Safe is deployed
      const isDeployed = await protocolKit.isSafeDeployed()

      if (!isDeployed) {
        setLoadError('Safe not found at this address or not deployed')
        return
      }

      // Get Safe information
      const safeAddress = await protocolKit.getAddress()
      const owners = await protocolKit.getOwners()
      const threshold = await protocolKit.getThreshold()
      const modules = await protocolKit.getModules()

      setSafeInfo({
        address: safeAddress,
        owners,
        threshold,
        isDeployed,
        modules
      })

      console.log('Safe loaded successfully:', {
        address: safeAddress,
        owners,
        threshold,
        isDeployed
      })

    } catch (err) {
      console.error('Error loading Safe:', err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load Safe')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px 0'
    }}>
      {/* Main Container */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '8px'
          }}>
            Safe Recovery Module
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#64748b',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Secure Safe wallet recovery using ZKPassport identity verification
          </p>
        </div>

        {/* Main Grid Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: account.status === 'connected' && safeInfo ? '1fr 1fr' : '1fr',
          gap: '30px',
          alignItems: 'start'
        }}>
          {/* Left Column - Connection & Safe Loading */}
          <div>
            {/* Connection Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: account.status === 'connected' ? '#10b981' : '#ef4444'
                }}></div>
                Wallet Connection
              </h2>

              {account.status === 'connected' ? (
                <div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#ecfdf5',
                    borderRadius: '8px',
                    border: '1px solid #d1fae5',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: '0', color: '#065f46', fontWeight: '500' }}>
                      ✅ Connected to {account.addresses?.[0]?.slice(0, 6)}...{account.addresses?.[0]?.slice(-4)}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                      Chain ID: {account.chainId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => disconnect()}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #ef4444',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#64748b', marginBottom: '16px' }}>
                    Connect your wallet to get started
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {connectors.map((connector) => (
                      <button
                        key={connector.uid}
                        onClick={() => connect({ connector })}
                        type="button"
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                      >
                        Connect {connector.name}
                      </button>
                    ))}
                  </div>
                  {status && (
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>{status}</p>
                  )}
                  {error?.message && (
                    <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{error.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Safe Loading Card */}
            {account.status === 'connected' && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '16px'
                }}>
                  Load Safe Wallet
                </h2>
                <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
                  Enter your Safe wallet address to manage recovery settings
                </p>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <input
                    type="text"
                    value={ethereumAddress}
                    onChange={(e) => setEthereumAddress(e.target.value)}
                    placeholder="Enter Safe address (0x...)"
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      fontFamily: 'monospace'
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={handleLoad}
                    disabled={loading}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {loading ? 'Loading...' : 'Load Safe'}
                  </button>
                </div>

                {loadError && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '14px'
                  }}>
                    <strong>Error:</strong> {loadError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Safe Information & Actions */}
          {account.status === 'connected' && safeInfo && (
            <div>
              {/* Safe Information Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '20px'
                }}>
                  Safe Information
                </h2>

                {/* Safe Details */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Address:</span>
                    <p style={{ 
                      margin: '4px 0 0 0', 
                      fontFamily: 'monospace', 
                      fontSize: '14px',
                      color: '#1e293b',
                      wordBreak: 'break-all'
                    }}>
                      {safeInfo.address}
                    </p>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Status:</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#1e293b' }}>
                      {safeInfo.isDeployed ? '✅ Deployed' : '❌ Not Deployed'} • 
                      Threshold: {safeInfo.threshold}/{safeInfo.owners.length}
                    </p>
                  </div>
                </div>

                {/* Wallet Status */}
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${isConnectedAddressOwner() ? '#10b981' : '#ef4444'}`,
                  backgroundColor: isConnectedAddressOwner() ? '#ecfdf5' : '#fef2f2',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isConnectedAddressOwner() ? '#10b981' : '#ef4444'
                    }}></div>
                    <span style={{
                      fontWeight: '600',
                      color: isConnectedAddressOwner() ? '#065f46' : '#991b1b',
                      fontSize: '14px'
                    }}>
                      {isConnectedAddressOwner() ? 'SAFE OWNER' : 'NOT OWNER'}
                    </span>
                  </div>
                </div>

                {/* Owners List */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                    Owners ({safeInfo.owners.length})
                  </h3>
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {safeInfo.owners.map((owner, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px',
                          backgroundColor: account.address && owner.toLowerCase() === account.address.toLowerCase() ? '#f0f9ff' : '#f8fafc',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ color: '#64748b' }}>{index + 1}.</span>
                        <span style={{ flex: 1, color: '#1e293b' }}>{owner}</span>
                        {account.address && owner.toLowerCase() === account.address.toLowerCase() && (
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#10b981', 
                            fontWeight: '600',
                            fontFamily: 'system-ui'
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ZK Module Status */}
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#10b981' : '#ef4444'}`,
                  backgroundColor: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#ecfdf5' : '#fef2f2',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#10b981' : '#ef4444'
                    }}></div>
                    <span style={{
                      fontWeight: '600',
                      color: safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? '#065f46' : '#991b1b',
                      fontSize: '14px'
                    }}>
                      ZK Recovery Module: {safeInfo.modules.includes(ZK_MODULE_ADDRESS) ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>

                {/* Enable Module Button */}
                {!safeInfo.modules.includes(ZK_MODULE_ADDRESS) && (
                  <div style={{ marginBottom: '16px' }}>
                    {!isConnectedAddressOwner() && (
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: '#991b1b'
                      }}>
                        ⚠️ Only Safe owners can enable modules
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={handleEnableModule}
                      disabled={enableModuleLoading || isEnableModuleTxConfirming || !isConnectedAddressOwner()}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: enableModuleLoading || isEnableModuleTxConfirming || !isConnectedAddressOwner() ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        cursor: enableModuleLoading || isEnableModuleTxConfirming || !isConnectedAddressOwner() ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      {isEnableModuleTxConfirming ? 'Confirming Transaction...' :
                       enableModuleLoading ? 'Enabling Module...' : 'Enable ZK Recovery Module'}
                    </button>

                    {enableModuleMessage && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: enableModuleMessage.includes('Error') ? '#fef2f2' : '#f0f9ff',
                        border: `1px solid ${enableModuleMessage.includes('Error') ? '#fecaca' : '#bfdbfe'}`,
                        color: enableModuleMessage.includes('Error') ? '#991b1b' : '#1e40af',
                        fontSize: '12px'
                      }}>
                        {enableModuleMessage}
                      </div>
                    )}

                    {/* Enable Module Transaction Status Indicator */}
                    {(enableModuleTxHash && (isEnableModuleTxConfirming || isEnableModuleTxConfirmed)) && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: isEnableModuleTxConfirmed ? '#ecfdf5' : '#f0f9ff',
                        border: `1px solid ${isEnableModuleTxConfirmed ? '#d1fae5' : '#bfdbfe'}`,
                        color: isEnableModuleTxConfirmed ? '#065f46' : '#1e40af',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: isEnableModuleTxConfirmed ? '#10b981' : '#3b82f6',
                          opacity: !isEnableModuleTxConfirmed ? 0.7 : 1
                        }}></div>
                        <span>
                          {isEnableModuleTxConfirming && '🔄 Confirming module activation on network...'}
                          {isEnableModuleTxConfirmed && '✅ Module activation confirmed! Safe info will refresh shortly.'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Guardian Registration Card - Only show if ZK module is enabled */}
              {safeInfo.modules.includes(ZK_MODULE_ADDRESS) && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  marginBottom: '24px'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '8px'
                  }}>
                    Register Guardian
                  </h2>
                  <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
                    Verify your identity to register as a recovery guardian for this Safe
                  </p>
                  
                  {!isConnectedAddressOwner() && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      marginBottom: '16px',
                      color: '#991b1b'
                    }}>
                      <strong>⚠️ Access Denied:</strong> Only Safe owners can register guardians.
                      <br />
                      <small>Connect with an owner wallet address to continue.</small>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={createRequest}
                    disabled={requestInProgress || isGuardianTxConfirming || !isConnectedAddressOwner()}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: requestInProgress || isGuardianTxConfirming || !isConnectedAddressOwner() ? '#9ca3af' : '#10b981',
                      color: 'white',
                      cursor: requestInProgress || isGuardianTxConfirming || !isConnectedAddressOwner() ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '16px'
                    }}
                  >
                    {isGuardianTxConfirming ? 'Confirming Transaction...' :
                     requestInProgress ? 'Processing...' : 
                     !isConnectedAddressOwner() ? 'Owner Access Required' :
                     queryUrl ? 'Generate New Request' : 'Generate Verification Request'}
                  </button>

                  {queryUrl && (
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      textAlign: 'center',
                      marginBottom: '16px'
                    }}>
                      <p style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>
                        Scan with ZKPassport app:
                      </p>
                      <QRCode value={queryUrl} size={200} />
                    </div>
                  )}

                  {message && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: message.includes('Error') ? '#fef2f2' : '#f0f9ff',
                      border: `1px solid ${message.includes('Error') ? '#fecaca' : '#bfdbfe'}`,
                      color: message.includes('Error') ? '#991b1b' : '#1e40af',
                      fontSize: '14px',
                      marginBottom: '16px'
                    }}>
                      {message}
                    </div>
                  )}

                  {/* Guardian Transaction Status Indicator */}
                  {(guardianTxHash && (isGuardianTxConfirming || isGuardianTxConfirmed)) && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: isGuardianTxConfirmed ? '#ecfdf5' : '#f0f9ff',
                      border: `1px solid ${isGuardianTxConfirmed ? '#d1fae5' : '#bfdbfe'}`,
                      color: isGuardianTxConfirmed ? '#065f46' : '#1e40af',
                      fontSize: '14px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isGuardianTxConfirmed ? '#10b981' : '#3b82f6',
                        opacity: !isGuardianTxConfirmed ? 0.7 : 1
                      }}></div>
                      <span>
                        {isGuardianTxConfirming && '🔄 Confirming guardian registration on network...'}
                        {isGuardianTxConfirmed && '✅ Guardian registration confirmed! Safe info will refresh shortly.'}
                      </span>
                    </div>
                  )}

                  {uniqueIdentifier && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                        Unique Identifier:
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        fontFamily: 'monospace', 
                        color: '#64748b',
                        wordBreak: 'break-all',
                        backgroundColor: '#f8fafc',
                        padding: '8px',
                        borderRadius: '4px'
                      }}>
                        {uniqueIdentifier}
                      </p>
                    </div>
                  )}

                  {verified !== undefined && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: verified ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${verified ? '#d1fae5' : '#fecaca'}`,
                      color: verified ? '#065f46' : '#991b1b',
                      fontSize: '14px'
                    }}>
                      <strong>Verification Status:</strong> {verified ? "✅ Verified" : "❌ Failed"}
                    </div>
                  )}
                </div>
              )}

              {/* Recovery Section - Only show if ZK module is enabled AND a guardian has been registered for this Safe */}
              {safeInfo.modules.includes(ZK_MODULE_ADDRESS) && isSafeRegisteredForRecovery() && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '8px'
                  }}>
                    Safe Recovery
                  </h2>
                  <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
                    This Safe is registered for recovery. Verify your identity to recover access.
                  </p>
                  
                  {/* Recovery Status */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #10b981',
                    backgroundColor: '#ecfdf5',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981'
                      }}></div>
                      <span style={{
                        fontWeight: '600',
                        color: '#065f46',
                        fontSize: '14px'
                      }}>
                        Recovery Available
                      </span>
                    </div>
                    <p style={{ 
                      margin: '8px 0 0 0', 
                      fontSize: '12px', 
                      fontFamily: 'monospace', 
                      color: '#059669',
                      wordBreak: 'break-all'
                    }}>
                      ID: {recovererUniqueId}
                    </p>
                  </div>

                  {/* Recovery Form */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        Current Owner Address (to be replaced):
                      </label>
                      <input
                        type="text"
                        value={oldOwnerAddress}
                        onChange={(e) => setOldOwnerAddress(e.target.value)}
                        placeholder="Enter current owner address (0x...)"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) ? '#ef4444' : '#d1d5db'}`,
                          fontSize: '14px',
                          fontFamily: 'monospace',
                          backgroundColor: oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) ? '#fef2f2' : 'white',
                          color: '#000000'
                        }}
                        disabled={recoveryInProgress || isPending || isConfirming}
                      />
                      {oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress) && (
                        <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', margin: '4px 0 0 0' }}>
                          Invalid address format. Must be 42 characters starting with 0x.
                        </p>
                      )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '6px', 
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        New Owner Address (replacement):
                      </label>
                      <input
                        type="text"
                        value={newOwnerAddress}
                        onChange={(e) => setNewOwnerAddress(e.target.value)}
                        placeholder="Enter new owner address (0x...)"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) ? '#ef4444' : '#d1d5db'}`,
                          fontSize: '14px',
                          fontFamily: 'monospace',
                          backgroundColor: newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) ? '#fef2f2' : 'white',
                          color: '#000000'
                        }}
                        disabled={recoveryInProgress || isPending || isConfirming}
                      />
                      {newOwnerAddress && !isValidEthereumAddress(newOwnerAddress) && (
                        <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', margin: '4px 0 0 0' }}>
                          Invalid address format. Must be 42 characters starting with 0x.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecovery}
                    disabled={recoveryInProgress || isPending || isConfirming || readLoading || 
                             !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                             !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: recoveryInProgress || isPending || isConfirming || readLoading || 
                                       !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                                       !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) 
                                       ? '#9ca3af' : '#10b981',
                      color: 'white',
                      cursor: recoveryInProgress || isPending || isConfirming || readLoading || 
                              !oldOwnerAddress.trim() || !newOwnerAddress.trim() ||
                              !isValidEthereumAddress(oldOwnerAddress) || !isValidEthereumAddress(newOwnerAddress) 
                              ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '16px'
                    }}
                  >
                    {!oldOwnerAddress.trim() || !newOwnerAddress.trim() ? 'Enter Owner Addresses' :
                     (oldOwnerAddress && !isValidEthereumAddress(oldOwnerAddress)) || (newOwnerAddress && !isValidEthereumAddress(newOwnerAddress)) ? 'Invalid Address Format' :
                     isPending ? 'Sign Transaction in Wallet...' :
                     isConfirming ? 'Confirming Transaction...' :
                     recoveryInProgress ? 'Processing Recovery...' : 
                     readLoading ? 'Loading...' : 
                     recoveryQueryUrl ? 'Generate New Recovery Request' : 'Start Recovery Process'}
                  </button>

                  {/* Recovery QR Code */}
                  {recoveryQueryUrl && (
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      textAlign: 'center',
                      marginBottom: '16px'
                    }}>
                      <p style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>
                        Scan with ZKPassport app to verify your identity for recovery:
                      </p>
                      <QRCode value={recoveryQueryUrl} size={200} />
                    </div>
                  )}

                  {/* Recovery Messages */}
                  {recoveryMessage && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#fef2f2' : '#f0f9ff',
                      border: `1px solid ${recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#fecaca' : '#bfdbfe'}`,
                      color: recoveryMessage.includes('Error') || recoveryMessage.includes('failed') ? '#991b1b' : '#1e40af',
                      fontSize: '14px',
                      marginBottom: '16px'
                    }}>
                      {recoveryMessage}
                    </div>
                  )}

                  {/* Transaction Status Indicator */}
                  {(isPending || isConfirming || isConfirmed) && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: isConfirmed ? '#ecfdf5' : '#f0f9ff',
                      border: `1px solid ${isConfirmed ? '#d1fae5' : '#bfdbfe'}`,
                      color: isConfirmed ? '#065f46' : '#1e40af',
                      fontSize: '14px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isConfirmed ? '#10b981' : isPending ? '#f59e0b' : '#3b82f6',
                        opacity: !isConfirmed ? 0.7 : 1
                      }}></div>
                      <span>
                        {isPending && '⏳ Waiting for wallet signature...'}
                        {isConfirming && '🔄 Confirming transaction on network...'}
                        {isConfirmed && '✅ Transaction confirmed! Safe info will refresh shortly.'}
                      </span>
                    </div>
                  )}

                  {/* Recovery Results */}
                  {recoveryUniqueIdentifier && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                        Recovery Unique Identifier:
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        fontFamily: 'monospace', 
                        color: '#64748b',
                        wordBreak: 'break-all',
                        backgroundColor: '#f8fafc',
                        padding: '8px',
                        borderRadius: '4px'
                      }}>
                        {recoveryUniqueIdentifier}
                      </p>
                    </div>
                  )}

                  {recoveryVerified !== undefined && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: recoveryVerified ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${recoveryVerified ? '#d1fae5' : '#fecaca'}`,
                      color: recoveryVerified ? '#065f46' : '#991b1b',
                      fontSize: '14px'
                    }}>
                      <strong>Recovery Verification Status:</strong> {recoveryVerified ? "✅ Verified" : "❌ Failed"}
                    </div>
                  )}
                </div>
              )}

              {/* Info message when module is enabled but no guardian is registered */}
              {safeInfo.modules.includes(ZK_MODULE_ADDRESS) && !isSafeRegisteredForRecovery() && !readLoading && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f3f4f6'
                }}>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '24px',
                      marginBottom: '8px'
                    }}>
                      🛡️
                    </div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1e40af',
                      marginBottom: '8px',
                      margin: '0 0 8px 0'
                    }}>
                      No Recovery Guardian Set
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#1e40af',
                      marginBottom: '12px',
                      margin: '0 0 12px 0'
                    }}>
                      Register a guardian above to enable Safe recovery functionality.
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: '#64748b',
                      margin: '0'
                    }}>
                      Once registered, you'll be able to recover access to this Safe using ZK identity verification.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
