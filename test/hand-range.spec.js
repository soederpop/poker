const runtime = require('../runtime')
const { Range } = runtime

const individual = [
  ["22-99", 48],
  ["ATs-AKs", 16],
  ["KTs+", 16],
  ["QTs+", 16],
  ["JTs", 4],
  ["T9s", 4],
  ["98s", 4],
  ["87s", 4]
];    

const totalSum = runtime.lodash.sumBy(individual, '1')

describe('Hand Range', function() {
  describe('parsing common range notations', function() {
    it('understands plus signs', function() {
      const combos = new Range("KTs+").normalizedComboNames

      combos.should.include('KTs')
      combos.should.include('KJs')
      combos.should.include('KQs')
      combos.should.include('AKs')
      combos.length.should.equal(4)

    })

    it('understands dashes to interpret inclusive range', function() {
      const range = new Range("ATs-AQs")
      const combos = range.normalizedComboNames
      combos.length.should.equal(3)
      combos.should.include('AQs')
      combos.should.include('AJs')
      combos.should.include('ATs')
    })
  })  

  describe('Combos', function() {
    individual.forEach(i => {
      const [input, actualCount] = i;

      it(input, () => {
        const range = new Range(input);
        range.size.should.equal(actualCount);
      });
    });

  })

  describe('Combined Ranges', function() {
    it('can combine multiple range notations separated by commas', function() {
      const combined = new Range(individual.map(i => i[0]).join(","));

      combined.normalizedComboNames.should.include('AKs','AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'TJs', '99', '88', '77', '66', '55', '44', '33', '22', '87s', '98s', 'T9s')
      combined.size.should.equal(totalSum)
      combined.size.should.equal(112)
    })
  })
})