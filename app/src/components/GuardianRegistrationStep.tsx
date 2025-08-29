'use client'

import QRCode from "react-qr-code"
import styles from './ZKPassportSection.module.css'

interface GuardianRegistrationStepProps {
  isModuleEnabled: boolean
  isConnectedAddressOwner: () => boolean
  isConnectedToSepolia: () => boolean
  hasZKPassportApp: boolean
  guardianState: {
    queryUrl: string
    uniqueIdentifier: string
    verified: boolean | undefined
    inProgress: boolean
  }
  onCreateGuardian: () => void
}

function GuardianRegistrationStep({
  isModuleEnabled,
  isConnectedAddressOwner,
  isConnectedToSepolia,
  hasZKPassportApp,
  guardianState,
  onCreateGuardian
}: GuardianRegistrationStepProps) {
  const canRegisterGuardian = isModuleEnabled && 
                              isConnectedAddressOwner() && 
                              isConnectedToSepolia() && 
                              hasZKPassportApp

  if (!isModuleEnabled) {
    return (
      <div className={styles.zkpassportCard}>
        <h3 className={styles.zkpassportCardTitle}>
          🛡️ Step 2: Guardian Registration
        </h3>
        <div className={styles.zkpassportInfoCard}>
          <div className={styles.zkpassportInfoContent}>
            <div className={styles.zkpassportInfoIcon}>⏳</div>
            <h4 className={styles.zkpassportInfoTitle}>Waiting for Module</h4>
            <p className={styles.zkpassportInfoDescription}>
              Please enable the ZK Recovery Module first to proceed with guardian registration.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.zkpassportCard}>
      <h3 className={styles.zkpassportCardTitle}>
        🛡️ Step 2: Guardian Registration
      </h3>
      <p className={styles.zkpassportCardDescription}>
        Verify your identity to register as a recovery guardian for this Safe.
      </p>
      
      {/* Prerequisites Check */}
      {!isConnectedAddressOwner() && (
        <div className={styles.zkpassportError}>
          <strong>⚠️ Access Denied:</strong> Only Safe owners can register guardians.
          <br />
          <small>Connect with an owner wallet address to continue.</small>
        </div>
      )}

      {!isConnectedToSepolia() && (
        <div className={styles.zkpassportError}>
          <strong>⚠️ Wrong Network:</strong> ZK-Passport requires Sepolia Testnet.
          <br />
          <small>Please switch to Sepolia (Chain ID: 11155111) to continue.</small>
        </div>
      )}

      {!hasZKPassportApp && (
        <div className={styles.zkpassportError}>
          <strong>⚠️ App Setup Required:</strong> Please complete the ZKPassport app setup first.
          <br />
          <small>Download the app and load your identity before proceeding.</small>
        </div>
      )}
      
      {/* Registration Button */}
      <button
        type="button"
        onClick={onCreateGuardian}
        disabled={guardianState.inProgress || !canRegisterGuardian}
        className={`${styles.zkpassportButton} ${
          guardianState.inProgress
            ? styles.zkpassportButtonLoading
            : !canRegisterGuardian
            ? styles.zkpassportButtonError
            : styles.zkpassportButtonPrimary
        }`}
      >
        {!hasZKPassportApp ? 'Complete App Setup First' :
         !isConnectedToSepolia() ? 'Wrong Network' :
         guardianState.inProgress ? 'Processing...' : 
         !isConnectedAddressOwner() ? 'Owner Access Required' :
         guardianState.queryUrl ? 'Generate New Request' : 'Generate Verification Request'}
      </button>

      {/* QR Code Display */}
      {guardianState.queryUrl && (
        <div className={styles.zkpassportQrContainer}>
          <p className={styles.zkpassportQrText}>Scan with ZKPassport app:</p>
          <QRCode value={guardianState.queryUrl} size={200} />
          <p className={styles.zkpassportCardDescription} style={{ marginTop: '12px' }}>
            Use your ZKPassport mobile app to scan this QR code and complete identity verification.
          </p>
        </div>
      )}

      {/* Results Display */}
      {guardianState.uniqueIdentifier && (
        <div className={styles.zkpassportIdentifier}>
          <p className={styles.zkpassportIdentifierLabel}>Guardian ID:</p>
          <p className={styles.zkpassportIdentifierValue}>{guardianState.uniqueIdentifier}</p>
        </div>
      )}

      {guardianState.verified !== undefined && (
        <div className={`${styles.zkpassportMessage} ${guardianState.verified ? styles.zkpassportStatusSuccess : styles.zkpassportMessageError}`}>
          <strong>Registration Status:</strong> {guardianState.verified ? '✅ Guardian Registered Successfully' : '❌ Registration Failed'}
        </div>
      )}
    </div>
  )
}

export default GuardianRegistrationStep
