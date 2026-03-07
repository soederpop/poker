use aya_poker::base::Hand as AyaHand;
use aya_poker::base::CARDS as AYA_CARDS;
use aya_poker::{poker_rank, PokerRankCategory};
use rand::thread_rng;
use rand::Rng;
use serde::Serialize;
use std::cmp::Ordering;
use std::collections::HashSet;
use wasm_bindgen::prelude::*;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
struct Card {
    rank: u8,
    suit: u8,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct HandScore {
    category: u8,
    values: [u8; 5],
}

impl Ord for HandScore {
    fn cmp(&self, other: &Self) -> Ordering {
        if self.category != other.category {
            return self.category.cmp(&other.category);
        }

        self.values.cmp(&other.values)
    }
}

impl PartialOrd for HandScore {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

#[derive(Clone, Debug)]
struct HoleCombo {
    cards: [Card; 2],
    normalized: String,
}

#[derive(Clone, Debug)]
struct SingleFilter {
    item: String,
    rank: u8,
    kicker: u8,
    pair: bool,
    suited: bool,
    offsuit: bool,
    greater: bool,
    weaker: bool,
    connected: bool,
    one_gap: bool,
    two_gap: bool,
    three_gap: bool,
}

#[derive(Clone, Debug)]
enum ComboFilter {
    Single(SingleFilter),
    Ranged { top: SingleFilter, bottom: SingleFilter },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HandRankOutput {
    category: u8,
    label: String,
    value: Vec<u8>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EquityResult {
    best_hand_count: u32,
    tie_hand_count: u32,
    possible_hands_count: u32,
}

#[derive(Serialize)]
struct RangeEquityResult {
    us: String,
    them: String,
    ours: f64,
    theirs: f64,
    tie: f64,
}

#[derive(Clone, Copy)]
struct NormalizedMeta {
    pair: bool,
    suited: bool,
    rank: u8,
    kicker: u8,
}

#[wasm_bindgen]
pub fn version() -> String {
    "0.1.0".to_string()
}

#[wasm_bindgen(js_name = evaluateHand)]
pub fn evaluate_hand(cards: JsValue) -> Result<JsValue, JsValue> {
    let cards: Vec<String> = serde_wasm_bindgen::from_value(cards)
        .map_err(|e| JsValue::from_str(&format!("invalid cards input: {e}")))?;

    let parsed = parse_cards(&cards)?;

    if parsed.len() < 5 || parsed.len() > 7 {
        return Err(JsValue::from_str("evaluateHand expects 5 to 7 cards"));
    }

    let score = evaluate_best(&parsed);
    let output = score_to_output(score);

    serde_wasm_bindgen::to_value(&output)
        .map_err(|e| JsValue::from_str(&format!("failed to serialize hand output: {e}")))
}

#[wasm_bindgen(js_name = equity)]
pub fn equity_export(
    hands: JsValue,
    board: Option<JsValue>,
    iterations: Option<u32>,
) -> Result<JsValue, JsValue> {
    let hands: Vec<Vec<String>> = serde_wasm_bindgen::from_value(hands)
        .map_err(|e| JsValue::from_str(&format!("invalid hands input: {e}")))?;

    let board_cards: Vec<String> = match board {
        Some(value) => serde_wasm_bindgen::from_value(value)
            .map_err(|e| JsValue::from_str(&format!("invalid board input: {e}")))?,
        None => vec![],
    };

    let result = monte_carlo_equity(&hands, &board_cards, iterations.unwrap_or(20_000))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("failed to serialize equity output: {e}")))
}

#[wasm_bindgen(js_name = rangeEquity)]
pub fn range_equity_export(
    range1: String,
    range2: String,
    board: Option<String>,
    iterations: Option<u32>,
) -> Result<JsValue, JsValue> {
    let result = range_equity(
        &range1,
        &range2,
        board.as_deref().unwrap_or(""),
        iterations.unwrap_or(20_000),
    )?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("failed to serialize range equity output: {e}")))
}

