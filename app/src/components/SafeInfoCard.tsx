'use client'

import styles from '../app/page.module.css'

interface SafeInfoCardProps {
  account: any
  safeInfo: {
    address: string
    owners: string[]
    threshold: number
    isDeployed: boolean
    modules: string[]
  }
  isOwner: boolean
}

function SafeInfoCard({ account, safeInfo, isOwner }: SafeInfoCardProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Safe Information</h2>

      {/* Safe Details */}
      <div className={styles.safeDetails}>
        <div className={styles.safeDetailItem}>
          <span className={styles.safeDetailLabel}>Address:</span>
          <p className={styles.safeDetailValue}>{safeInfo.address}</p>
        </div>
        <div className={styles.safeDetailItem}>
          <span className={styles.safeDetailLabel}>Status:</span>
          <p className={styles.safeDetailValue}>
            {safeInfo.isDeployed ? '✅ Deployed' : '❌ Not Deployed'} •
            Threshold: {safeInfo.threshold}/{safeInfo.owners.length}
          </p>
        </div>
      </div>

      {/* Wallet Status */}
      <div className={`${styles.ownerStatus} ${isOwner ? styles.ownerStatusOwner : styles.ownerStatusNotOwner}`}>
        <div className={isOwner ? styles.statusDotGreen : styles.statusDotRed}></div>
        <span className={`${styles.ownerStatusText} ${isOwner ? styles.ownerStatusTextOwner : styles.ownerStatusTextNotOwner}`}>
          {isOwner ? 'SAFE OWNER' : 'NOT OWNER'}
        </span>
      </div>

      {/* Owners List */}
      <div className={styles.ownersSection}>
        <h3 className={styles.ownersTitle}>Owners ({safeInfo.owners.length})</h3>
        <div className={styles.ownersList}>
          {safeInfo.owners.map((owner, index) => (
            <div
              key={index}
              className={`${styles.ownerItem} ${
                account.address && owner.toLowerCase() === account.address.toLowerCase() 
                  ? styles.ownerItemCurrent 
                  : styles.ownerItemDefault
              }`}
            >
              <span className={styles.ownerIndex}>{index + 1}.</span>
              <span className={styles.ownerAddress}>{owner}</span>
              {account.address && owner.toLowerCase() === account.address.toLowerCase() && (
                <span className={styles.ownerYouBadge}>YOU</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SafeInfoCard
