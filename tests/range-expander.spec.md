# Range Expander

## Setup

The Range Expander class is a main export of this module.

```javascript
import Range from "../src/Range";
```

## Tests

### Expands ranges of cards

```javascript
const input = "A8s-A6s";
const expected = ["Ah"];
```

### Expands different range inputs to card combos

```javascript
expect(Range.filterCombos("AA").length).to.equal(6);
expect(Range.filterCombos("AK").length).to.equal(16);
expect(Range.filterCombos("AKs").length).to.equal(4);
expect(Range.filterCombos("AA,KK,QQ").length).to.equal(18);
```

### Examples from ed miller 1% book

```javascript
const oneSixEight = "JJ-22,AQs-A6s,QJs-87s,QTs-64s,Q9s,AQo";
expect(Range.filterCombos(oneSixEight).length).toEqual(168);

const threeTwoSix =
  "AA-22,AKs-A2s,KQs-K8s,QJs-43s,QTs-53s,Q9s,AKo-A9o,KQo-KTo,QJo";

expect(Range.filterCombos(threeTwoSix).length).toEqual(326);

const twelvePercent = "AA-66,AKs-A9s,A5s-A2s,KQs-KTs,QJs-76s,QTs-J9s,AKo-AQo";
expect(Range.measure(twelvePercent)).toEqual(12);
```
