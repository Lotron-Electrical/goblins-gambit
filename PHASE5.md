# Phase 5 — Revenue Maximization

**Status:** Planning
**Goal:** Prepare Goblin's Gambit for paid launch on Steam ($9.99) and mobile app stores ($4.99)

---

## 1. Steam Achievements (15-20)

**Priority:** High | **Effort:** Low
**Why:** Increases perceived value, drives completionism, shows on store page

Suggested achievements:

- Win your first game
- Win 10 / 50 / 100 games
- Play all 79 unique cards (at least once across all games)
- Win with exactly 1,000 SP (Judgment threshold)
- Kill 100 creatures
- Complete all 5 armour sets in a single game
- Win on each theme (Swamp, Blood Moon, Frozen Wastes)
- Win without playing any Magic cards
- Win with 0 cards in hand
- Deal 5,000+ damage in a single game
- Successfully play Judgment (steal all creatures)
- Win against Hard bot
- Play 500 cards total
- Use every activated ability at least once
- Win a Quick mode game in under 10 turns

**Implementation notes:**

- Add server-side event tracking per player (persist to DB)
- Steam Achievements API integration when Steam build is ready
- Can track achievements now in the web version (show in profile/stats)

---

## 2. Tutorial / Single-Player Campaign (5-10 scripted matches)

**Priority:** High | **Effort:** Medium
**Why:** "Single-player content" on store page massively broadens audience. Many buyers skip multiplayer-only games.

Suggested structure:

1. **Match 1 — Basics:** Draw, play creatures, attack. Opponent plays passives only.
2. **Match 2 — Magic:** Introduce spells (Ooft, Thicc, Smesh). Opponent uses creatures only.
3. **Match 3 — Tricks & SP:** Play trick cards for SP. Teach the win condition.
4. **Match 4 — Armour:** Equip armour, learn durability and set bonuses.
5. **Match 5 — Abilities:** Activated abilities (Stoner, Troll, Rhy Bear). Opponent uses them too.
6. **Match 6 — Reactions:** STFU and Lagg on opponent's turn. Teach the orange banner.
7. **Match 7 — Advanced:** Synergies (King + Lesser Goblins), auras (Grencle, Motherdazer).
8. **Match 8 — Control:** Snacc, Harambe, Judgment. High-stakes plays.
9. **Match 9 — Themes:** Play on Blood Moon or Frozen Wastes with modifiers.
10. **Match 10 — Boss Fight:** Stacked-deck bot with premium creatures. Win to unlock reward.

**Rewards:** Completing campaign unlocks an exclusive card back and player title.

**Implementation notes:**

- Scripted bot with predetermined hands/draws per match
- Tutorial text overlays explaining each mechanic
- Progress saved to player profile
- Replayable anytime from menu

---

## 3. Ranked Mode (ELO Ladder)

**Priority:** High | **Effort:** Medium
**Why:** Long-term retention. Gives competitive players a reason to keep playing.

Features:

- ELO rating per player (start at 1000, +/- based on opponent rating)
- Separate ranked queue (Quick mode only for faster games)
- Seasonal resets (monthly or bi-monthly)
- End-of-season rewards (cosmetic border, title, card back)
- Ranked leaderboard (top 50)
- Minimum 5 placement matches before rating shown
- Bots not allowed in ranked

**Implementation notes:**

- ELO calculation on server after each ranked game
- New DB fields: elo_rating, ranked_wins, ranked_losses, season_id
- Lobby UI: "Casual" vs "Ranked" toggle
- Anti-smurf: one account per ranked queue

---

## 4. Cosmetic Shop

**Priority:** Medium | **Effort:** Medium
**Why:** Post-launch recurring revenue without pay-to-win.

Products:

- **Card backs** — 3-5 themed sets ($1.99 each): Blood Moon, Frozen Crystal, Golden Goblin, Skeleton, Neon
- **Creature skin packs** — Alt art for popular creatures ($2.99 each)
- **Board themes** — Beyond the 3 free themes ($1.99 each): Volcanic, Underground, Celestial
- **Player titles** — Purchasable or earnable: "Goblin King", "Card Shark", "Sock Hoarder"
- **Player borders** — Colored frames around avatar/name

**Implementation notes:**

- Cosmetics table in DB (owned_cosmetics per player)
- Shop UI page accessible from lobby
- Payment integration (Stripe for web, platform IAP for Steam/mobile)
- Some cosmetics earnable via gameplay (achievements, ranked rewards) — others purchase-only
- Never sell gameplay advantages

---

## 5. Expansion Card Pack DLC

**Priority:** Medium | **Effort:** High
**Why:** Biggest long-term revenue driver. New cards = new meta = returning players.

Plan:

- 15-20 new cards per expansion ($3.99-4.99 each)
- New creature abilities, new magic spells, new armour set
- All players can play AGAINST expansion cards (no split matchmaking)
- Only owners can add expansion cards to their deck
- First expansion theme TBD (suggestions: Undead, Pirates, Dragons)

**Implementation notes:**

- Card data already in JSON — expansions add to the pool
- Server validates card ownership before allowing play
- Steam DLC or in-app purchase
- Balance testing via playtest.js before release

---

## 6. Steam Trading Cards

**Priority:** Low | **Effort:** Low
**Why:** Free passive revenue from Steam marketplace. Zero maintenance.

Plan:

- 5-8 trading cards featuring creature artwork
- Steam auto-generates: badges, emoticons, profile backgrounds
- Players collect by playing the game (drops over playtime)

**Implementation notes:**

- Requires Steamworks partner account
- Upload card art assets to Steamworks
- No code changes needed — Steam handles everything

---

## Launch Checklist (before going paid)

- [ ] Steam achievements implemented and tested
- [ ] Tutorial campaign playable start to finish
- [ ] Ranked mode live with ELO tracking
- [ ] Cosmetic shop with at least 5 items
- [ ] Store page assets (trailer, screenshots, description)
- [ ] Steam build packaging and testing
- [ ] Mobile build (React Native or PWA wrapper)
- [ ] Privacy policy and terms of service
- [ ] Payment integration tested
- [ ] First expansion pack designed (can launch later as DLC)

---

## Pricing

| Platform      | Price | Notes                                     |
| ------------- | ----- | ----------------------------------------- |
| Steam         | $9.99 | All content included, no IAP for gameplay |
| iOS           | $4.99 | Same content as Steam                     |
| Android       | $4.99 | Same content as Steam                     |
| Web (current) | Free  | Stays free as demo/marketing funnel       |

## Revenue Projections (conservative)

| Scenario                 | Copies        | Gross Revenue    |
| ------------------------ | ------------- | ---------------- |
| No marketing             | 500-2,000     | $3,500-$14,000   |
| Content creator coverage | 5,000-10,000  | $35,000-$70,000  |
| Viral / strong launch    | 10,000-50,000 | $70,000-$350,000 |

_Steam takes 30% cut. Mobile stores take 30% (15% for small business program under $1M)._
