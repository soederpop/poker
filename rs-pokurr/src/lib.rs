mod cards;

pub fn test() {
  let mut deck = cards::deck::Deck::new_shuffled();
  let card = deck.draw().ok().unwrap();
  println!("The card is: {}", card);
}
