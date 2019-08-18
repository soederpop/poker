import React, { useState } from "react";
import types from "prop-types";
import CardGroup from './CardGroup'

import './TableLayout.css'
import './Players.css'

function calculatePosition(seatNumber, { height = 800, width = 1200 } = {}) {
  const positions = {}
  return positions[seatNumber]
}

export function Players(props = {}, context = {}) {
  const { runtime } = context;
  const { viewOptions = {}, game, dimensions = { height: 800, width: 1200 }, size = 100 } = props;
  const { players: playerAvatars } = runtime
  const { height, width } = dimensions
  const { display = 'playerInfo' } = viewOptions

  const currentPlayers = Object.values(game.players || {}).map((player, i) => ({
    avatar: String(i + 1),
    ...player,
  })) 

  playerAvatars.loadImages()

  const showInfo = display === 'playerInfo'
  const showEquity = !showInfo

  const styles = {
    color: '#ffffff', 
    position: 'absolute', 
    zIndex: 2000, 
  }

  const { cardDescriptions = {} } = game

  return (
    <div className={`seats-${currentPlayers.length}`} style={{ zIndex: 1000, position: 'relative', width: `${width}px`, height: `${height}px` }}>
      {currentPlayers.map(({ playerId, seat, avatar, inHand, chips, cards }, index) =>
        <div 
          key={playerId} 
          className={`seat seat-${index + 1}`}
          style={styles}
        >
          <div className="avatar-container" style={{ paddingTop: '24px', backgroundPosition: (seat === game.actionSeat ? '-100px' : '0px'), backgroundSize: 'auto 100%', backgroundImage: `url(${runtime.players.avatarImages.lookup(avatar)})`, height: `${size}px`, width: `${size}px`, }}> 
            {game.players[playerId].inHand && <CardGroup 
              cardHeight={50} 
              cards={(cardDescriptions[playerId] || []).map(s => s.toLowerCase())} 
              cardStyles={{ marginRight: '2px' }}
            />}
            <div className="player-stats">
              <div className="player-equity">{describeEquity(game, playerId)}</div> 
              {!!(['flop','turn'].indexOf(game.stage) > -1 && game.outs[playerId]) && <div className="player-outs">{game.outs[playerId]} outs</div> }
            </div>            
          </div>
          <div style={{ position: 'relative' }} className="player-info-container">
            <div className="player-details"> 
              <div>{playerId}</div>
              <div>${chips}</div> 
            </div>
            {game.stage === 'river' && <div className='player-hand-summary'>{String(game.summary[playerId]).split(':')[0] || ''}</div>}
          </div>
        </div>)}
    </div>
  )
}

function describeEquity(game, playerId) {
  const data = game && game.reality && game.reality[playerId]

  if (data && typeof data.current !== 'undefined' && game.stage === 'preflop') {
    const diffValue = (data.current - data.average)
    const color = diffValue < 0 ? 'red' : diffValue > 0 ? 'green' : 'white' 
    const diff = diffValue === 0 ? '' : (diffValue > 0 ? `+${diffValue}` : `${diffValue}`)

    return (
      <div>
        <span>%{data.current}</span>
        <span style={{ color }}>{diff}</span>
      </div>
    )

  } else if (data && typeof data.current !== 'undefined') {
    return <div>%{data.current}</div>
  } else if (data) {
    return <div>%{data.average}</div>
  } else {
    return <span />
  }
}

Players.contextTypes = {
  runtime: types.object
};

export default Players;
