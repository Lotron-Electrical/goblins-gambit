# Goblins Gambit — Story Mode Spec & Rule Sheet

> **Purpose:** Reference document for development. Covers every story mode system, mechanic, value, and rule.

---

## 1. Overview

Story Mode is a single-player roguelike campaign where the player creates a custom creature card and battles through 6 themed levels of increasing difficulty. Between battles, the player upgrades their card via enhancements. The run ends when the player defeats all 6 bosses (victory) or loses all lives (defeat).

Inspired by games like **Peglin** and **Inscryption** — each run has a randomized map with branching paths mixing battles and enhancement opportunities.

---

## 2. Starting a Run

### Card Creation

- Player enters a **creature name** (max 20 characters)
- Selects from 4 card art options (`player_card_1.jpg` – `player_card_4.jpg`)
- Optionally toggles **Nightmare Mode**

### Custom Card Starting Stats

| Mode      | ATK | DEF | SP  |
| --------- | --- | --- | --- |
| Normal    | 100 | 100 | 100 |
| Nightmare | 50  | 50  | 50  |

### Card Properties

- `id`: `"custom_creature"`
- `type`: Creature
- `cost`: 1 AP
- `copies`: 1
- `abilityId`: None (gained via enhancements)
- `isCustomCard`: true
- `_drawChanceBoost`: 0 (increased via enhancements)

### Starting Lives

| Mode      | Lives |
| --------- | ----- |
| Normal    | 3     |
| Nightmare | 2     |

---

## 3. Level Progression

Six levels, played in order. Each has its own theme, difficulty, card pool, and boss.

| #   | Level   | Theme          | Difficulty | Bonus AP | Win SP Range | Card Pool | Boss            |
| --- | ------- | -------------- | ---------- | -------- | ------------ | --------- | --------------- |
| 1   | Tavern  | Swamp (normal) | Easy       | +1       | 2,000–3,000  | Limited   | Knuckles McGraw |
| 2   | Hills   | Swamp (normal) | Easy+      | +1       | 2,000–4,000  | Expanded  | Redhand Rex     |
| 3   | Swamp   | Swamp (normal) | Medium     | +0       | 3,000–4,000  | All       | Mother Murk     |
| 4   | Tundra  | Frost          | Medium+    | +0       | 3,000–5,000  | All       | Jarl Rimeclaw   |
| 5   | Cliffs  | Blood Moon     | Hard-      | +0       | 4,000–6,000  | All       | Vertigo Vex     |
| 6   | Volcano | Inferno        | Hard       | +0       | 6,000–10,000 | All       | Ignatius Rex    |

### Theme Effects

| Theme      | ATK Mult | DEF Mult | Spell Cost | AP Penalty | Berserk | Description                                      |
| ---------- | -------- | -------- | ---------- | ---------- | ------- | ------------------------------------------------ |
| Swamp      | 1x       | 1x       | 1x         | 0          | Off     | Normal — no modifiers                            |
| Frost      | 1x       | 1.5x     | Free       | -1 AP/turn | Off     | Defensive — high DEF, free spells, less AP       |
| Blood Moon | 1.5x     | 1x       | 2x AP      | 0          | 2x      | Aggressive — high ATK, expensive spells, berserk |
| Inferno    | 1.5x     | 1.5x     | Free       | 0          | 2x      | Everything amplified — all stats up, berserk on  |

### AP Calculation

- Base AP: 2 (from constants)
- Level bonus AP added on top (Tavern/Hills: +1)
- Encumbrance system still applies (hand size modifies AP)
- Theme AP penalty applied after (Frost: -1)

---

## 4. Map System

Each level generates a randomized node map with branching paths.

### Structure

- **5 rows** (0–4)
- **Row 0:** Single start node (always a battle, always revealed)
- **Rows 1–3:** 2–3 nodes each, randomly assigned as battle (~60%) or enhancement (~40%)
- **Row 4:** Single boss node

### Connections

