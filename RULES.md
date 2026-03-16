# Goblins Gambit - Game Rules

## Overview

Goblins Gambit is a multiplayer card game for **2-6 players**. Players summon creatures, cast spells, equip armour, and perform tricks to earn **Sock Points (SP)**. The first player to reach **10,000 SP** wins (or 5,000 SP in Quick mode).

## Setup

- Each player starts with **5 cards** drawn from a shared deck.
- Each player begins with **0 SP** and **2 Action Points (AP)** per turn.
- Turn order is determined at game start and cycles through all players.

## Turn Actions

Each action costs **1 AP** unless otherwise noted:

| Action          | AP Cost               | Description                                     |
| --------------- | --------------------- | ----------------------------------------------- |
| **Draw Card**   | 1                     | Draw a card from the deck (max hand size: 10)   |
| **Play Card**   | Card cost (usually 1) | Play a card from your hand                      |
| **Attack**      | 1                     | Attack an opponent's creature with one of yours |
| **Use Ability** | Varies                | Activate a creature's special ability           |
| **Buy AP**      | 1,000 SP              | Spend 1,000 SP to gain +1 AP this turn          |
| **End Turn**    | 0                     | End your turn and pass to the next player       |

The base AP a player receives at the start of each turn is modified by the **Encumbrance** system (see below).

### Encumbrance

The number of cards in your hand at the start of your turn determines how many Action Points you receive. This mechanic rewards aggressive play and punishes hoarding, while also providing a comeback burst when your hand is completely full.

| Cards in Hand | AP Granted  |
| ------------- | ----------- |
| 0             | 4           |
| 1             | 3           |
| 2–7           | 2 (default) |
| 8–9           | 1           |
| 10 (max hand) | 7           |

- **Empty-handed bonus (0 cards):** Having no cards means you've played aggressively. You're rewarded with 4 AP to draw and rebuild.
- **Light hand (1 card):** Nearly empty — you get 3 AP to help recover.
- **Standard (2–7 cards):** The normal range. You receive the default 2 AP.
- **Heavy hand (8–9 cards):** You're nearing the hand limit and hoarding cards. Your AP is reduced to 1, pressuring you to play cards.
- **Full hand burst (10 cards):** Your hand is completely full (max hand size). You receive a massive 7 AP burst, giving you the resources to play a big turn and clear your hand. This prevents players from being stuck with a full hand and no way to act.

Encumbrance AP is calculated before other modifiers (Hessian set bonus, Viper AP penalties). For example, a player with 0 cards in hand and a Viper penalty of 1 would receive 4 − 1 = 3 AP.

## Card Types

There are four card types, each with a color:

- **Creatures** (Red) - Summoned to your Swamp (field). Can attack, defend, and have abilities.
- **Magic** (Blue) - One-time spells with immediate effects.
- **Armour** (Black) - Equipment for your gear slots (head, body, feet). Has durability.
- **Tricks** (Green) - Skateboard tricks that earn SP directly.

### Creatures

Each creature has ATK (attack), DEF (defence), and SP (points awarded when killed). Maximum **5 creatures** on your field at once.

