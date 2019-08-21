mod cards;

pub fn test() {
  let mut deck = cards::deck::Deck::new_shuffled();
  let card1 = deck.draw().ok().unwrap();
  let card2 = deck.draw().ok().unwrap();
  println!("Card One: {}", card1);
  println!("Card Two: {}", card2);
}
