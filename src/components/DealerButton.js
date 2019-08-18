import React from 'react'
import BUTTON_IMAGE from 'assets/dealer-button.png'

export function DealerButton({ height = 800, width = 1200, seat = 1 } = {}) {
  const coordinates = {
    1: { top: 330, left: 240 },
    2: { top: 230, left: 330 },
    3: { top: 210, left: 540 },
    4: { top: 210, left: 730 },
    5: { top: 310, left: 910 },
    6: { top: 410, left: 880 },
    7: { top: 470, left: 750 },
    8: { top: 470, left: 440 },
    9: { top: 430, left: 260 },
  }

  return (
    <div style={{ position: 'absolute', zIndex: 5000, ...coordinates[String(seat)] }}>
      <img src={BUTTON_IMAGE} />
    </div>
  )
}

export default DealerButton