- Each node connects to 1–2 nodes in the next row
- Every node guaranteed at least one incoming connection
- Player progresses forward only (no backtracking)

### Visibility

- Rows 0 and 1 start revealed
- Further rows revealed when parent nodes are completed

### Dungeon Visualization

- Rendered as a pixel-art dungeon crawler on HTML canvas
- **Grid:** 40×16 tiles, tile size 16px
- **Rooms:** 5–8 wide × 5–7 tall, generated from nodes
- **Corridors:** Connected via A\* pathfinding
- **Doors:** Locked (unselectable), open (selectable/completed)
- **Fog of War:** Visibility radius of 4 tiles
- **Movement:** Click-to-move, 120ms per tile step
- **Encounters:** Triggered when player enters room center
- **Stairs:** Appear in boss room after defeating boss → triggers level transition

### Level Themes (Dungeon Colors)

| Level   | Floor           | Walls     | Doors   |
| ------- | --------------- | --------- | ------- |
| Tavern  | Brown/gold      | Gray      | Orange  |
| Hills   | Green           | Brown     | Green   |
| Swamp   | Dark green/teal | Dark      | Emerald |
| Tundra  | Light blue/gray | Cool gray | Blue    |
| Cliffs  | Gray stone      | Dark gray | Stone   |
| Volcano | Dark red/brown  | Black     | Red     |

---

## 5. Battle System

### Setup

- Fresh GameEngine instance per battle
- Player vs. 1 bot opponent
- Win SP threshold randomly selected from level's range (in 1,000 increments)
- Player's custom card injected into starting hand
- Level theme effects applied

### Bot Difficulty Scaling

| Difficulty | Skip % | Lethal Detection | Abilities | AP Buying    | Notes                    |
| ---------- | ------ | ---------------- | --------- | ------------ | ------------------------ |
| Easy       | 40%    | No               | No        | No           | Random card choices      |
| Easy+      | 20%    | No               | No        | No           | Slightly smarter         |
| Medium     | 0%     | No               | Yes       | No           | Focus-fire, smart plays  |
| Medium+    | 0%     | Yes              | Yes       | No           | Aggressive, lethal-aware |
| Hard-      | 0%     | Yes              | Yes       | No           | Full intelligence        |
| Hard       | 0%     | Yes              | Yes       | Yes (>2k SP) | Maximum intelligence     |

### Bot Decision Priority

1. Detect lethal opportunity (medium+ only)
2. Play high-value cards
3. Attack creatures (focus-fire coordination)
4. Use activated abilities (medium+)
5. Draw if hand < 5
6. Buy AP (hard only, >2,000 SP, AP ≤ 1)
7. Recycle dying creatures (medium+)
8. Event actions
9. Draw if hand < 10
10. End turn

### Battle Outcomes

**Win:**

- `battlesWon` stat incremented
- SP earned added to stats
- Node marked completed
- Transition back to dungeon map

**Loss (lives remaining):**

- `battlesLost` stat incremented
- Lose 1 life
- Non-boss nodes: marked completed (can proceed past)
- Boss nodes: NOT marked completed (can retry)

**Loss (no lives remaining):**

- Run over — defeat screen

---

## 6. Card Pools

### Limited Pool (Tavern)

Creatures: Happy Hippy, Lesser Goblin, Stoner, Streamer, Nerd, Nerdet, Gamer Boy, Wood Elf, Viper, Gabber, Book Witch
Magic: Smesh, Ooft, Thicc, Lerker, Trick SP, Horse Dice
Armour: Rusty set, Hessian set

### Expanded Pool (Hills)

Everything in Limited, plus:
Creatures: King Goblin, Ghost, Thief, Karen, Catfish, Motherdazer, Digital Artist, Swapeewee
Magic: Savage, Yeet, Finesse, Ama, STFU
Armour: Lucky set

### All Pool (Swamp, Tundra, Cliffs, Volcano)

All cards in the game except Event cards.

---

## 7. Enhancement System

