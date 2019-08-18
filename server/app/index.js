import React from 'react'
import { render as renderApp } from 'ink'
import GameDisplay from './GameDisplay'
import RangeVisualizer from './RangeVisualizer'
import HandStrengthVisualizer from './HandStrengthVisualizer'

export function render(props = {}, options) {
  if (props.appName === 'RangeVisualizer') {
    return renderApp(<RangeVisualizer {...props} />, options)
  } else if (props.appName === 'HandStrengthVisualizer') {
    return renderApp(<HandStrengthVisualizer {...props} />, options)
  } else {
    return renderApp(<GameDisplay {...props} />, options)
  }
}