| Name            | ATK   | DEF   | SP    | Ability                                                                  | Copies |
| --------------- | ----- | ----- | ----- | ------------------------------------------------------------------------ | ------ |
| Happy Hippy     | 200   | 300   | 200   | —                                                                        | 1      |
| Ablerrt         | 300   | 600   | 400   | —                                                                        | 1      |
| Stoner          | 400   | 200   | 420   | Spend 1 AP: grant temp shield to your creatures                          | 3      |
| BBQ Master      | 0     | 1,000 | 500   | —                                                                        | 1      |
| Programmer      | 400   | 600   | 500   | —                                                                        | 1      |
| Sparky          | 800   | 100   | 500   | —                                                                        | 1      |
| The Milkman     | 500   | 500   | 500   | —                                                                        | 1      |
| Homosapien      | 1,000 | 0     | 500   | —                                                                        | 1      |
| The Russian     | 600   | 600   | 800   | —                                                                        | 1      |
| Strong Goblin   | 800   | 800   | 1,100 | —                                                                        | 1      |
| Rock God        | 600   | 900   | 1,100 | —                                                                        | 1      |
| Lesser Goblin   | 200   | 400   | 400   | +200 DEF to King Goblin; +100 ATK if King Goblin present                 | 6      |
| King Goblin     | 1,000 | 100   | 1,000 | +100 ATK per Lesser Goblin on your field                                 | 1      |
| Thief           | 100   | 500   | 200   | Spend 1 AP: steal 200 SP from any opponent                               | 1      |
| King of Thieves | 100   | 100   | 500   | Spend 2 AP: steal 500 SP from any opponent                               | 1      |
| Troll           | 300   | 300   | 300   | Spend 1 AP: rotate any creature's stats (ATK→DEF→SP→ATK)                 | 1      |
| Saving Grace    | 300   | 300   | 300   | Targets 3 creatures for 100 ATK each OR 1 for 300 ATK                    | 1      |
| Gabber          | 200   | 500   | 400   | Adjacent creatures to target take 100 DEF splash damage                  | 1      |
| Motherdazer     | 200   | 400   | 400   | Adjacent friendly creatures get +200 DEF                                 | 1      |
| Book Witch      | 300   | 300   | 500   | Protects owner from spells while in play                                 | 1      |
| Swapeewee       | 0     | 1,000 | 500   | ATK and DEF swap every turn                                              | 1      |
| Dead Meme       | 100   | 800   | 500   | When killed: choose 1 card from top 6 in graveyard                       | 1      |
| Twitch Streamer | 100   | 800   | 500   | Draw 1 card when played                                                  | 1      |
| Grencle         | 100   | 600   | 500   | All opponents' creatures lose 100 ATK while active                       | 1      |
| Viper           | 300   | 100   | 500   | Attacker loses 1 AP next round                                           | 1      |
| Nerd            | 100   | 500   | 500   | +100 ATK whenever owner draws a card                                     | 1      |
| Nerdet          | 500   | 100   | 500   | +100 DEF whenever owner draws a card                                     | 1      |
| Zucc            | 200   | 400   | 600   | Steal 1 opponent's armour piece when played                              | 2      |
| Wood Elf        | 600   | 300   | 600   | +100 bonus SP on kill                                                    | 1      |
| Crack Head      | 200   | 1,000 | 800   | Attacks 2 creatures at once (200 damage each)                            | 1      |
| Harambe         | 1,000 | 1,000 | 1,000 | Placed in opponent's field; dies after 1 round; you get the SP           | 1      |
| Digital Artist  | 500   | 500   | 1,000 | +100 temp DEF shield per round active                                    | 1      |
| Ghost           | 800   | 100   | 1,000 | Invisible until it attacks                                               | 1      |
| Rhy Bear        | 800   | 600   | 1,000 | Full 800 ATK to 1 target OR 400 ATK split between 2                      | 1      |
| Tik Tok Thot    | 0     | 0     | 1,000 | Instant kill an opponent's creature when played                          | 1      |
| Gamer Boy       | 0     | 2,000 | 1,500 | Taunt: must be attacked first while in play                              | 1      |
| Catfish         | 0     | 0     | 0     | Copies stats of first creature that attacks it                           | 1      |
| Karen           | 0     | 0     | 500   | Instant kills any creature that attacks it (both die)                    | 1      |
| Gamblid         | \*    | \*    | \*    | ATK = avg opponent hand size × 100, DEF = own hand × 100, SP = ATK + DEF | 1      |

### Magic Cards

