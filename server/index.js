import Game, { attach as attachGameHelper } from './Game'
import Actor, { attach as attachActorHelper } from './Actor'
import Range from './Range'
import * as pokerTools from 'poker-tools'
import HandEquity from './HandEquity'
import RangeEquity from './RangeEquity'
import { attach as attachFileDb } from '@skypager/features-file-db'
import * as data from './data'

export { Game, Range, Actor }

export function createRange(input) {
  return new Range(input) 
}

export function calculateEquity(cards = [], board = "") {
  board = pokerTools.CardGroup.fromString(board);
  cards = cards.map(c => pokerTools.CardGroup.fromString(c));

  const results = pokerTools.OddsCalculator.calculateEquity(cards, board);

  return results;
} 

export function attach(runtime) {
  runtime.hide('Range', Range)
  runtime.hide('Game', Game)
  runtime.hide('Actor', Actor)
  runtime.hide('HandEquity', HandEquity)
  runtime.hide('RangeEquity', RangeEquity)
  runtime.hide('data', data)
  
  runtime
    .use({ attach: attachGameHelper })
    .use({ attach: attachActorHelper })
    .use({ attach: attachFileDb })

  const gamesContext = require.context("./games", false, /\.js$/);
  // needed for babel-plugin-require-context-hook compat
  gamesContext.resolve = gamesContext.resolve || ((key) => key)
  
  const actorsContext = require.context("./actors", false, /\.js$/);
  // needed for babel-plugin-require-context-hook compat
  actorsContext.resolve = actorsContext.resolve || ((key) => key)
   
  runtime.games.add(gamesContext)
  runtime.actors.add(actorsContext)

  runtime.gamesMap = new Map()
  
  runtime.servers.register('game-api', () => require('./api'))
  const endpoints = require.context('./api/endpoints', false, /\.js$/)
  endpoints.resolve = (k) => k
  runtime.endpoints.add(endpoints)

  if (runtime.isDevelopment) {
    require('../src/client')
  } else {
    require('../lib/client')
  }
}