fn score_to_output(score: HandScore) -> HandRankOutput {
    let label = match score.category {
        9 => "straight-flush",
        8 => "four-of-a-kind",
        7 => "full-house",
        6 => "flush",
        5 => "straight",
        4 => "three-of-a-kind",
        3 => "two-pair",
        2 => "one-pair",
        _ => "high-card",
    }
    .to_string();

    HandRankOutput {
        category: score.category,
        label,
        value: std::iter::once(score.category)
            .chain(score.values)
            .collect(),
    }
}

fn parse_cards(input: &[String]) -> Result<Vec<Card>, JsValue> {
    let mut cards = Vec::with_capacity(input.len());
    let mut seen = HashSet::new();

    for text in input {
        let card = parse_card(text)?;
        let id = card_id(card);
        if seen.contains(&id) {
            return Err(JsValue::from_str(&format!("duplicate card: {text}")));
        }
        seen.insert(id);
        cards.push(card);
    }

    Ok(cards)
}

fn parse_card(input: &str) -> Result<Card, JsValue> {
    let text = input.trim();
    if text.len() < 2 || text.len() > 3 {
        return Err(JsValue::from_str(&format!("invalid card: {input}")));
    }

    let (rank_text, suit_text) = text.split_at(text.len() - 1);
    let suit_char = suit_text
        .chars()
        .next()
        .ok_or_else(|| JsValue::from_str(&format!("invalid card suit: {input}")))?;

    let rank = parse_rank(rank_text)
        .ok_or_else(|| JsValue::from_str(&format!("invalid card rank: {input}")))?;

    let suit = match suit_char.to_ascii_lowercase() {
        'c' => 0,
        'd' => 1,
        'h' => 2,
        's' => 3,
        _ => return Err(JsValue::from_str(&format!("invalid card suit: {input}"))),
    };

    Ok(Card { rank, suit })
}

fn parse_rank(input: &str) -> Option<u8> {
    match input {
        "2" => Some(2),
        "3" => Some(3),
        "4" => Some(4),
        "5" => Some(5),
        "6" => Some(6),
        "7" => Some(7),
        "8" => Some(8),
        "9" => Some(9),
        "10" | "T" | "t" => Some(10),
        "J" | "j" => Some(11),
        "Q" | "q" => Some(12),
        "K" | "k" => Some(13),
        "A" | "a" => Some(14),
        _ => None,
    }
}

fn rank_to_symbol(rank: u8) -> &'static str {
    match rank {
        2 => "2",
        3 => "3",
        4 => "4",
        5 => "5",
        6 => "6",
        7 => "7",
        8 => "8",
        9 => "9",
        10 => "T",
        11 => "J",
        12 => "Q",
        13 => "K",
        14 => "A",
        _ => "?",
    }
}

fn card_id(card: Card) -> u8 {
    ((card.rank - 2) * 4) + card.suit
}

const EMPTY_CARD: Card = Card { rank: 2, suit: 0 };

fn all_cards() -> Vec<Card> {
    let mut cards = Vec::with_capacity(52);
    for rank in 2..=14 {
        for suit in 0..=3 {
            cards.push(Card { rank, suit });
        }
    }
    cards
}

#[inline]
fn category_from_poker_rank(category: PokerRankCategory) -> u8 {
    match category {
        PokerRankCategory::Ineligible => 0,
        PokerRankCategory::HighCard => 1,
        PokerRankCategory::Pair => 2,
        PokerRankCategory::TwoPair => 3,
        PokerRankCategory::ThreeOfAKind => 4,
        PokerRankCategory::Straight => 5,
        PokerRankCategory::Flush => 6,
        PokerRankCategory::FullHouse => 7,
        PokerRankCategory::FourOfAKind => 8,
        PokerRankCategory::StraightFlush | PokerRankCategory::RoyalFlush => 9,
    }
}

