import runtime from '@skypager/web'
import './client'

import * as deckFeature from 'features/deck'
import * as playersFeature from 'features/players'
import * as keybindingsFeature from 'features/keybindings'
import * as WorkspaceFeature from 'features/workspace'

runtime.features.register('deck', () => deckFeature)
runtime.features.register('players', () => playersFeature)
runtime.features.register('keybindings', () => keybindingsFeature)
runtime.features.register('workspace', () => WorkspaceFeature)

global.runtime = global.skypager = runtime.use('deck').use('players').use('keybindings')

runtime.feature('workspace').enable()

/** 
 * @typedef {Object} PokerWebRuntime
 * @property {import("./client.js").GameAPIClient} api
 * @property {DeckFeature} deck 
 * @property {PlayersFeature} players 
*/

export default runtime