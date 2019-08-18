# Poker Solver

> Prototype Built

The poker solver project has evolved into a full blown situation analyzer for poker games.

It supports the idea of ranges, and can calculate the equity of one range vs another, either preflop
or on any board. You can visualize how boards impact a range.

## Usage

You can startup a game simulation:

```shell
$ skypager game --dev --babel
```

Once you do this, hit `d` to deal, `a` for an AI player to perform their action.

## Current Focus

Currently I'm working on developing the strategy and AI that drives which actions a given player will take.

1. I want to develop a strategy that can improve itself through repetitive play.
2. I want to be able to use information about hand strength and equity to control how each player perceives their current equity.  
   An AI player who is more intelligent, can play closer to the theoretical correct way, by having more accurate knowledge of these numbers.
3. We could also allow the AI players to "cheat" so they always play correctly against other players, possibly speeding up the rate at which AI
   players learn from their mistakes.

## Range Class

There is a `Range` class which can be used like:

```javascript
const villain = new Range("22+,ATo+,QTs+");
const hero = new Range("KK+");

hero.compareRange(villain).then(results => {
  console.log("Comparison Results");
  console.log(results);
});
```

I've also included some common ranges defined by David Sklansky:

```javascript
const ultraStrong = Range.sklansky.ultraStrong;
const strong = Range.sklansky.strong;
const medium = Range.sklansky.medium;
const loose = Range.sklansky.loose;
```

The `Range` class provides a ton of other info which belongs in a separate class, about
cards and hole-card combinations, as well as enumerations of all possible flops, turns, and rivers.

Each combo (flop, hole-card, etc) can be analyzed for certain features, e.g. suited, connected, paired, ranks, etc

Where possible I've relied on open source libraries:

1. `js-combinatorics` creates all possible combinations of cards in a certain size chunk
2. `poker-tools` does odds calculation
3. `tx-holdem` does hand analysis, draw combination / outs counting, hand ranking

## Game Class

There is a `Game` class which is capable of simulating the play between up to 9 players.

I use `tx-holdem` for its deck and cards. Each player is a stateful object that has hole cards and chips,
as well as a "range" that says which cards they play in that position.

Every time you deal cards, a flop, turn, or river, you can calculate the equity.

You can see each player's average equity preflop, and their current equity on the current board.

All of this can be rendered in the terminal when you run `skypager game --dev --babel`