Enhancement nodes present **3 random upgrade options**. Player picks exactly 1.

### Enhancement Types

| Type                 | Effect                        | Available Levels                |
| -------------------- | ----------------------------- | ------------------------------- |
| Stat Boost (ATK)     | +50, +100, or +200 ATK        | All                             |
| Stat Boost (DEF)     | +50, +100, or +200 DEF        | All                             |
| Stat Boost (SP)      | +50, +100, or +200 SP         | All                             |
| Ability Grant        | Adds one ability to card      | Hills+ (if card has no ability) |
| Life Recovery        | +1 life (capped at max)       | Swamp, Tundra, Cliffs           |
| Draw Boost           | Increases draw frequency      | Swamp+                          |
| Berserk Charm (item) | One-use: 2x ATK for 10 turns  | Tundra, Cliffs, Volcano         |
| Sock Satchel (item)  | One-use: summon a trophy card | Cliffs, Volcano                 |

### Available Abilities

Sweep, Dodge, Streamer Draw, Shield, Burn, Viper Sting, Ghost

### Generation Rules

- 3 unique options per node (deduplicated by description)
- Ability option skipped if card already has one
- Life recovery skipped if at max lives
- Items skipped if already owned (unused)
- Volcano level: items-only pool with larger stat boosts (+300 ATK/DEF)

### Stat Growth

- No soft caps — stats can grow indefinitely
- SP always increases alongside ATK/DEF boosts
- Draw boost increments `_drawChanceBoost` counter

---

## 8. Items

### Berserk Charm

- **Effect:** Doubles ATK of all player's creatures for 10 turns
- **Implementation:** Adds `_attackBuff` equal to base ATK, tracks `_berserkCharmTurnsLeft`
- **Usage:** One-time activation during any battle

### Sock Satchel Portal

- **Effect:** Summon a trophy card from a previous run into current hand
- **Requirement:** Must have trophy cards from completed runs
- **Implementation:** Opens trophy picker modal, selected card added to hand as creature
- **Constraint:** Hand must have space (max 10 cards)
- **Usage:** One-time activation during any battle

---

## 9. Characters & Opponents

Each level has 5 regular opponents and 1 boss. Characters are randomly assigned to battle nodes (no repeats within a level).

### Tavern

- Regulars: Grog the Barkeep, Dizzy the Barmaid, Old Rattlebones, Mugface the Regular, Squint the Gambler
- **Boss: Knuckles McGraw**

### Hills

- Regulars: Dusty Pete, Rockjaw, Bramble the Scout, Windy Meg, Stumpy
- **Boss: Redhand Rex**

### Swamp

- Regulars: Bogsworth, Leech Queen, Mudgulp, Sporetoad, Rotwood
- **Boss: Mother Murk**

### Tundra

- Regulars: Frostbite Frank, Icicle Irene, Snowdrift, The Yeti's Shadow, Glacius
- **Boss: Jarl Rimeclaw**

### Cliffs

- Regulars: Gale the Drifter, Stonetalon, Cliffhanger, Sky Shrieker, Ledge Lurker
- **Boss: Vertigo Vex**

### Volcano

- Regulars: Cinderfang, Magmaw, Ashwalker, Ember Eye, Pyroclast
- **Boss: Ignatius Rex**

### Dialogue

Each character has: intro, win, and lose lines. Bosses additionally have taunt lines.

---

## 10. Lives & Death

| Event                     | Effect                                             |
| ------------------------- | -------------------------------------------------- |
| Lose a battle             | -1 life                                            |
| Lose vs non-boss          | Node marked completed, can proceed                 |
| Lose vs boss              | Node NOT completed, can retry with remaining lives |
| Lives reach 0             | Run over — defeat                                  |
| Life Recovery enhancement | +1 life (capped at 3 normal / 2 nightmare)         |

---

## 11. Victory & Defeat

### Victory Condition

Defeat all 6 level bosses (complete all levels).

### Defeat Condition

Lose all lives.

