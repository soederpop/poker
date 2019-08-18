import React, { Component } from 'react'
import types from 'prop-types'
import { Segment, Grid } from 'semantic-ui-react'

export class RangesPage extends Component {
  static contextTypes = {
    runtime: types.object
  }

  state = {
    loading: false,
    combos: [],
    grid: []
  }

  async componentDidMount() {
    const { runtime } = this.context
    const { keyBy } = runtime.lodash
    const api = runtime.client('game-api')

    try {
      this.setState({ loading: true })
      const { combos, grid } = await api.showRangeGrid()
      this.setState({ combos: keyBy(combos, 'normalized'), grid })
    } catch(error) {
      console.error('Error listing games', error)
      this.setState({ error: error.message })
    } finally {
      this.setState({ loading: false })
    }
    
  }

  render() {
    const { grid = [], combos = {} } = this.state

    console.log(combos)
    return (
      <Grid celled style={{ margin: '6px', width: `${13 * 60}px` }}>
        {grid.map((row, i) => 
          <Grid.Row key={i} columns={13} style={{ height: '60px' }}>
            {row.map((combo,i) => 
              <Grid.Column key={i} textAlign='center'>
                {combo}
              </Grid.Column>
            )}
          </Grid.Row>
        )}  
      </Grid>
    )
  }

}

export default RangesPage