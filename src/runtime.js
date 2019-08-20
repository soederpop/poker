import runtime from '@skypager/web'
import './client'

import * as deckFeature from 'features/deck'
import * as playersFeature from 'features/players'
import * as keybindingsFeature from 'features/keybindings'
import * as WorkspaceFeature from 'features/workspace'
import * as speechRecognitionFeature from 'features/speech-recognition'
import * as voiceSynthesisFeature from 'features/voice-synthesis'
import * as voiceCommanderFeature from 'features/commander'

runtime.features.register('deck', () => deckFeature)
runtime.features.register('players', () => playersFeature)
runtime.features.register('keybindings', () => keybindingsFeature)
runtime.features.register('workspace', () => WorkspaceFeature)
runtime.features.register('speech-recognition', () => speechRecognitionFeature)
runtime.features.register('voice-synthesis', () => voiceSynthesisFeature)
runtime.features.register('commander', () => voiceCommanderFeature)

global.runtime = global.skypager = runtime.use('deck').use('players').use('keybindings')

runtime.feature('workspace').enable()
runtime.feature('voice-synthesis').enable()
runtime.feature('speech-recognition').enable()
runtime.feature('commander').enable()

/** 
 * @typedef {Object} PokerWebRuntime
 * @property {import("./client.js").GameAPIClient} api
 * @property {DeckFeature} deck 
 * @property {PlayersFeature} players 
*/

export default runtime