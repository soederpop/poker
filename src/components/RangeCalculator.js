import React, { Component } from 'react'
import types from 'prop-types'
import { Segment, Header, Form } from 'semantic-ui-react'

export class RangeCalculator extends Component {
  render() {
    return (
      <Segment basic>
        <Header as="h2" content="Compare Range Equity" />  
        <Form>
          <Form.Input label="Range One" />  
          <Form.Input label="Range Two" />  
          <Form.Input label="Number of players" />  
          <Form.Input label="Dead Cards" placeholder='Use comma separated, e.g. Ah,Kh,4c,Td' />  
        </Form>
      </Segment>
    )
  }
}

export default RangeCalculator