#[inline]
fn evaluate_fast(cards: &[Card]) -> HandScore {
    let mut hand = AyaHand::new();
    for card in cards {
        let aya = AYA_CARDS[card_id(*card) as usize];
        hand.insert_unchecked(&aya);
    }

    let ranked = poker_rank(&hand);
    let category = category_from_poker_rank(ranked.rank_category());
    let hi = (ranked.0 >> 8) as u8;
    let lo = (ranked.0 & 0xFF) as u8;

    HandScore {
        category,
        values: [hi, lo, 0, 0, 0],
    }
}

fn evaluate_best(cards: &[Card]) -> HandScore {
    match cards.len() {
        5 => {
            let arr = [cards[0], cards[1], cards[2], cards[3], cards[4]];
            evaluate_five(&arr)
        }
        6 | 7 => evaluate_fast(cards),
        _ => HandScore {
            category: 0,
            values: [0; 5],
        },
    }
}

#[inline]
fn evaluate_five(cards: &[Card; 5]) -> HandScore {
    let mut rank_counts = [0u8; 15];
    let mut suit_counts = [0u8; 4];

    for card in cards {
        rank_counts[card.rank as usize] += 1;
        suit_counts[card.suit as usize] += 1;
    }

    let is_flush = suit_counts.iter().any(|c| *c == 5);
    let straight_high = find_straight_high(&rank_counts);

    if is_flush {
        if let Some(high) = straight_high {
            return HandScore {
                category: 9,
                values: [high, 0, 0, 0, 0],
            };
        }
    }

    let mut four_kind = 0u8;
    let mut three_kind = [0u8; 2];
    let mut three_count = 0usize;
    let mut pairs = [0u8; 3];
    let mut pair_count = 0usize;
    let mut singles = [0u8; 5];
    let mut singles_count = 0usize;

    for rank in (2u8..=14).rev() {
        match rank_counts[rank as usize] {
            4 => four_kind = rank,
            3 => {
                three_kind[three_count] = rank;
                three_count += 1;
            }
            2 => {
                pairs[pair_count] = rank;
                pair_count += 1;
            }
            1 => {
                singles[singles_count] = rank;
                singles_count += 1;
            }
            _ => {}
        }
    }

    if four_kind > 0 {
        return HandScore {
            category: 8,
            values: [four_kind, singles[0], 0, 0, 0],
        };
    }

    if three_count > 0 && (pair_count > 0 || three_count > 1) {
        let pair_rank = if pair_count > 0 {
            pairs[0]
        } else {
            three_kind[1]
        };
        return HandScore {
            category: 7,
            values: [three_kind[0], pair_rank, 0, 0, 0],
        };
    }

    if is_flush {
        return HandScore {
            category: 6,
            values: sorted_ranks_desc(&rank_counts),
        };
    }

    if let Some(high) = straight_high {
        return HandScore {
            category: 5,
            values: [high, 0, 0, 0, 0],
        };
    }

    if three_count > 0 {
        return HandScore {
            category: 4,
            values: [three_kind[0], singles[0], singles[1], 0, 0],
        };
    }

    if pair_count >= 2 {
        return HandScore {
            category: 3,
            values: [pairs[0], pairs[1], singles[0], 0, 0],
        };
    }

    if pair_count == 1 {
        return HandScore {
            category: 2,
            values: [pairs[0], singles[0], singles[1], singles[2], 0],
        };
    }

    HandScore {
        category: 1,
        values: sorted_ranks_desc(&rank_counts),
    }
}

#[inline]
fn sorted_ranks_desc(rank_counts: &[u8; 15]) -> [u8; 5] {
    let mut out = [0u8; 5];
    let mut idx = 0usize;

    for rank in (2u8..=14).rev() {
        let count = rank_counts[rank as usize];
        for _ in 0..count {
            out[idx] = rank;
            idx += 1;
        }
    }

    out
}

