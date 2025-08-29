'use client'

import styles from './ZKPassportSection.module.css'

interface FlowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'current' | 'completed' | 'disabled'
}

interface FlowStepIndicatorProps {
  steps: FlowStep[]
}

function FlowStepIndicator({ steps }: FlowStepIndicatorProps) {
  return (
    <div className={styles.flowStepIndicator}>
      <h3 className={styles.flowTitle}>Recovery Setup Progress</h3>
      <div className={styles.flowSteps}>
        {steps.map((step, index) => (
          <div key={step.id} className={styles.flowStep}>
            <div className={`${styles.flowStepCircle} ${styles[`flowStepCircle${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`]}`}>
              {step.status === 'completed' ? '✓' : index + 1}
            </div>
            <div className={styles.flowStepContent}>
              <h4 className={`${styles.flowStepTitle} ${styles[`flowStepTitle${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`]}`}>
                {step.title}
              </h4>
              <p className={`${styles.flowStepDescription} ${styles[`flowStepDescription${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`]}`}>
                {step.description}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={`${styles.flowStepConnector} ${step.status === 'completed' ? styles.flowStepConnectorCompleted : ''}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FlowStepIndicator
