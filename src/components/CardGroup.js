import React, { Component } from 'react'
import types from 'prop-types'

export function CardGroup(props = {}, context = {}) {
  const { runtime } = context
  const { cards = [], cardHeight = 100, cardStyles = {}, containerStyles = {} } = props
  const { deck } = runtime

  if (!deck.cardImages.available.length) {
    deck.loadCardImages()
  }

  return (
    <div style={{ position: 'absolute', ...containerStyles, flexDirection: 'row', display: 'flex' }}>
      {(cards || []).map((card,key) => <div key={key} style={cardStyles}><img style={{ height: `${cardHeight}px` }} src={deck.cardImages.lookup(`${card.toLowerCase()}`)} /></div>)}
    </div>
  )  
}

CardGroup.contextTypes = {
  runtime: types.object
}

CardGroup.propTypes = {
  containerStyles: types.object,
  cardStyles: types.object,
  cards: types.arrayOf(types.string),
  cardHeight: types.number
}

CardGroup.defaultProps = {
  cardHeight: 100,
  cardStyles: {
    marginRight: '8px'
  }
}

export default CardGroup
