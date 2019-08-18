import { Card } from 'tx-holdem'

const {
  CLUBS,
  DIAMONDS,
  HEARTS,
  SPADES,
  ACE,
  KING,
  QUEEN,
  JACK,
  TEN,
  NINE,
  EIGHT,
  SEVEN,
  SIX,
  FIVE,
  FOUR,
  THREE,
  TWO
} = Card;

export const SUITS = [CLUBS, DIAMONDS, HEARTS, SPADES];
export const RANKS = [
  TWO,
  THREE,
  FOUR,
  FIVE,
  SIX,
  SEVEN,
  EIGHT,
  NINE,
  TEN,
  JACK,
  QUEEN,
  KING,
  ACE
];

export const ALIASES = {
  "2": TWO,
  "3": THREE,
  "4": FOUR,
  "5": FIVE,
  "6": SIX,
  "7": SEVEN,
  "8": EIGHT,
  "9": NINE,
  "10": TEN,
  hearts: HEARTS,
  spades: SPADES,
  diamonds: DIAMONDS,
  clubs: CLUBS,
  h: HEARTS,
  s: SPADES,
  d: DIAMONDS,
  c: CLUBS,
  ace: ACE,
  queen: QUEEN,
  jack: JACK,
  king: KING,
  ten: TEN,
  t: TEN,
  T: TEN,
  a: ACE,
  k: KING,
  q: QUEEN,
  j: JACK,
  A: ACE,
  K: KING,
  Q: QUEEN,
  J: JACK
};

export const SYMBOLS = {
  [TWO]: "2",
  [THREE]: "3",
  [FOUR]: "4",
  [FIVE]: "5",
  [SIX]: "6",
  [SEVEN]: "7",
  [EIGHT]: "8",
  [NINE]: "9",
  [TEN]: "T",
  [JACK]: "J",
  [QUEEN]: "Q",
  [KING]: "K",
  [ACE]: "A",
  [HEARTS]: "h",
  [DIAMONDS]: "d",
  [CLUBS]: "c",
  [SPADES]: "s"
};

export const cardToString = ({ suit, rank }) =>
  `${SYMBOLS[String(rank)]}${SYMBOLS[String(suit)]}`;

export const stringToCard = string => {
  const chars = String(string)
    .trim()
    .split("");
  const suitSign = chars.pop();
  const rankSign = chars.join();
  return {
    suit: ALIASES[suitSign],
    rank: ALIASES[rankSign]
  };
};
