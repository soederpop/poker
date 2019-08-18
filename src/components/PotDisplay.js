import React from 'react'
import types from 'prop-types'
import BLUE_CHIP_IMAGE from 'assets/blue-chip.png'
import RED_CHIP_IMAGE from 'assets/red-chip.png'

export function PotDisplay({ game, height, width } = {}) {
  const { pot, isPotOpen, isActionClosed, potOdds, stackToPotRation } = game

  if (pot=== 0) {
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', top: `${(height / 2) + 10}px`, left: `${(width / 2) - 200}px`, position: 'absolute', zIndex: 5000 }}>
      <img src={RED_CHIP_IMAGE} />
      <div style={{ marginTop: '6px', paddingLeft: "12px", height: '32px', lineHeight: '32px', minWidth: '100px', borderRadius: '8px', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)'}}>
        ${pot}  
      </div>
    </div>
  )
}

export default PotDisplay