| Name     | Cost | Effect                                                  | Copies |
| -------- | ---- | ------------------------------------------------------- | ------ |
| Ooft     | 1    | Add 200 ATK to a creature                               | 2      |
| Thicc    | 1    | Add 500 DEF to a creature                               | 2      |
| Judgment | 1    | If your SP = 1,000, steal all of 1 opponent's creatures | 2      |
| Smesh    | 1    | 500 instant damage to a creature                        | 2      |
| Savage   | 2    | Destroy an opponent's creature                          | 3      |
| Yeet     | 1    | Destroy a card in opponent's hand                       | 1      |
| AMA      | 1    | View an opponent's hand                                 | 1      |
| Finesse  | 1    | Steal 1 card from an opponent's hand                    | 2      |
| Woke     | 1    | View next 5 cards on the deck                           | 1      |
| Snacc    | 1    | Gain control of opponent's creature for 1 turn          | 1      |
| Lerker   | 0    | Roll 2d6, draw that many cards                          | 1      |
| STFU     | 0    | Silence a creature's ability for 1 turn                 | 2      |
| Lagg     | 0    | Skip an opponent's next turn                            | 2      |

### Tricks

All tricks cost **0 AP** and grant SP directly.

| Name          | SP Earned | Copies |
| ------------- | --------- | ------ |
| Ollie         | 300       | 1      |
| 50 - 50       | 400       | 1      |
| Kickflip      | 500       | 1      |
| Crooked Grind | 500       | 1      |
| Big Spin      | 600       | 1      |
| Feeble Grind  | 700       | 1      |
| Darkslide     | 800       | 1      |
| The 900       | 900       | 1      |
| Hardflip      | 1,000     | 1      |
| Laser Flip    | 1,000     | 1      |
| Christ Air    | 2,000     | 1      |
| H.O.R.S.E     | 2d6 × 100 | 1      |

### Armour

Armour equips to **head**, **body**, or **feet** slots (max 3 pieces). Each piece has durability that decreases over turns.

#### Cursed Set

_Set Bonus (3/3): Swap your total SP with an opponent_

| Name           | Slot | Durability | Copies |
| -------------- | ---- | ---------- | ------ |
| Cursed Beanie  | Head | 3          | 2      |
| Cursed Singlet | Body | 5          | 2      |
| Cursed Crocs   | Feet | 1          | 2      |

#### Hessian Set

_Set Bonus: 2/3 pieces = 2 AP/round, 3/3 pieces = 3 AP/round_

| Name             | Slot | Durability | Effect                     | Copies |
| ---------------- | ---- | ---------- | -------------------------- | ------ |
| Hessian Cap      | Head | 3          | Extra AP costs 150 SP less | 2      |
| Hessian Sack     | Body | 3          | Extra AP costs 250 SP less | 2      |
| Hessian Slippers | Feet | 3          | Extra AP costs 100 SP less | 2      |

#### Rusty Set

_Set Bonus (3/3): Opponents can't play Creature (red) cards_

| Name         | Slot | Durability | Effect                              | Copies |
| ------------ | ---- | ---------- | ----------------------------------- | ------ |
| Rusty Bucket | Head | 3          | Opponents can't play Tricks (green) | 2      |
| Rusty Barrel | Body | 3          | Opponents can't play Armour (black) | 2      |
| Rusty Mugs   | Feet | 3          | Opponents can't play Magic (blue)   | 2      |

#### Lucky Set

_Set Bonus (3/3): Extra 500 SP shield_

| Name             | Slot | Durability | Effect         | Copies |
| ---------------- | ---- | ---------- | -------------- | ------ |
| Lucky Headband   | Head | 3          | +150 SP shield | 2      |
| Lucky Chestplate | Body | 3          | +250 SP shield | 2      |
| Lucky Socks      | Feet | 3          | +100 SP shield | 2      |

#### Crystal Set

