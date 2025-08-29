'use client'

import QRCode from "react-qr-code"
import { isValidEthereumAddress } from '../utils/safeHelpers'
import styles from './ZKPassportSection.module.css'

interface RecoveryStepProps {
  isModuleEnabled: boolean
  isSafeRegisteredForRecovery: () => boolean
  recovererUniqueId: any
  readLoading: boolean
  isConnectedToSepolia: () => boolean
  hasZKPassportApp: boolean
  recoveryState: {
    message: string
    queryUrl: string
    uniqueIdentifier: string
    verified: boolean | undefined
    inProgress: boolean
    oldOwnerAddress: string
    newOwnerAddress: string
  }
  onUpdateAddresses: (oldOwner: string, newOwner: string) => void
  onCreateRecovery: () => void
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  hash: string | undefined
}

function RecoveryStep({
  isModuleEnabled,
  isSafeRegisteredForRecovery,
  recovererUniqueId,
  readLoading,
  isConnectedToSepolia,
  hasZKPassportApp,
  recoveryState,
  onUpdateAddresses,
  onCreateRecovery,
  isPending,
  isConfirming,
  isConfirmed,
  hash
}: RecoveryStepProps) {
  if (!isModuleEnabled) {
    return (
      <div className={styles.zkpassportCard}>
        <h3 className={styles.zkpassportCardTitle}>
          🔄 Step 3: Safe Recovery
        </h3>
        <div className={styles.zkpassportInfoCard}>
          <div className={styles.zkpassportInfoContent}>
            <div className={styles.zkpassportInfoIcon}>⏳</div>
            <h4 className={styles.zkpassportInfoTitle}>Waiting for Module</h4>
            <p className={styles.zkpassportInfoDescription}>
              Please enable the ZK Recovery Module and register a guardian first.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isSafeRegisteredForRecovery()) {
    return (
      <div className={styles.zkpassportCard}>
        <h3 className={styles.zkpassportCardTitle}>
          🔄 Step 3: Safe Recovery
        </h3>
        <div className={styles.zkpassportInfoCard}>
          <div className={styles.zkpassportInfoContent}>
            <div className={styles.zkpassportInfoIcon}>🛡️</div>
            <h4 className={styles.zkpassportInfoTitle}>No Recovery Guardian Set</h4>
            <p className={styles.zkpassportInfoDescription}>
              Register a guardian above to enable Safe recovery functionality.
            </p>
            <p className={styles.zkpassportInfoNote}>
              Once registered, you'll be able to recover access to this Safe using ZK identity verification.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const canRecover = isConnectedToSepolia() && 
                    hasZKPassportApp && 
                    recoveryState.oldOwnerAddress.trim() && 
                    recoveryState.newOwnerAddress.trim() &&
                    isValidEthereumAddress(recoveryState.oldOwnerAddress) && 
                    isValidEthereumAddress(recoveryState.newOwnerAddress)

  return (
    <div className={styles.zkpassportCard}>
      <h3 className={styles.zkpassportCardTitle}>
        🔄 Step 3: Safe Recovery
      </h3>
      <p className={styles.zkpassportCardDescription}>
        This Safe is registered for recovery. Verify your identity to recover access by replacing an owner.
      </p>

      {/* Recovery Status */}
      <div className={styles.zkpassportRecoveryStatus}>
        <div className={styles.zkpassportRecoveryStatusHeader}>
          <div className={styles.zkpassportRecoveryStatusDot}></div>
          <span className={styles.zkpassportRecoveryStatusLabel}>Recovery Available</span>
        </div>
        <p className={styles.zkpassportRecoveryStatusId}>Guardian ID: {recovererUniqueId}</p>
      </div>

      {/* Prerequisites Check */}
      {!hasZKPassportApp && (
        <div className={styles.zkpassportError}>
          <strong>⚠️ App Setup Required:</strong> Please complete the ZKPassport app setup first.
          <br />
          <small>Download the app and load your identity before starting recovery.</small>
        </div>
      )}

      {!isConnectedToSepolia() && (
        <div className={styles.zkpassportError}>
          <strong>⚠️ Wrong Network:</strong> Recovery requires Sepolia Testnet.
          <br />
          <small>Please switch to Sepolia (Chain ID: 11155111) to continue.</small>
        </div>
      )}

      {/* Recovery Form */}
      <div className={styles.zkpassportInputGroup}>
        <div className={styles.zkpassportInputGroup}>
          <label className={styles.zkpassportInputLabel}>Current Owner Address (to be replaced):</label>
          <input
            type="text"
            value={recoveryState.oldOwnerAddress}
            onChange={(e) => onUpdateAddresses(e.target.value, recoveryState.newOwnerAddress)}
            placeholder="Enter current owner address (0x...)"
            className={`${styles.zkpassportInput} ${recoveryState.oldOwnerAddress && !isValidEthereumAddress(recoveryState.oldOwnerAddress) ? styles.zkpassportInputInvalid : ''}`}
            disabled={recoveryState.inProgress || isPending || isConfirming}
          />
          {recoveryState.oldOwnerAddress && !isValidEthereumAddress(recoveryState.oldOwnerAddress) && (
            <p className={styles.zkpassportInputError}>Invalid address format. Must be 42 characters starting with 0x.</p>
          )}
        </div>

        <div className={styles.zkpassportInputGroup}>
          <label className={styles.zkpassportInputLabel}>New Owner Address (replacement):</label>
          <input
            type="text"
            value={recoveryState.newOwnerAddress}
            onChange={(e) => onUpdateAddresses(recoveryState.oldOwnerAddress, e.target.value)}
            placeholder="Enter new owner address (0x...)"
            className={`${styles.zkpassportInput} ${recoveryState.newOwnerAddress && !isValidEthereumAddress(recoveryState.newOwnerAddress) ? styles.zkpassportInputInvalid : ''}`}
            disabled={recoveryState.inProgress || isPending || isConfirming}
          />
          {recoveryState.newOwnerAddress && !isValidEthereumAddress(recoveryState.newOwnerAddress) && (
            <p className={styles.zkpassportInputError}>Invalid address format. Must be 42 characters starting with 0x.</p>
          )}
        </div>
      </div>

      {/* Recovery Button */}
      <button
        type="button"
        onClick={onCreateRecovery}
        disabled={recoveryState.inProgress || isPending || isConfirming || readLoading || !canRecover}
        className={`${styles.zkpassportButton} ${
          recoveryState.inProgress || isPending || isConfirming
            ? styles.zkpassportButtonLoading
            : (readLoading || !canRecover)
            ? styles.zkpassportButtonDisabled
            : styles.zkpassportButtonPrimary
        }`}
      >
        {!hasZKPassportApp ? 'Complete App Setup First' :
         !isConnectedToSepolia() ? 'Wrong Network' :
         !recoveryState.oldOwnerAddress.trim() || !recoveryState.newOwnerAddress.trim() ? 'Enter Owner Addresses' :
         !isValidEthereumAddress(recoveryState.oldOwnerAddress) || !isValidEthereumAddress(recoveryState.newOwnerAddress) ? 'Invalid Address Format' :
         isPending ? 'Sign Transaction in Wallet...' :
         isConfirming ? 'Confirming Transaction...' :
         recoveryState.inProgress ? 'Processing Recovery...' : 
         readLoading ? 'Loading...' : 
         recoveryState.queryUrl ? 'Generate New Recovery Request' : 'Start Recovery Process'}
      </button>

      {/* Recovery QR Code */}
      {recoveryState.queryUrl && (
        <div className={styles.zkpassportQrContainer}>
          <p className={styles.zkpassportQrText}>Scan with ZKPassport app to verify your identity for recovery:</p>
          <QRCode value={recoveryState.queryUrl} size={200} />
          <p className={styles.zkpassportCardDescription} style={{ marginTop: '12px' }}>
            This will initiate the recovery process to replace {recoveryState.oldOwnerAddress.slice(0, 6)}...{recoveryState.oldOwnerAddress.slice(-4)} with {recoveryState.newOwnerAddress.slice(0, 6)}...{recoveryState.newOwnerAddress.slice(-4)}.
          </p>
        </div>
      )}

      {/* Recovery Messages */}
      {recoveryState.message && (
        <div className={`${styles.zkpassportMessage} ${(recoveryState.message.includes('Error') || recoveryState.message.includes('failed')) ? styles.zkpassportMessageError : styles.zkpassportMessageInfo}`}>
          {recoveryState.message}
        </div>
      )}

      {/* Transaction Status */}
      {(isPending || isConfirming || isConfirmed) && (
        <div className={`${styles.zkpassportStatus} ${isConfirmed ? styles.zkpassportStatusSuccess : styles.zkpassportStatusPending}`}>
          <div className={styles.zkpassportStatusIndicator}></div>
          <span>
            {isPending && '⏳ Waiting for wallet signature...'}
            {isConfirming && '🔄 Confirming transaction on network... ' + hash}
            {isConfirmed && '✅ Transaction confirmed! Safe info will refresh shortly.'}
          </span>
        </div>
      )}

      {/* Recovery Results */}
      {recoveryState.uniqueIdentifier && (
        <div className={styles.zkpassportIdentifier}>
          <p className={styles.zkpassportIdentifierLabel}>Recovery ID:</p>
          <p className={styles.zkpassportIdentifierValue}>{recoveryState.uniqueIdentifier}</p>
        </div>
      )}

      {recoveryState.verified !== undefined && (
        <div className={`${styles.zkpassportMessage} ${recoveryState.verified ? styles.zkpassportStatusSuccess : styles.zkpassportMessageError}`}>
          <strong>Recovery Status:</strong> {recoveryState.verified ? '✅ Recovery Completed Successfully' : '❌ Recovery Failed'}
        </div>
      )}
    </div>
  )
}

export default RecoveryStep
