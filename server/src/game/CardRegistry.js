import cardData from "../../../shared/src/cardData.json" with { type: "json" };

const cardsById = new Map();
const cardsByName = new Map();

for (const card of cardData) {
  cardsById.set(card.id, card);
  cardsByName.set(card.name.toLowerCase(), card);
}

export function getCard(id) {
  return cardsById.get(id);
}

export function getCardByName(name) {
  return cardsByName.get(name.toLowerCase());
}

export function getAllCards() {
  return cardData;
}

/** Build the full shared deck with correct copy counts, excluding events */
export function buildDeck() {
  const deck = [];
  for (const card of cardData) {
    if (card.type === "Event") continue;
    for (let i = 0; i < card.copies; i++) {
      deck.push({
        ...card,
        uid: `${card.id}_${i}`,
      });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle */
export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