fn find_straight_high(rank_counts: &[u8; 15]) -> Option<u8> {
    for high in (5..=14).rev() {
        if high == 5 {
            if rank_counts[14] > 0
                && rank_counts[5] > 0
                && rank_counts[4] > 0
                && rank_counts[3] > 0
                && rank_counts[2] > 0
            {
                return Some(5);
            }
            continue;
        }

        let mut ok = true;
        for r in (high - 4)..=high {
            if rank_counts[r as usize] == 0 {
                ok = false;
                break;
            }
        }

        if ok {
            return Some(high);
        }
    }

    None
}

#[inline]
fn draw_unique_from_pool(
    pool: &[Card],
    take: usize,
    out: &mut [Card; 5],
    rng: &mut impl Rng,
) {
    if take == 0 {
        return;
    }

    let mut chosen = [usize::MAX; 5];
    for i in 0..take {
        loop {
            let idx = rng.gen_range(0..pool.len());
            if !chosen[..i].contains(&idx) {
                chosen[i] = idx;
                out[i] = pool[idx];
                break;
            }
        }
    }
}

fn monte_carlo_equity(
    hands_input: &[Vec<String>],
    board_input: &[String],
    iterations: u32,
) -> Result<Vec<EquityResult>, JsValue> {
    if hands_input.len() < 2 {
        return Err(JsValue::from_str("equity expects at least 2 hands"));
    }

    let mut hands: Vec<[Card; 2]> = Vec::with_capacity(hands_input.len());
    let mut seen = HashSet::new();

    for hand in hands_input {
        if hand.len() != 2 {
            return Err(JsValue::from_str("each hand must contain exactly 2 cards"));
        }

        let parsed = parse_cards(hand)?;
        let pair = [parsed[0], parsed[1]];

        for card in &pair {
            let id = card_id(*card);
            if seen.contains(&id) {
                return Err(JsValue::from_str("duplicate card across hands"));
            }
            seen.insert(id);
        }

        hands.push(pair);
    }

    let board_cards = parse_cards(board_input)?;
    if board_cards.len() > 5 {
        return Err(JsValue::from_str("board cannot have more than 5 cards"));
    }

    for card in &board_cards {
        let id = card_id(*card);
        if seen.contains(&id) {
            return Err(JsValue::from_str("duplicate card between board and hands"));
        }
        seen.insert(id);
    }

    let mut best_hand_count = vec![0u32; hands.len()];
    let mut tie_hand_count = vec![0u32; hands.len()];

    let all = all_cards();
    let dead = seen;
    let available: Vec<Card> = all
        .iter()
        .copied()
        .filter(|card| !dead.contains(&card_id(*card)))
        .collect();
    let mut rng = thread_rng();
    let board_len = board_cards.len();
    let need_board = 5usize.saturating_sub(board_len);
    let mut board = [EMPTY_CARD; 5];
    for (i, card) in board_cards.iter().enumerate() {
        board[i] = *card;
    }
    let mut drawn = [EMPTY_CARD; 5];
    let mut winners = Vec::with_capacity(hands.len());

    for _ in 0..iterations {
        draw_unique_from_pool(&available, need_board, &mut drawn, &mut rng);
        for i in 0..need_board {
            board[board_len + i] = drawn[i];
        }

        winners.clear();
        let mut best = HandScore {
            category: 0,
            values: [0; 5],
        };

        for (idx, hand) in hands.iter().enumerate() {
            let seven = [hand[0], hand[1], board[0], board[1], board[2], board[3], board[4]];
            let score = evaluate_fast(&seven);

            if winners.is_empty() || score > best {
                best = score;
                winners.clear();
                winners.push(idx);
            } else if score == best {
                winners.push(idx);
            }
        }

        if winners.len() == 1 {
            best_hand_count[winners[0]] += 1;
        } else {
            for winner in &winners {
                tie_hand_count[*winner] += 1;
            }
        }
    }

    let results = (0..hands.len())
        .map(|i| EquityResult {
            best_hand_count: best_hand_count[i],
            tie_hand_count: tie_hand_count[i],
            possible_hands_count: iterations,
        })
        .collect();

    Ok(results)
}

