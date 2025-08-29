'use client'

import { useState } from 'react'
import { useWriteContract } from 'wagmi'
import { isValidEthereumAddress } from '../utils/safeHelpers'
import { ZK_MODULE_ADDRESS } from '../utils/constants'
import styles from './ZKPassportSection.module.css'

interface ModuleSetupStepProps {
  safeInfo: {
    address: string
    owners: string[]
    threshold: number
    isDeployed: boolean
    modules: string[]
  }
  customModuleAddress: string
  setCustomModuleAddress: (address: string) => void
  isConnectedAddressOwner: () => boolean
  isConnectedToSepolia: () => boolean
  onModuleAddressChange?: (address: string) => void
}

function ModuleSetupStep({
  safeInfo,
  customModuleAddress,
  setCustomModuleAddress,
  isConnectedAddressOwner,
  isConnectedToSepolia,
  onModuleAddressChange
}: ModuleSetupStepProps) {
  const { writeContract } = useWriteContract()
  const [enableModuleLoading, setEnableModuleLoading] = useState(false)
  const [enableModuleMessage, setEnableModuleMessage] = useState('')

  const isModuleEnabled = safeInfo.modules.includes(customModuleAddress)

  const handleEnableModule = async () => {
    if (!safeInfo) {
      setEnableModuleMessage("Error: Safe not loaded")
      return
    }

    setEnableModuleLoading(true)
    setEnableModuleMessage("")

    try {
      await writeContract({
        address: safeInfo.address,
        abi: [
          {
            "inputs": [{ "internalType": "address", "name": "module", "type": "address" }],
            "name": "enableModule",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'enableModule',
        args: [customModuleAddress],
        gas: 1000000n,
      })

      setEnableModuleMessage("Module enablement transaction submitted")
    } catch (err) {
      console.error("Error enabling module:", err)
      setEnableModuleMessage("Error enabling module: " + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setEnableModuleLoading(false)
    }
  }

  const handleAddressChange = (newAddress: string) => {
    setCustomModuleAddress(newAddress)
    if (isValidEthereumAddress(newAddress) && onModuleAddressChange) {
      onModuleAddressChange(newAddress)
    }
  }

  return (
    <div className={styles.zkpassportCard}>
      <h3 className={styles.zkpassportCardTitle}>
        🛠️ Step 1: Module Configuration
      </h3>
      
      {/* Module Status */}
      <div className={`${styles.zkpassportStatus} ${isModuleEnabled ? styles.zkpassportStatusSuccess : styles.zkpassportStatusDisabled}`}>
        <div className={styles.zkpassportStatusIndicator}></div>
        <span>
          ZK Recovery Module: {isModuleEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}
        </span>
      </div>

      {/* Module Address Configuration */}
      <div className={styles.zkpassportInputGroup}>
        <label className={styles.zkpassportInputLabel}>ZK Recovery Module Address:</label>
        <input
          type="text"
          value={customModuleAddress}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder="Enter module address (0x...)"
          className={`${styles.zkpassportInput} ${customModuleAddress && !isValidEthereumAddress(customModuleAddress) ? styles.zkpassportInputInvalid : ''}`}
        />
        {customModuleAddress && !isValidEthereumAddress(customModuleAddress) && (
          <p className={styles.zkpassportInputError}>Invalid address format. Must be 42 characters starting with 0x.</p>
        )}
        <p className={styles.zkpassportCardDescription} style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
          Default: {ZK_MODULE_ADDRESS}
          {customModuleAddress !== ZK_MODULE_ADDRESS && (
            <button
              type="button"
              onClick={() => handleAddressChange(ZK_MODULE_ADDRESS)}
              style={{ 
                marginLeft: '12px', 
                padding: '4px 8px', 
                fontSize: '11px', 
                background: '#f3f4f6', 
                border: '1px solid #d1d5db', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              Reset to Default
            </button>
          )}
        </p>
      </div>

      {/* Enable Module Section - Only show if module is NOT enabled */}
      {!isModuleEnabled && (
        <>
          <p className={styles.zkpassportCardDescription}>
            Enable the ZK Recovery Module on your Safe to proceed with guardian registration and recovery features.
          </p>
          
          {!isConnectedAddressOwner() && (
            <div className={styles.zkpassportError}>
              <strong>⚠️ Access Denied:</strong> Only Safe owners can enable modules.
              <br />
              <small>Connect with an owner wallet address to continue.</small>
            </div>
          )}

          {!isConnectedToSepolia() && (
            <div className={styles.zkpassportError}>
              <strong>⚠️ Wrong Network:</strong> Module enablement requires Sepolia Testnet.
              <br />
              <small>Please switch to Sepolia (Chain ID: 11155111) to continue.</small>
            </div>
          )}
          
          <button
            type="button"
            onClick={handleEnableModule}
            disabled={enableModuleLoading || !isConnectedAddressOwner() || !isConnectedToSepolia()}
            className={`${styles.zkpassportButton} ${
              enableModuleLoading
                ? styles.zkpassportButtonLoading
                : !isConnectedToSepolia() || !isConnectedAddressOwner()
                ? styles.zkpassportButtonError 
                : styles.zkpassportButtonPrimary
            }`}
          >
            {!isConnectedToSepolia() ? 'Wrong Network' :
             enableModuleLoading ? 'Enabling Module...' : 
             !isConnectedAddressOwner() ? 'Owner Access Required' : 'Enable ZK Recovery Module'}
          </button>

          {enableModuleMessage && (
            <div className={`${styles.zkpassportMessage} ${enableModuleMessage.includes('Error') ? styles.zkpassportMessageError : styles.zkpassportMessageInfo}`}>
              {enableModuleMessage}
            </div>
          )}
        </>
      )}

      {/* Success message when module is enabled */}
      {isModuleEnabled && (
        <div className={styles.zkpassportInfoCard}>
          <div className={styles.zkpassportInfoContent}>
            <div className={styles.zkpassportInfoIcon}>✅</div>
            <h4 className={styles.zkpassportInfoTitle}>Module Enabled Successfully</h4>
            <p className={styles.zkpassportInfoDescription}>
              The ZK Recovery Module is now enabled on your Safe. You can proceed to guardian registration.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModuleSetupStep
