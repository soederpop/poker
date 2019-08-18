import React from 'react'
import types from 'prop-types'
import BLUE_CHIP_IMAGE from 'assets/blue-chip.png'
import RED_CHIP_IMAGE from 'assets/red-chip.png'

export function PlayerChips({ amount = 0, seat = 1 } = {}) {
  const seatStyles = {
    1: { top: 290, left: 270 },
    2: { top: 220, left: 380 },
    3: { top: 220, left: 590 },
    4: { top: 220, left: 780, flexDirection: "row-reverse" },
    5: { top: 350, left: 890, flexDirection: "row-reverse" },
    6: { top: 440, left: 800, flexDirection: "row-reverse" },
    7: { top: 470, left: 640 },
    8: { top: 470, left: 400, flexDirection: "row-reverse" },
    9: { top: 380, left: 230 },
  }

  if (amount === 0) {
    return null
  }

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 5000,
        display: "flex",
        flexDirection: "row",
        ...seatStyles[String(seat)]
      }}
    >
      <img src={BLUE_CHIP_IMAGE} />
      <div
        style={{
          marginTop: "6px",
          paddingLeft: "12px",
          height: "32px",
          lineHeight: "32px",
          minWidth: "60px",
          borderRadius: "8px",
          color: "white",
          backgroundColor: "rgba(0,0,0,0.5)"
        }}
      >
        ${amount}
      </div>
    </div>
  );
}

export function Chips(props = {}, { game = {}, runtime = global.skypager } = {}) {
  const { actions = [], stage } = game
  const { sumBy } = runtime.lodash

  const currentChips = runtime.chain.plant(actions)
    .filter({ stage })
    .groupBy('seat')
    .mapValues((actions) => sumBy(actions, 'amount'))
    .entries()
    .value()

  return (
    currentChips.map(([seat, amount]) => <PlayerChips amount={amount} seat={seat} key={`chips-${seat}`} />)
  )
}

PlayerChips.propTypes = {
  amount: types.number,
  seat: types.number
}

Chips.contextTypes = {
  runtime: types.object,
  game: types.object
}

export default Chips 