fn range_equity(
    range1: &str,
    range2: &str,
    board: &str,
    iterations: u32,
) -> Result<RangeEquityResult, JsValue> {
    let board_cards = parse_board(board)?;
    let all_combos = all_hole_combos();

    let range1_combos = combos_for_range(range1, &all_combos, &board_cards)?;
    let range2_combos = combos_for_range(range2, &all_combos, &board_cards)?;

    if range1_combos.is_empty() || range2_combos.is_empty() {
        return Ok(RangeEquityResult {
            us: range1.to_string(),
            them: range2.to_string(),
            ours: 0.0,
            theirs: 0.0,
            tie: 0.0,
        });
    }

    let all = all_cards();
    let mut board_dead = [false; 52];
    for card in &board_cards {
        board_dead[card_id(*card) as usize] = true;
    }
    let mut rng = thread_rng();

    let mut our_wins = 0u32;
    let mut their_wins = 0u32;
    let mut ties = 0u32;
    let mut sims = 0u32;
    let board_len = board_cards.len();
    let need_board = 5usize.saturating_sub(board_len);
    let mut full_board = [EMPTY_CARD; 5];
    for (idx, card) in board_cards.iter().enumerate() {
        full_board[idx] = *card;
    }
    let mut available = [EMPTY_CARD; 52];
    let mut drawn = [EMPTY_CARD; 5];

    for _ in 0..iterations {
        let mut selected: Option<(&HoleCombo, &HoleCombo)> = None;

        for _ in 0..100 {
            let c1 = range1_combos[rng.gen_range(0..range1_combos.len())];
            let c2 = range2_combos[rng.gen_range(0..range2_combos.len())];

            if combos_overlap(c1, c2) {
                continue;
            }

            selected = Some((c1, c2));
            break;
        }

        let (combo1, combo2) = match selected {
            Some(pair) => pair,
            None => continue,
        };

        let mut dead_flags = board_dead;
        for card in combo1.cards.iter().chain(combo2.cards.iter()) {
            dead_flags[card_id(*card) as usize] = true;
        }

        let mut available_len = 0usize;
        for card in &all {
            let id = card_id(*card) as usize;
            if !dead_flags[id] {
                available[available_len] = *card;
                available_len += 1;
            }
        }

        draw_unique_from_pool(
            &available[..available_len],
            need_board,
            &mut drawn,
            &mut rng,
        );

        for i in 0..need_board {
            full_board[board_len + i] = drawn[i];
        }

        let hand1 = [
            combo1.cards[0],
            combo1.cards[1],
            full_board[0],
            full_board[1],
            full_board[2],
            full_board[3],
            full_board[4],
        ];

        let hand2 = [
            combo2.cards[0],
            combo2.cards[1],
            full_board[0],
            full_board[1],
            full_board[2],
            full_board[3],
            full_board[4],
        ];

        let score1 = evaluate_fast(&hand1);
        let score2 = evaluate_fast(&hand2);

        if score1 > score2 {
            our_wins += 1;
        } else if score2 > score1 {
            their_wins += 1;
        } else {
            ties += 1;
        }

        sims += 1;
    }

    if sims == 0 {
        return Ok(RangeEquityResult {
            us: range1.to_string(),
            them: range2.to_string(),
            ours: 0.0,
            theirs: 0.0,
            tie: 0.0,
        });
    }

    let divisor = sims as f64;

    Ok(RangeEquityResult {
        us: range1.to_string(),
        them: range2.to_string(),
        ours: ((our_wins as f64 / divisor) * 10000.0).round() / 100.0,
        theirs: ((their_wins as f64 / divisor) * 10000.0).round() / 100.0,
        tie: ((ties as f64 / divisor) * 10000.0).round() / 100.0,
    })
}

