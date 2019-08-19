const ACE: i32 = 13;
const KING: i32 = 12;
const QUEEN: i32 = 11;
const JACK: i32 = 10;
const TEN: i32 = 9;
const NINE: i32 = 8;
const EIGHT: i32 = 7;
const SEVEN: i32 = 6;
const SIX: i32 = 5;
const FIVE: i32 = 4;
const FOUR: i32 = 3;
const THREE: i32 = 2;
const TWO: i32 = 1;

const HEARTS: i32 = 20;
const DIAMONDS: i32 = 21;
const CLUBS: i32 = 22;
const SPADES: i32 = 23;

const SUITS: [i32; 4] = [HEARTS, DIAMONDS, CLUBS, SPADES];
const RANKS: [i32; 13] = [
  TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, JACK, QUEEN, KING, ACE,
];

pub struct Card {
  suit: i32,
  rank: i32,
}

impl Card {
  // This should display the human friendly name of the card, which internally we need to work with as the numbers defined in the constants above
  fn name(&self) -> str {
    let name = String::from("Ah");
    name;
  }
}

// a deck is 4 suits x 13 ranks for a total of 52 cards
pub struct Deck {
  cards: [Card; 52],
}

// Hand Rankings describe a 5 card combination of cards
const HIGH_CARD: i32 = 1; // No pairs
const PAIR: i32 = 2; // Two cards of the same rank, plus three other cards
const TWO_PAIR: i32 = 3; // Two Pairs of Two Cards the same rank, plus one other card
const THREE_OF_A_KIND: i32 = 4; // Three cards of the same rank, plus two other unmatched cards
const STRAIGHT: i32 = 5; // Cards in 5 card Order, including The Ace thru 5 Straight AKA the Wheel
const FLUSH: i32 = 6; // 5 Cards of the same suit
const FULL_HOUSE: i32 = 7; // 3 Cards of the Same rank, plus 2 cards of another rank
const STRAIGHT_FLUSH: i32 = 8; // 5 cards in order of rank, 5 cards of the same suit
const ROYAL_FLUSH: i32 = 9; // Ten thru Ace of the same suit

const HAND_RANKS: [i32; 9] = [
  HIGH_CARD,
  PAIR,
  TWO_PAIR,
  THREE_OF_A_KIND,
  STRAIGHT,
  FLUSH,
  FULL_HOUSE,
  STRAIGHT_FLUSH,
  ROYAL_FLUSH,
];

pub fn test() {
  let card = Card { rank: 12, suit: 20 };
  println!("{}", card.name());
}
