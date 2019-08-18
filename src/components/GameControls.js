import React, { useState, Component } from 'react'
import types from 'prop-types'
import { Popup, Form, Button, Segment } from 'semantic-ui-react'

export function CheckButton(props = {}) {
  const { beforeSend, afterSend, game, runtime } = props

  const sendAction = async () => {
    await beforeSend()
    const { playerId } = Object.values(game.players).find(({ seat }) => seat === game.actionSeat)
    const gameState = await runtime.client('game-api').action(game.id, { type: "check", playerId })
    await afterSend(gameState)
  }  

  return (
    <Button color="yellow" content="Check" onClick={sendAction} />
  )
}

export function CallButton(props = {}) {
  const { beforeSend, afterSend, game, runtime } = props

  const sendAction = async () => {
    await beforeSend()
    const { playerId } = Object.values(game.players).find(({ seat }) => seat === game.actionSeat)
    const gameState = await runtime.client('game-api').action(game.id, { type: "call", playerId })
    await afterSend(gameState)
  }  

  return (
    <Button color="orange" content={`Call $${game.toGo - game.currentPlayerAmountInvested}`} onClick={sendAction} />
  )
}

export function BetButton(props = {}) {
  const { beforeSend, afterSend, game, runtime } = props
  const [amount, updateAmount] = useState(game.toGo * 2)
  const { min } = runtime.lodash

  const sendAction = async () => {
    await beforeSend()
    const { chips, playerId } = Object.values(game.players).find(({ seat }) => seat === game.actionSeat)
    const gameState = await runtime.client('game-api').action(game.id, { type: "raise", playerId, amount })
    await afterSend(gameState)
  }  

  const minimumBet = game.isPotRaised 
    ? parseInt(game.toGo, 10) * 2
    : parseInt(game.bigBlindAmount, 10)
  
  return (
    <Popup inverted on="click" style={{ padding: 0 }} trigger={<Button color="green" content="Bet" />}>
      <div style={{ display: 'flex', flexDirection: "row" }}>
        <Form inverted>
          <Form.Input name="amount" label="Amount" value={amount} onChange={(e, { value }) => updateAmount(value)} />
          <Form.Button fluid onClick={sendAction} primary content="Bet" style={{ marginTop: '16px' }} />
        </Form>  
        <Button.Group vertical size="small">
          <Button color="black" content="Min" onClick={() => updateAmount(minimumBet)}/>
          <Button color="black" content="2.5x" onClick={() => updateAmount(Math.round(game.bigBlindAmount * 2.5))}/>
          <Button color="black" content="3x" onClick={() => updateAmount(Math.round(game.bigBlindAmount * 3))}/>
          <Button color="black" content="4x" onClick={() => updateAmount(Math.round(game.bigBlindAmount * 4))}/>
          <Button color="black" content="1/2 Pot" onClick={() => updateAmount(Math.round(game.toGo / 2) > minimumBet ? Math.round(game.toGo / 2) : minimumBet )}/>
          <Button color="black" content="Pot" onClick={() => updateAmount(Math.round(game.pot) > minimumBet ? Math.round(game.pot) : minimumBet )}/>
          <Button color="black" content="All-in" onClick={() => {
            const { chips } = Object.values(game.players).find(({ seat }) => seat === game.actionSeat)
            updateAmount(chips) 
          }}/>
        </Button.Group>      
      </div>
    </Popup>
  )
}

export function FoldButton(props = {}) {
  const { beforeSend, afterSend, game, runtime } = props

  const sendAction = async () => {
    await beforeSend()
    const { playerId } = Object.values(game.players).find(({ seat }) => seat === game.actionSeat)
    const gameState = await runtime.client('game-api').action(game.id, { type: "fold", playerId })
    await afterSend(gameState)
  }  

  return (
    <Button color="red" content="Fold" onClick={sendAction} />
  )
}

export const actionButtons = {
  call: (props = {}) => <CallButton {...props} />,
  raise: (props = {}) => <BetButton {...props} />,
  fold: (props = {}) => <FoldButton {...props} />,
  check: (props = {}) => <CheckButton {...props} />,
}

export class GameControls extends Component {
  static contextTypes = {
    runtime: types.object
  }

  static propTypes = {
    game: types.object,
    onUpdate: types.func
  }

  state = {
    working: false
  }

  handleDeal = async () => {
    const { runtime } = this.context
    const { onUpdate, game } = this.props
    const api = runtime.client('game-api')
    const gameState = await api.action(game.id, { type: "deal" })
    
    if (onUpdate) {
      await onUpdate(gameState)
    }

    await this.handleCalculate()
  }

  handleAdvanceAction = async () => {
    const { runtime } = this.context
    const { onUpdate, game } = this.props
    const api = runtime.client('game-api')
    const gameState = await api.action(game.id, { type: "simulate" })
    
    if (onUpdate) {
      await onUpdate(gameState)
    }
  }

  handleReset = async () => {
    const { runtime } = this.context
    const { onUpdate, game } = this.props
    const api = runtime.client('game-api')
    const gameState = await api.action(game.id, { type: "reset" })
    
    if (onUpdate) {
      await onUpdate(gameState)
    }
  }

  handleCalculate = async () => {
    const { runtime } = this.context
    const { onUpdate, game } = this.props
    const api = runtime.client('game-api')
    const gameState = await api.action(game.id, { type: "equity" })
    
    if (onUpdate) {
      await onUpdate(gameState)
    }
  }
  
  handleActionSent = async (gameState) => {
    const { onUpdate } = this.props
    
    if (onUpdate) {
      await onUpdate(gameState)
    }

    this.setState({ working: false })
  }

  render() {
    const { runtime } = this.context
    const { game, onChangeView } = this.props
    const { working } = this.state

    return (
      <Segment inverted basic fluid clearing>
        <Button.Group floated="left" style={{ marginRight: '16px' }}>
          <Button onClick={this.handleCalculate} icon="bar chart" />  
          <Button onClick={this.handleDeal} icon="play" />  
          <Button onClick={this.handleAdvanceAction} icon="chevron right" />  
          <Button onClick={this.handleReset} icon="refresh" />  
        </Button.Group>
        {!!game.round && !game.isActionClosed && <Button.Group style={{ marginRight: '16px' }} disabled={working}>
          {game.availableOptions.map((action) => actionButtons[action]({ afterSend: this.handleActionSent, beforeSend: () => this.setState({ working: true }), runtime, game }))}
        </Button.Group>}
        <Button.Group floated="right" toggle>
          <Button icon="info" onClick={() => onChangeView({ display: "playerInfo" })} />
          <Button icon="bar chart" onClick={() => onChangeView({ display: "equity" })} />
        </Button.Group>
      </Segment>
    )
  }

}

export default GameControls