fn parse_board(board: &str) -> Result<Vec<Card>, JsValue> {
    let trimmed = board.trim();
    if trimmed.is_empty() {
        return Ok(vec![]);
    }

    if trimmed.len() % 2 != 0 {
        return Err(JsValue::from_str("board must be an even-length concatenated card string"));
    }

    let mut cards = Vec::with_capacity(trimmed.len() / 2);
    let chars: Vec<char> = trimmed.chars().collect();

    let mut i = 0;
    while i < chars.len() {
        let text = format!("{}{}", chars[i], chars[i + 1]);
        cards.push(parse_card(&text)?);
        i += 2;
    }

    Ok(cards)
}

fn all_hole_combos() -> Vec<HoleCombo> {
    let cards = all_cards();
    let mut combos = Vec::with_capacity(1326);

    for i in 0..cards.len() {
        for j in (i + 1)..cards.len() {
            let c1 = cards[i];
            let c2 = cards[j];
            let sorted = sort_hole_cards(c1, c2);
            combos.push(HoleCombo {
                cards: sorted,
                normalized: normalize_hole(sorted),
            });
        }
    }

    combos
}

fn sort_hole_cards(a: Card, b: Card) -> [Card; 2] {
    if a.rank > b.rank {
        [a, b]
    } else if b.rank > a.rank {
        [b, a]
    } else if a.suit <= b.suit {
        [a, b]
    } else {
        [b, a]
    }
}

fn normalize_hole(cards: [Card; 2]) -> String {
    let a = cards[0];
    let b = cards[1];

    if a.rank == b.rank {
        return format!("{}{}", rank_to_symbol(a.rank), rank_to_symbol(b.rank));
    }

    let suited = if a.suit == b.suit { "s" } else { "o" };
    format!("{}{}{}", rank_to_symbol(a.rank), rank_to_symbol(b.rank), suited)
}

fn combos_for_range<'a>(
    range_input: &str,
    all_combos: &'a [HoleCombo],
    dead_cards: &[Card],
) -> Result<Vec<&'a HoleCombo>, JsValue> {
    let filters = parse_range(range_input)?;
    let dead_ids: HashSet<u8> = dead_cards.iter().map(|c| card_id(*c)).collect();

    let normalized_universe = normalized_universe();
    let normalized_set: HashSet<String> = normalized_universe
        .into_iter()
        .filter(|normalized| filters.iter().any(|filter| filter_normalized(normalized, filter)))
        .collect();

    let combos = all_combos
        .iter()
        .filter(|combo| {
            normalized_set.contains(&combo.normalized)
                && !combo
                    .cards
                    .iter()
                    .any(|card| dead_ids.contains(&card_id(*card)))
        })
        .collect();

    Ok(combos)
}

fn normalized_universe() -> Vec<String> {
    let mut items = Vec::with_capacity(169);

    for high in (2u8..=14).rev() {
        for low in (2u8..=14).rev() {
            if high == low {
                items.push(format!("{}{}", rank_to_symbol(high), rank_to_symbol(low)));
            } else if high > low {
                items.push(format!("{}{}s", rank_to_symbol(high), rank_to_symbol(low)));
                items.push(format!("{}{}o", rank_to_symbol(high), rank_to_symbol(low)));
            }
        }
    }

    items
}

fn combos_overlap(left: &HoleCombo, right: &HoleCombo) -> bool {
    left.cards
        .iter()
        .any(|l| right.cards.iter().any(|r| card_id(*l) == card_id(*r)))
}