| Name          | Slot | Durability | Effect                 | Copies |
| ------------- | ---- | ---------- | ---------------------- | ------ |
| Crystal Helm  | Head | 5          | Gain 200 SP each round | 2      |
| Crystal Plate | Body | 5          | Gain 300 SP each round | 2      |
| Crystal Socks | Feet | 5          | Gain 100 SP each round | 2      |

## Combat Resolution

When a creature attacks another:

1. **Stoner Shield** — If the defender has a temp shield from Stoner, the entire attack is absorbed and the shield is consumed.
2. **Karen Counter** — If the defender is Karen (not silenced), the attacker is instantly killed. Karen also dies. The Karen owner gets the attacker's SP.
3. **Catfish Mimic** — If the defender is Catfish and hasn't mimicked yet (not silenced), it copies the attacker's ATK, DEF, and SP. Combat continues with new stats.
4. **Damage Calculation** — Attacker deals damage equal to its ATK against defender's DEF.
   - If ATK >= remaining DEF: defender is **destroyed**. Attacker gains defender's SP.
   - If ATK < remaining DEF: defender takes temporary defence damage (tracked between turns).
5. **Viper Sting** — If defender is Viper (not silenced), the attacker's owner loses 1 AP next round.
6. **Wood Elf Burn** — If the attacker is Wood Elf (not silenced) and kills the defender, owner gains an extra 100 SP.
7. **Gabber Splash** — If the attacker is Gabber (not silenced), creatures adjacent to the defender take 100 DEF damage. Adjacent creatures can die from splash.

### Multi-Target Attacks

- **Crack Head**: Attacks 2 creatures simultaneously for 200 damage each.
- **Rhy Bear**: Can deal 800 damage to 1 creature OR split 400 damage between 2 creatures.

## Special Mechanics

### Taunt

Gamer Boy has **taunt** — while it's on the field, opponents must attack it before any other creature.

### Invisibility

Ghost is **invisible** until it attacks. Invisible creatures cannot be targeted by attacks or abilities.

### Silence (STFU)

A silenced creature loses all ability effects for 1 turn. This cancels: counter-kills, stat copying, AP penalties, burn effects, splash damage, synergy buffs, and all activated abilities.

### Control Transfer

- **Harambe**: Placed in an opponent's swamp. Dies automatically after 1 round. The original owner receives the SP.
- **Snacc**: Steal an opponent's creature for 1 turn. It returns at your end of turn. The stolen creature cannot attack the turn it's stolen.
- **Judgment**: If your SP is exactly 1,000, steal all of one opponent's creatures (up to your swamp limit of 5).

### Synergy

- **King Goblin + Lesser Goblins**: King gains +100 ATK per Lesser Goblin on your field. Each Lesser Goblin gains +100 ATK if King is present and +200 DEF to King.
- **Grencle**: Aura that reduces all opponents' creatures' ATK by 100.
- **Motherdazer**: Adjacent friendly creatures gain +200 DEF.
- **Nerd/Nerdet**: Gain +100 ATK/DEF respectively each time the owner draws a card.

### Spell Protection

**Book Witch** protects its owner from targeted spells while in play.

## End-of-Turn Cleanup

At the end of each turn, the following occurs in order:

1. **Snacc Return** — Creatures stolen via Snacc return to their original owner.
2. **Harambe Timer** — Harambe's round counter decrements; if expired, Harambe dies and original owner gets SP.
3. **Swapeewee Swap** — Swapeewee's ATK and DEF swap.
4. **Digital Artist Shield** — Digital Artist gains +100 temp DEF.
5. **Crystal Armour Income** — Crystal set pieces grant SP income.
6. **Armour Durability** — All equipped armour loses 1 durability. Pieces at 0 are destroyed.
7. **Silence Expires** — STFU silence wears off.
8. **Temporary Buffs Clear** — Attack/defence buffs from spells reset.
9. **AP Reset (Encumbrance)** — Next player receives AP based on their hand size (see Encumbrance table), then modified by Hessian set bonus and Viper penalties.

---

_This document should be updated when game rules change._
