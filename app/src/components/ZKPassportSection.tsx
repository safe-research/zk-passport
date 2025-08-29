'use client'

import { useEffect, useState } from 'react'
import { useZKPassportFlow } from '../hooks/useZKPassportFlow'
import { ZK_MODULE_ADDRESS } from '../utils/constants'
import FlowStepIndicator from './FlowStepIndicator'
import ModuleSetupStep from './ModuleSetupStep'
import GuardianRegistrationStep from './GuardianRegistrationStep'
import RecoveryStep from './RecoveryStep'
import styles from './ZKPassportSection.module.css'

interface ZKPassportSectionProps {
  account: any
  safeInfo: {
    address: string
    owners: string[]
    threshold: number
    isDeployed: boolean
    modules: string[]
  } | null
  safeAddress: string
  recovererUniqueId: any
  readError: boolean
  readLoading: boolean
  refetchRecoverer?: () => void
  isConnectedAddressOwner: () => boolean
  isSafeRegisteredForRecovery: () => boolean
  isConnectedToSepolia: () => boolean
  handleLoad: () => void
  onModuleAddressChange?: (address: string) => void
}

function ZKPassportSection({
  account,
  safeInfo,
  safeAddress,
  recovererUniqueId,
  readLoading,
  isConnectedAddressOwner,
  isSafeRegisteredForRecovery,
  isConnectedToSepolia,
  refetchRecoverer,
  handleLoad,
  onModuleAddressChange
}: ZKPassportSectionProps) {
  // ZKPassport app setup verification
  const [hasZKPassportApp, setHasZKPassportApp] = useState(false)
  // Custom module address
  const [customModuleAddress, setCustomModuleAddress] = useState(ZK_MODULE_ADDRESS)
  // Prevent hydration errors
  const [mounted, setMounted] = useState(false)

  // ZK Passport flow hook
  const {
    guardianState,
    createGuardianRegistration,
    recoveryState,
    createRecoveryRequest,
    updateRecoveryAddresses,
    isPending,
    isConfirming,
    isConfirmed,
    hash
  } = useZKPassportFlow({
    safeInfo,
    safeAddress,
    account,
    customModuleAddress,
    handleLoad
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!safeInfo || !mounted) {
    return (
      <section className={styles.zkpassportSection}>
        <div className={styles.zkpassportContainer}>
          <h2 className={styles.zkpassportTitle}>ZK-Passport</h2>
          <p className={styles.zkpassportDescription}>Loading...</p>
        </div>
      </section>
    )
  }

  const isModuleEnabled = safeInfo.modules.includes(customModuleAddress)
  const isRegisteredForRecovery = isSafeRegisteredForRecovery()

  // Calculate flow steps
  const flowSteps: Array<{
    id: string
    title: string
    description: string
    status: 'pending' | 'current' | 'completed' | 'disabled'
  }> = [
    {
      id: 'setup',
      title: 'Module Setup',
      description: 'Enable ZK Recovery Module',
      status: isModuleEnabled ? 'completed' : (hasZKPassportApp && isConnectedToSepolia() && isConnectedAddressOwner()) ? 'current' : 'disabled'
    },
    {
      id: 'guardian',
      title: 'Guardian Registration',
      description: 'Register identity as guardian',
      status: isRegisteredForRecovery ? 'completed' : isModuleEnabled ? 'current' : 'pending'
    },
    {
      id: 'recovery',
      title: 'Recovery Ready',
      description: 'Safe recovery available',
      status: isRegisteredForRecovery ? 'completed' : isModuleEnabled ? 'pending' : 'disabled'
    }
  ]

  return (
    <section className={styles.zkpassportSection} suppressHydrationWarning>
      <div className={styles.zkpassportContainer} suppressHydrationWarning>
        <h2 className={styles.zkpassportTitle}>ZK-Passport Recovery System</h2>
        <p className={styles.zkpassportDescription}>
          Secure identity verification and recovery using Zero-Knowledge proofs
        </p>

        {/* Flow Progress Indicator */}
        <FlowStepIndicator steps={flowSteps} />

        {/* ZKPassport App Setup Verification */}
        <div className={styles.zkpassportCard}>
          <h3 className={styles.zkpassportCardTitle}>
            📱 Prerequisites: ZKPassport App Setup
          </h3>
          <p className={styles.zkpassportCardDescription}>
            Before proceeding, ensure you have the ZKPassport mobile app installed and your identity loaded.
          </p>
          
          <div className={styles.zkpassportInfoCard}>
            <div className={styles.zkpassportInfoContent}>
              <p className={styles.zkpassportCardDescription}>
                1. Download the ZKPassport app from{' '}
                <a 
                  href="https://zkpassport.id/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: '500' }}
                >
                  zkpassport.id
                </a>
              </p>
              <p className={styles.zkpassportCardDescription}>
                2. Scan your ID document to load your identity
              </p>
              <p className={styles.zkpassportCardDescription}>
                3. Verify the app is working by generating a test proof
              </p>
            </div>
            
            <div className={styles.zkpassportInputGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasZKPassportApp}
                  onChange={(e) => setHasZKPassportApp(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                />
                <span className={styles.zkpassportCardDescription} style={{ margin: 0 }}>
                  ✅ I have set up the ZKPassport app and loaded my identity
                </span>
              </label>
            </div>

            {!hasZKPassportApp && (
              <div className={styles.zkpassportError}>
                <strong>⚠️ Setup Required:</strong> Complete the ZKPassport app setup before proceeding.
              </div>
            )}
          </div>
        </div>

        {/* Step 1: Module Setup */}
        <ModuleSetupStep
          safeInfo={safeInfo}
          customModuleAddress={customModuleAddress}
          setCustomModuleAddress={setCustomModuleAddress}
          isConnectedAddressOwner={isConnectedAddressOwner}
          isConnectedToSepolia={isConnectedToSepolia}
          onModuleAddressChange={onModuleAddressChange}
        />

        {/* Step 2: Guardian Registration */}
        <GuardianRegistrationStep
          isModuleEnabled={isModuleEnabled}
          isConnectedAddressOwner={isConnectedAddressOwner}
          isConnectedToSepolia={isConnectedToSepolia}
          hasZKPassportApp={hasZKPassportApp}
          guardianState={guardianState}
          onCreateGuardian={createGuardianRegistration}
        />

        {/* Step 3: Recovery */}
        <RecoveryStep
          isModuleEnabled={isModuleEnabled}
          isSafeRegisteredForRecovery={isSafeRegisteredForRecovery}
          recovererUniqueId={recovererUniqueId}
          readLoading={readLoading}
          isConnectedToSepolia={isConnectedToSepolia}
          hasZKPassportApp={hasZKPassportApp}
          recoveryState={recoveryState}
          onUpdateAddresses={updateRecoveryAddresses}
          onCreateRecovery={createRecoveryRequest}
          isPending={isPending}
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
          hash={hash}
        />
      </div>
    </section>
  )
}

export default ZKPassportSection