fn parse_range(input: &str) -> Result<Vec<ComboFilter>, JsValue> {
    let items: Vec<&str> = input
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    if items.is_empty() {
        return Ok(vec![]);
    }

    let mut filters = Vec::with_capacity(items.len());

    for item in items {
        if let Some((left, right)) = item.split_once('-') {
            let mut top = expand_hand(left.trim())?;
            let mut bottom = expand_hand(right.trim())?;

            if (bottom.rank, bottom.kicker) > (top.rank, top.kicker) {
                std::mem::swap(&mut top, &mut bottom);
            }

            if top.rank == bottom.rank && !top.pair && !bottom.pair {
                top.weaker = true;
                top.connected = false;
                top.one_gap = false;
                top.two_gap = false;
                top.three_gap = false;

                bottom.greater = true;
                bottom.connected = false;
                bottom.one_gap = false;
                bottom.two_gap = false;
                bottom.three_gap = false;
            }

            filters.push(ComboFilter::Ranged { top, bottom });
        } else {
            filters.push(ComboFilter::Single(expand_hand(item)?));
        }
    }

    Ok(filters)
}

fn expand_hand(input: &str) -> Result<SingleFilter, JsValue> {
    let chars: Vec<char> = input.chars().collect();
    if chars.len() < 2 {
        return Err(JsValue::from_str(&format!("invalid hand notation: {input}")));
    }

    let rank_one = rank_char_value(chars[0])
        .ok_or_else(|| JsValue::from_str(&format!("invalid rank in notation: {input}")))?;
    let rank_two = rank_char_value(chars[1])
        .ok_or_else(|| JsValue::from_str(&format!("invalid rank in notation: {input}")))?;

    let modifier: String = chars.iter().skip(2).collect();

    let high = rank_one.max(rank_two);
    let low = rank_one.min(rank_two);

    Ok(SingleFilter {
        item: input.to_string(),
        rank: high,
        kicker: low,
        pair: rank_one == rank_two,
        suited: modifier.to_lowercase().starts_with('s'),
        offsuit: modifier.to_lowercase().starts_with('o'),
        greater: modifier.ends_with('+'),
        weaker: modifier.ends_with('-'),
        connected: if high == 14 {
            low == 2 || low == 13
        } else {
            high.saturating_sub(low) == 1
        },
        one_gap: if high == 14 {
            low == 3 || low == 12
        } else {
            high.saturating_sub(low) == 2
        },
        two_gap: if high == 14 {
            low == 4 || low == 11
        } else {
            high.saturating_sub(low) == 3
        },
        three_gap: if high == 14 {
            low == 5 || low == 10
        } else {
            high.saturating_sub(low) == 4
        },
    })
}

fn rank_char_value(ch: char) -> Option<u8> {
    match ch.to_ascii_uppercase() {
        '2' => Some(2),
        '3' => Some(3),
        '4' => Some(4),
        '5' => Some(5),
        '6' => Some(6),
        '7' => Some(7),
        '8' => Some(8),
        '9' => Some(9),
        'T' => Some(10),
        'J' => Some(11),
        'Q' => Some(12),
        'K' => Some(13),
        'A' => Some(14),
        _ => None,
    }
}

fn filter_normalized(name: &str, filter: &ComboFilter) -> bool {
    match filter {
        ComboFilter::Single(single) => filter_single(name, single),
        ComboFilter::Ranged { top, bottom } => {
            let mut top_filter = top.clone();
            top_filter.weaker = true;

            let mut bottom_filter = bottom.clone();
            bottom_filter.greater = true;

            filter_single(name, &top_filter) && filter_single(name, &bottom_filter)
        }
    }
}

