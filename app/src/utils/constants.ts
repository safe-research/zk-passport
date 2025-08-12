export const ZK_MODULE_ADDRESS = '0xc0853a734dd6e8b3e1e4D8cD36D9A8bCe8e1Abd2'
export const VERIFIER_ADDRESS = '0x0000000000000000000000000000000000000000'
export const WITNESS_ADDRESS = '0x0000000000000000000000000000000000000001'
export const ZK_MODULE_ABI = [
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
    "inputs": [],
    "name": "InvalidProof",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OwnerSwapFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProofAlreadyUsed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SafeNotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "safeAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "recoverer",
        "type": "address"
      }
    ],
    "name": "OwnerRecovered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "safeAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "uniqueIdentifier",
        "type": "bytes32"
      }
    ],
    "name": "SafeRegistered",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "getBoundDataBytes",
    "outputs": [
      {
        "internalType": "address",
        "name": "senderAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "chainId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "customData",
        "type": "bytes"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "safeAddress",
        "type": "address"
      }
    ],
    "name": "getRecoveryIdentifier",
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
    "inputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "isProofUsed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "safeAddress",
        "type": "address"
      }
    ],
    "name": "isRegistered",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
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
      }
    ],
    "name": "register",
    "outputs": [],
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