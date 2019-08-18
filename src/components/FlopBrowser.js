import React, { Component } from 'react'
import types from 'prop-types'
import { Segment, Header, Form } from 'semantic-ui-react'

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

export class FlopBrowser extends Component {
  render() {
    return (
      <Segment basic inverted style={{ height: '100%' }}>
        <Header inverted as="h2" content="Search Flops By Texture" />  
        <Form inverted>
          <Form.Group inline>
            <Form.Dropdown label="Minimum Rank" />
            <Form.Dropdown label="Maximum Rank" />
          </Form.Group>  
          <Form.Group widths="equal">
            <Form.Checkbox label="Flush on board" />  
            <Form.Checkbox label="Flush draws" />  
            <Form.Checkbox label="Rainbow" />  
          </Form.Group>
          <Form.Group widths="equal">
            <Form.Checkbox label="Open ended" />  
            <Form.Checkbox label="Straight Draws" />  
          </Form.Group>
          <Form.Group widths="equal">
            <Form.Checkbox label="Paired" />  
            <Form.Checkbox label="Trips" />  
          </Form.Group>
        </Form>
      </Segment>
    )
  }
}

export default FlopBrowser