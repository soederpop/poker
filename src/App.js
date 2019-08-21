import React, { Component } from 'react'
import types from 'prop-types'
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import { Loader, Segment } from 'semantic-ui-react'
import GamePage from './pages/GamePage'
import GamesPage from './pages/GamesPage'
import RangesPage from './pages/RangesPage'
import api from './client'
import RangeCalculator from './components/RangeCalculator'
import FlopBrowser from './components/FlopBrowser'

import './App.css'

export const apiType = types.shape({
  action: types.func,
  searchFlops: types.func,
  searchFlops: types.func,
})

export class App extends Component { 
  static childContextTypes = {
    runtime: types.object,
    api: apiType,
    workspace: types.object
  }

  static propTypes = {
    runtime: types.object
  }
 
  state = {
    activeTool: undefined
  }

  getChildContext() {
    return { 
      runtime: this.props.runtime,
      api,
      workspace: this.props.runtime.workspace
    }
  }

  toggleFlopBrowser = () => {
    const { activeTool } = this.state
    const { runtime } = this.props

    const showDrawer = () => { runtime.workspace.toggleDrawer('right', !!this.state.activeTool) }

    if (activeTool !== 'flopBrowser') {
      this.setState({ activeTool: 'flopBrowser' }, showDrawer)
    } else if (activeTool === 'flopBrowser') {
      this.setState({ activeTool: undefined }, showDrawer)
    }
  }

  toggleRangeCalculator = () => {
    const { activeTool } = this.state
    const { runtime } = this.props

    const showDrawer = () => { runtime.workspace.toggleDrawer('right', !!this.state.activeTool) }

    if (activeTool !== 'rangeCalculator') {
      this.setState({ activeTool: 'rangeCalculator' }, showDrawer)
    } else if (activeTool === 'rangeCalculator') {
      this.setState({ activeTool: undefined }, showDrawer)
    }
  }

  async componentDidMount() {
    const { runtime } = this.props
    const { voiceCommander, keybindings } = runtime

    const d1 = runtime.state.observe(({ name, newValue }) => {
      if (name === 'activeTool') {
        this.setState({ activeTool: newValue })
      }
    })

    const d2 = voiceCommander.commands.observe(({ newValue: commandState }) => {
      console.log('got command state', commandState)
    })

    this.disposer = () => {
      d1()
      d2()
    }

    keybindings.bind('g f', this.toggleFlopBrowser)
    keybindings.bind('g r', this.toggleRangeCalculator)

    this.unbindKeys = () => {
      keybindings.unbind('g f', this.toggleFlopBrowser)
      keybindings.unbind('g r', this.toggleRangeCalculator)
    }

    console.log('connecting runtime')
    runtime.api.connect().then(() => {
      console.log('connected')
      this.setState({ connected: true })
      runtime.setState({ connected: true })
      runtime.emit('connected')
    })
  }

  componentWillUnmount() {
    this.disposer()
  }
  
  render() {
    const { connected, activeTool } = this.state
    const { runtime } = this.props
    const { DrawerLayout, Drawer: Controller } = runtime.workspace 

    if (!connected) {
      return <Loader active />
    }

    const Drawer = (props) => 
      <Controller {...props}>
        <Segment basic inverted fluid style={{ height: '100%'}}>
          {props.children}  
        </Segment>
      </Controller>

    return (
      <BrowserRouter>
        <DrawerLayout>
          <Switch>
            <Route path="/" exact component={GamesPage} /> 
            <Route path="/ranges" exact component={RangesPage} />
            <Route path="/games/:gameId" exact component={GamePage} /> 
          </Switch>
          {activeTool === 'flopBrowser' && <Drawer drawerId="right"><FlopBrowser /></Drawer>}
          {activeTool === 'rangeCalculator' && <Drawer drawerId="right"><RangeCalculator /></Drawer>}
        </DrawerLayout>
      </BrowserRouter>
    )
  }
}

export default App