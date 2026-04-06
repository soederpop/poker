# Project VIsion 

Use your luca-framework skill, or search the source code at ~/@luca to help inform your design.

A Pure LLM based participant can connect to a game server.

Assume the game server is already running, you just need to know the address.

```ts skip
// code we could make real
const aiPlayer = container.feature('aiPlayer', {
  botIdOrTokenOrWhatever: "blah",
  serverUrl: 'http://localhost:3000',
  // once the assistant is started, we can modify its system prompt
  // to steer it towards various viable play styles
  playStyle: 'maniac'
})

// look up the exact requirements for creating a feeature
class AIPlayer extends Feature<AIPlayerState, AIPlayerOptions> { /
  // some static ceremony you gotta do, see the docs 
  get gameSocketClient() {
    // hopefully we have a formal game socket luca websocket client? if not we need one
    return this.container.client('lucaGameServerClient')
  }
  
  get assistant() {
    return this.container.feature('assistant', { folder: 'assitants/player' })
  }
  
  get isConnected() : boolean {
    return this.state.get('gameSocketClientConnected')
  }
  
  async connect() {
    if(this.isConnected) {
      return this
    }
    
    await this.gameSocketClient.connect()
    
    // assume we have some bindings to do to here
    this.state.set('gameSocketClientConnected', true)

    return this
  }
  
  get isStarted() : boolean {
    return this.state.get('started')  
  }
  
  async prepareAssistant() {
    if (this.isAssistantPrepared) {
      return this.assistant
    }
    
    // we'll have a folder of skills that can help it perform
    this.assistant.use(this.container.feature('skillsLibrary'))
    // this is a feature we'll have to write that exposes toTools
    // this will help it use the available APIs to do opponent hand history lookups
    // build notes on opponents, etc
    this.assistant.use(this.container.feature('pokerAssistantTools'))
    
  }
  
  get isAssistantPrepared() : boolean {
    return this.state.get('assistantPrepared')
  }
  
  async start() {
    if(this.isStarted) {
      return this
    }

    // make sure the 
    await this.connect()    
    await this.prepareAssistant()
   
    this.gameSocketClient.on('decision_required', async (whateverItEmits) => {
      this.state.set('hasAction', true)
      
      const question = this.describeSituationFullyInEnglish(whateverItEmits)
    
      this.emit('makingDecision', { question, context: whateverItEmits })
      const decision = await this.assistant.ask(question, { schema: whateverTheSchemaIs })
      
      this.state.set('hasAction', false)
    })
  }
}
```

Then we could do something like:

```ts skip
const gameServer = await container.server('gameServer').start()
const table = await createSixMaxCashGame(gameServer)
const players = await createFiveAIPlayers(gameServer)

await Promise.all(players.map(async p => {
  await p.start()
  await p.joinTable(table)
}))

const gameRenderer = container.feature('gameRenderer', { table })

await gameRenderer.start() // this would show the ink UI
```

We could have the `pokurr play --table-id=whatever` command then connect to this table with a human player who takes the 5th seat.

## Why?

As a very baseline ( expensive, cuz it costs tokens, but luca assistants can be pointed at local models too, which will make them slower ( so wed have to have a 5 minute time limit per turn unfortunately) for this demo )

An LLM can use tool calls, prompting, to be a decent enough opponent to play against.

I want to be able to develop purely code strategies ( even if they use async processing, llm calls, simulations, opponent databases, whatever ) which can exist on disk, that can encode a particular strategy for playing.  These code strategies need SOME level of capable opponent to benchmark themselves against.

## Other Refactor Possibilities

We have this `feature/actor.js` that is basically an approximation of what we could do with a standard `Player` feature.  That can be used to model a human player connected via the ink terminal, or a Player represented by a static code strategy ( what we used to call house actors in earlier iterations ( see git history) )
