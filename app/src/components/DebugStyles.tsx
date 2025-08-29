'use client'

// Debug component to ensure styles are working
function DebugStyles() {
  const debugStyle = {
    position: 'fixed' as const,
    top: '10px',
    right: '10px',
    background: '#ff0000',
    color: '#ffffff',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 9999,
    border: '2px solid #ffffff'
  }

  return (
    <div style={debugStyle}>
      CSS WORKING ✓
    </div>
  )
}

export default DebugStyles
