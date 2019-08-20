import React, { Component } from 'react'
import types from 'prop-types'
import { Grid, Button, Divider, Segment, Header, Form } from 'semantic-ui-react'
import CardGroup from './CardGroup'

export const FLOP_FILTERS = {
  maxRank: "cardRank",
  name: "string",
  minRank: "cardRank",
  uniqSuits: "number",
  ranks: "array",
  uniqRanks: "number",
  flushPossible: "boolean",
  flushDraw: "boolean",
  rainbow: "boolean",
  sameRank: "boolean",
  paired: "boolean",
  trips: "boolean",
  hasAce: "boolean",
  hasKing: "boolean",
  hasQueen: "boolean",
  hasJack: "boolean",
  hasTen: "boolean",
  numberOfBroadwayCards: "number",
  threeMediumCards: "boolean",
  threeSmallCards: "boolean",
  gaps: "array",
  openEnded: "boolean",
  possibleStraights: "boolean"
};

function Results(props = {}) {
  const { flops = [] } = props

  const rows = flops.map((row,i) => {
    return (
      <Grid.Row key={i}>
        {row.map((col,i) => 
        <Grid.Column>
          <div style={{ height: "90px" }}>
            <CardGroup cardHeight={50} cards={[col["0"].name, col["1"].name, col["2"].name]} />
          </div>
        </Grid.Column>)}
      </Grid.Row>
    )
  })

  return (
    <Grid as={Segment} inverted columns="three">
      {rows}  
    </Grid>
  )
}

export class FlopBrowser extends Component {
  static contextTypes = {
    runtime: types.object
  }

  state = {
    filters: {}
  }

  searchFlops = async () => {
    const { runtime } = this.context
    const { filters } = this.state
    const { api } = runtime

    const response = await api.searchFlops({
      ...filters,
      sample: 9
    })

    this.setState({ flops: runtime.lodash.shuffle(response.flops).slice(0, 9) })
  }

  handleFilterChange = (e, { name, value }) => {
    this.setState((c) => ({
      ...c,
      filters: {
        ...c.filters,
        [name]: value
      }
    }), this.searchFlops)
  }

  render() {
    const { runtime } = this.context
    const { omit } = runtime.lodash
    const { deck } = runtime
    const cardStyles = { height: '40px' }
    const cardHeight = 40
    const { filters = {} } = this.state

    const cardOptions = ["2","3","4","5","6","7","8","9","T","J","K","A"].map((value,i)=> ({
      value: i,
      image: {
        src:deck.cardImages.lookup(`${value.toLowerCase()}h`)        
      },
      text: value
    })).reverse()

    const applyStatusFilter = (e, { name, value }) => {
      let others

      switch(name) {
        case 'flushStatus':
          others = ['flushDraw', 'flushPossible', 'rainbow']
          break
        case 'straightStatus':
          others = ['openEnded', 'possibleStraights']
          break
        case 'pairStatus':
          others = ['paired', 'trips']
          break
        case 'composition':
          others = ['threeLowCards', 'threeMediumCards']
          break
      }

      this.setState(c => ({
        ...c,
        filters: {
          ...omit(c.filters, others), 
          ...value !== '' && { [value]: true }
        }
      }), this.searchFlops);      
    }

    return (
      <Segment basic inverted style={{ height: "100%" }}>
        <Header inverted as="h2" content="Search Flops By Texture" />
        <Form inverted>
          <Form.Group widths="equal">
            <Form.Dropdown
              inverted
              selection
              value={filters.minRank}
              name="minRank"
              inverted
              label="Minimum Rank"
              options={cardOptions}
              onChange={this.handleFilterChange}
            />
            <Form.Dropdown
              inverted
              selection
              value={filters.maxRank}
              name="maxRank"
              inverted
              label="Maximum Rank"
              options={cardOptions}
              onChange={this.handleFilterChange}
            />
            <Form.Dropdown
              selection
              inverted
              onChange={this.handleFilterChange}
              name="numberOfBroadwayCards"
              label="Broadway Cards"
              options={[1, 2, 3].map(i => ({
                value: i,
                text: `${i}`,
                key: i
              }))}
            />
          </Form.Group>
          <Form.Group widths="equal">
            <Form.Dropdown
              selection
              inverted
              onChange={applyStatusFilter}
              name="flushStatus"
              label="Flush Texture"
              options={[
                { text: "Any", value: "", key: "any" },
                {
                  text: "Flush On Board",
                  value: "flushPossible",
                  key: "flushPossible"
                },
                {
                  text: "Flush Draw",
                  value: "flushDraw",
                  key: "flushDraw"
                },
                { text: "Rainbow", value: "rainbow", key: "rainbow" }
              ]}
            />
            <Form.Dropdown
              selection
              inverted
              onChange={applyStatusFilter}
              name="straightStatus"
              label="Straight Texture"
              options={[
                { text: "Any", value: "", key: "any" },
                {
                  text: "Open Ended",
                  value: "openEnded",
                  key: "openEnded"
                },
                {
                  text: "Straight Draw",
                  value: "possibleStraights",
                  key: "possibleStraights"
                }
              ]}
            />
            <Form.Dropdown
              selection
              inverted
              onChange={applyStatusFilter}
              name="pairStatus"
              label="Pair Texture"
              options={[
                { text: "Any", value: "", key: "any" },
                { text: "Paired", value: "paired", key: "paired" },
                { text: "Trips", value: "trips", key: "trips" }
              ]}
            />
          </Form.Group>
          <Form.Group>
            <Form.Dropdown
              selection
              inverted
              onChange={applyStatusFilter}
              name="composition"
              label="Composition"
              options={[
                { text: "Any", value: "", key: "any" },
                {
                  text: "Three Small Cards",
                  value: "threeSmallCards",
                  key: "threeSmallCards"
                },
                {
                  text: "Three Medium Cards",
                  value: "threeMediumCards",
                  key: "threeMediumCards"
                }
              ]}
            />
          </Form.Group>
          <Button.Group>
            <Button icon="refresh" content="Refresh" />
            <Button icon="clear" content="Reset" />
          </Button.Group>
        </Form>
        <Results flops={runtime.lodash.chunk(this.state.flops, 3)} />
      </Segment>
    );
  }
}

export default FlopBrowser