fn filter_single(name: &str, filter: &SingleFilter) -> bool {
    if name == filter.item {
        return true;
    }

    let meta = match normalized_meta(name) {
        Some(meta) => meta,
        None => return false,
    };

    if filter.suited && !meta.suited {
        return false;
    }

    if filter.offsuit && meta.suited {
        return false;
    }

    if filter.pair {
        if !meta.pair {
            return false;
        }

        if filter.greater && meta.rank < filter.rank {
            return false;
        }

        if filter.weaker && meta.rank > filter.rank {
            return false;
        }

        if !filter.greater && !filter.weaker && meta.rank != filter.rank {
            return false;
        }

        return true;
    }

    if filter.greater {
        if meta.rank == filter.kicker && meta.kicker < filter.rank {
            return false;
        }

        if meta.kicker < filter.kicker {
            return false;
        }

        if meta.rank != filter.rank && meta.kicker != filter.rank {
            return false;
        }

        return true;
    }

    if filter.weaker {
        if meta.rank != filter.rank && meta.kicker != filter.rank {
            return false;
        }

        if meta.rank == filter.rank && meta.kicker > filter.kicker {
            return false;
        }

        return true;
    }

    meta.rank == filter.rank && meta.kicker == filter.kicker
}

fn normalized_meta(name: &str) -> Option<NormalizedMeta> {
    let chars: Vec<char> = name.chars().collect();
    if chars.len() < 2 {
        return None;
    }

    let r1 = rank_char_value(chars[0])?;
    let r2 = rank_char_value(chars[1])?;

    if r1 == r2 {
        return Some(NormalizedMeta {
            pair: true,
            suited: false,
            rank: r1,
            kicker: r2,
        });
    }

    let suited = matches!(chars.get(2), Some('s') | Some('S'));

    Some(NormalizedMeta {
        pair: false,
        suited,
        rank: r1.max(r2),
        kicker: r1.min(r2),
    })
}

#[cfg(test)]
fn distinct_five_card_classes_count() -> usize {
    let deck = all_cards();
    let mut set: HashSet<(u8, [u8; 5])> = HashSet::new();

    for a in 0..(deck.len() - 4) {
        for b in (a + 1)..(deck.len() - 3) {
            for c in (b + 1)..(deck.len() - 2) {
                for d in (c + 1)..(deck.len() - 1) {
                    for e in (d + 1)..deck.len() {
                        let hand = [deck[a], deck[b], deck[c], deck[d], deck[e]];
                        let score = evaluate_five(&hand);
                        set.insert((score.category, score.values));
                    }
                }
            }
        }
    }

    set.len()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_many(items: &[&str]) -> Vec<Card> {
        items
            .iter()
            .map(|s| parse_card(s).unwrap())
            .collect::<Vec<_>>()
    }

    #[test]
    fn evaluates_five_and_seven_card_hands() {
        let sf = evaluate_best(&parse_many(&["Ah", "Kh", "Qh", "Jh", "Th", "2c", "3d"]));
        let quads = evaluate_best(&parse_many(&["As", "Ad", "Ac", "Ah", "2c", "3d", "4h"]));
        assert!(sf > quads, "straight flush should beat quads");
    }

    #[test]
    fn counts_all_7462_distinct_five_card_classes() {
        assert_eq!(distinct_five_card_classes_count(), 7462);
    }

    #[test]
    fn parses_range_notation_examples() {
        let all = all_hole_combos();
        let combos = combos_for_range("KTs+", &all, &[]).unwrap();
        let normalized: HashSet<String> = combos.iter().map(|c| c.normalized.clone()).collect();

        assert!(normalized.contains("KTs"));
        assert!(normalized.contains("KJs"));
        assert!(normalized.contains("KQs"));
        assert!(normalized.contains("AKs"));
    }

    #[test]
    fn monte_carlo_aa_vs_kk() {
        let hands = vec![
            vec!["Ah".to_string(), "Ad".to_string()],
            vec!["Kh".to_string(), "Kd".to_string()],
        ];

        let result = monte_carlo_equity(&hands, &[], 20_000).unwrap();
        let aa_win = (result[0].best_hand_count as f64 / result[0].possible_hands_count as f64) * 100.0;
        let kk_win = (result[1].best_hand_count as f64 / result[1].possible_hands_count as f64) * 100.0;

        assert!(aa_win > 78.0);
        assert!(kk_win < 22.0);
    }
}