### Run Over Screen

Displays final stats:

- Battles won/lost
- Levels cleared
- Enhancements picked
- SP earned
- Creatures killed
- Final custom card stats

**Victory path:** View Trophies, Play Again, Back to Lobby
**Defeat path:** Play Again, Back to Lobby

---

## 12. Trophy System

### Trophy Cabinet

- Custom card saved as trophy after run completion
- Stored permanently per account
- Viewable from story mode menu or run over screen

### Trophy Data

- Card name, image, final stats (ATK/DEF/SP)
- Level reached
- Nightmare mode badge
- Completion timestamp

### Achievements

| Achievement          | Condition                          |
| -------------------- | ---------------------------------- |
| `first_blood`        | Win first battle                   |
| `tavern_regular`     | Win 5+ battles in a run            |
| `goblin_slayer`      | Kill 50+ creatures                 |
| `story_complete`     | Complete all 6 levels              |
| `fully_loaded`       | Card reaches 500+ in all stats     |
| `nightmare_survivor` | Complete all 6 levels in nightmare |

---

## 13. Persistence & Saving

- Runs can be saved between battles (not during)
- Full run state persisted (stats, card, items, completed nodes, level index)
- Storage: PostgreSQL (if `DATABASE_URL` set) or JSON file fallback
- Can load in-progress run from story mode menu

### Data Tables

- `gg_story_runs`: Current run per username
- `gg_story_trophies`: All completed trophy cards
- `gg_story_achievements`: Unlocked achievements per user

---

## 14. Socket Events

| Event                    | Direction       | Purpose                                          |
| ------------------------ | --------------- | ------------------------------------------------ |
| `STORY_START_RUN`        | Client → Server | Start new run with card name + nightmare flag    |
| `STORY_LOAD_RUN`         | Client → Server | Load saved in-progress run                       |
| `STORY_SELECT_NODE`      | Client → Server | Select map node (triggers battle or enhancement) |
| `story_game_action`      | Client → Server | In-battle action (replaces normal `GAME_ACTION`) |
| `STORY_PICK_ENHANCEMENT` | Client → Server | Choose 1 of 3 enhancement options                |
| `STORY_USE_ITEM`         | Client → Server | Activate an item during battle                   |
| `STORY_SELECT_TROPHY`    | Client → Server | Choose trophy card for Sock Satchel              |
| `STORY_SAVE_RUN`         | Client → Server | Save current run                                 |
| `STORY_GET_TROPHIES`     | Client → Server | Fetch trophy cabinet + achievements              |
| `STORY_BATTLE_RESULT`    | Server → Client | Battle outcome + updated run state               |

---

## 15. Nightmare Mode

| Aspect            | Normal           | Nightmare            |
| ----------------- | ---------------- | -------------------- |
| Starting lives    | 3                | 2                    |
| Starting stats    | 100/100/100      | 50/50/50             |
| Difficulty curve  | Same             | Same                 |
| Max life recovery | 3                | 2                    |
| Badge             | None             | Red fire emoji       |
| Achievement       | `story_complete` | `nightmare_survivor` |

---

## 16. State Management (Client)

### Story Store Screens

| Screen Key    | Component                   | When               |
| ------------- | --------------------------- | ------------------ |
| `menu`        | StoryMenuScreen             | Story mode entry   |
| `creation`    | CardCreationScreen          | Card creation      |
| `map`         | DungeonScreen               | Dungeon navigation |
| `battle`      | GameScreen + StoryBattleHUD | Active battle      |
| `enhancement` | EnhancementScreen           | Picking upgrades   |
| `run_over`    | RunOverScreen               | Victory or defeat  |
| `trophies`    | TrophyCabinetScreen         | Trophy cabinet     |

### Key Store Fields

- `storyRun`: Full run state
- `currentMap`: Node graph
- `battleCharacter`: Current opponent info
- `enhancementOptions`: 3 random choices
- `storyBattle` (main store): Routes actions through story socket
