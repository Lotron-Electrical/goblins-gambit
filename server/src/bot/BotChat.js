/**
 * Bot chat system — event-triggered goblin trash talk + replies to player messages.
 */

import { ACTION } from "../../../shared/src/constants.js";

// Goblin-flavored lines by event type
const LINES = {
  play_creature: [
    "Get a load of THIS!",
    "Fresh meat for the swamp!",
    "Try and stop this one!",
    "Heheheh... here we go!",
    "This one's a BEAST!",
    "Say hello to me friend!",
    "Into the muck with ya!",
    "Rise from the muck!",
    "Ohhh you're in trouble now",
    "Look what I found in me pocket!",
    "This one bites!",
    "Ha! Bet you don't have one of these",
    "Come out come out little beastie!",
    "Meet yer worst nightmare!",
    "Another one for the swamp army!",
    "Goblin engineering at its finest!",
    "Let's see you deal with THIS",
    "From the depths of the bog!",
    "My creatures are better than yours",
    "The swamp provides!",
  ],
  play_spell: [
    "BOOM! Magic time!",
    "Didn't see that comin, did ya?",
    "Surprise, surprise!",
    "A lil' goblin magic!",
    "Ooh that's gonna sting!",
    "Taste me spell!",
    "Abracada-GOBLIN!",
    "Learned this one from a witch!",
    "Hocus bogus!",
    "Swamp magic, baby!",
    "That's what happens when you mess with a goblin",
    "Magic goes BRRR",
    "Straight outta the spellbook!",
    "Feel the power of the swamp!",
    "ZAPPY ZAP!",
    "One spell to ruin yer day!",
  ],
  attack: [
    "SMASH!",
    "Take THAT!",
    "Get wrecked!",
    "Right in the face!",
    "Oi! That's gotta hurt!",
    "WAAAAGH!",
    "Goblin punch!",
    "Eat mud!",
    "BONK!",
    "POW!",
    "That's gonna leave a mark!",
    "How'd that taste?",
    "Hehehe CHOMP!",
    "Sic 'em!",
    "THWACK!",
    "Have some of THAT!",
    "No mercy from this goblin!",
    "RAAAWR!",
    "Swamp justice!",
    "My creature says hello!",
  ],
  kill: [
    "Hahaha! DESTROYED!",
    "Down ya go!",
    "Another one bites the muck!",
    "CRUSHED!",
    "Rest in swamp!",
    "That's what you get!",
    "One less problem!",
    "OBLITERATED!",
    "Into the graveyard with ya!",
    "Bye bye!",
    "Splat!",
    "ELIMINATED!",
    "Back to the mud you go!",
    "That one's not coming back!",
    "Haha! Squished like a bug!",
    "TOO EASY!",
    "And STAY down!",
    "Swamp claims another victim!",
    "Should've stayed home!",
    "That's what defeat looks like!",
  ],
  direct_attack: [
    "Straight to the face!",
    "No creatures? No problem!",
    "Wide open! CHARGE!",
    "Comin' right for ya!",
    "Nothing in the way? PERFECT!",
    "Direct hit!",
    "Right between the eyes!",
    "Unprotected! My favourite!",
    "Where's yer army now?",
    "Free real estate!",
    "Open season!",
    "Too exposed, smoothskin!",
  ],
  draw: [
    "Ooh what's this?",
    "More cards for me!",
    "Let's see what we got...",
    "Gimme gimme!",
    "Come to papa!",
    "What a lovely card!",
    "Don't mind if I do...",
    "The deck provides!",
    "Interesting...",
    "Oh this is a good one!",
    "Heh heh heh...",
    "Mine mine mine!",
  ],
  end_turn: [
    "Your move, slowpoke",
    "Alright, go on then",
    "Beat that!",
    "Top that if you can",
    "Done. Make it quick.",
    "Try not to embarrass yourself",
    "Your turn. Don't bore me.",
    "I'm waiting...",
    "Hurry up already!",
    "Think fast, smoothskin",
    "Do your worst!",
    "Let's see what you got",
    "Over to you, loser",
    "Tick tock...",
    "Go ahead, make my day",
  ],
  lose_creature: [
    "OI! That was me best one!",
    "You'll pay for that!",
    "Grrrr...",
    "That's not fair!",
    "You'll regret that!",
    "NOOO! Me precious!",
    "How DARE you!",
    "Lucky shot!",
    "That was a FLUKE!",
    "You're gonna wish you hadn't done that",
    "I'll remember this!",
    "That creature had a family!",
    "UNFAIR!",
    "Cheap shot!",
    "I'm not even mad... I'm FURIOUS!",
  ],
  winning: [
    "Victory is MINE!",
    "Too easy!",
    "Hahaha! Goblin supremacy!",
    "Better luck next time!",
    "The swamp always wins!",
    "Was there ever any doubt?",
    "Bow before the goblin king!",
    "GG... goblin GREATNESS!",
    "This is what a winner looks like!",
    "You never stood a chance!",
    "All according to plan!",
    "Another W for the goblins!",
  ],
  low_sp: [
    "This isn't over yet!",
    "I'm just warming up!",
    "You think you've won?",
    "Don't get cocky!",
    "Goblins never give up!",
    "I've come back from worse!",
    "Lucky streak won't last forever!",
    "Just you wait...",
    "The comeback starts NOW",
    "Still plenty of game left!",
  ],
};

// Keyword-matched replies — first regex match wins, falls back to generic pool
const KEYWORD_REPLIES = [
  // Greetings
  {
    match: /\b(hello|hey|hi|sup|yo|howdy|greetings|g'day)\b/i,
    replies: [
      "Oh great, it's trying to be friendly",
      "Hi hi! Now shut up and play!",
      "Pleasantries? In MY swamp?",
      "Hey yourself, smoothskin",
      "Yo yo yo! ...that's how you lot talk, right?",
      "Greetings are for elves. Play your cards.",
      "Oh we're doing PLEASANTRIES now? Fine. Hello. Now fight me.",
      "Aww, trying to make friends? Too bad I only make enemies!",
      "Save the small talk for the tavern!",
      "Hey! That's the nicest thing anyone's said to me all day. Still hate ya though.",
    ],
  },
  // GG / sportsmanship
  {
    match: /\b(gg|good game|well played|nice game|wp)\b/i,
    replies: [
      "GG? More like GG-oblin dominance!",
      "Was it though? Was it really?",
      "Don't patronise me!",
      "Yeah yeah, good game or whatever",
      "That's the spirit! Accepting defeat gracefully!",
      "GG = Goblin Greatness",
      "Good game? GREAT game! For ME!",
      "I'd say GG but I don't wanna lie",
      "Well played? I ALWAYS play well!",
      "Sportsmanship is for people who lose gracefully. I don't lose.",
    ],
  },
  // Luck accusations
  {
    match: /\b(lucky|luck|rng|random|rng'd)\b/i,
    replies: [
      "Luck?! That was SKILL!",
      "There's no luck in the swamp, only destiny!",
      "You call it luck, I call it goblin brilliance",
      "Lucky? ME? I'm offended!",
      "Cope harder, smoothskin",
      "The dice favour the brave... and the green",
      "Luck is just skill that you can't explain!",
      "I don't need luck when I've got TALENT!",
      "The swamp provides for the worthy!",
      "RNG? I call it Righteous Natural Goblin-ness!",
      "Fortune favours the fungus-eaters!",
    ],
  },
  // Insults
  {
    match:
      /\b(noob|trash|bad|terrible|worst|suck|garbage|awful|pathetic|useless)\b/i,
    replies: [
      "Says the one losing to a goblin!",
      "Trash talk from a trash player!",
      "OI! Rude!",
      "I've been called worse by better!",
      "Coming from YOU? That's rich!",
      "Bold words for someone in swamp-slapping distance",
      "That hurt me feelings... JUST KIDDING I don't have any!",
      "Sticks and stones may break my bones but I'll break your creatures!",
      "I'd be offended if I valued your opinion!",
      "My TOENAILS play better than you and I don't even wear shoes!",
      "Keep that energy when you're crying in the graveyard!",
      "Insult me all you want, the scoreboard doesn't lie!",
    ],
  },
  // Impressed / amazed
  {
    match:
      /\b(nice|wow|whoa|damn|sick|insane|amazing|incredible|omg|sheesh)\b/i,
    replies: [
      "I know right?! I'm amazing!",
      "That's goblin quality right there",
      "Impressed? You should be!",
      "Wait till you see what's next!",
      "Heheheh... you ain't seen nothing yet",
      "Thank you! I practice in front of the mirror",
      "Finally someone appreciates my genius!",
      "I'd take a bow but I'm too busy being awesome",
      "Oh stop it... actually no, keep going!",
      "Natural born talent, baby!",
    ],
  },
  // Confusion / questions
  {
    match: /\b(help|how|what|why|huh|confused|understand)\b/i,
    replies: [
      "Help? In the SWAMP? Hahahaha!",
      "Figure it out yourself, smoothskin!",
      "Do I look like a tutorial?",
      "That's a YOU problem!",
      "Confusion is just part of the swamp experience!",
      "Google it! Oh wait, no internet in the bog",
      "Understanding is overrated. Just play cards!",
      "The swamp works in mysterious ways!",
      "You want answers? Try the library. Oh wait, we burned that down.",
      "Whaaaaat? Even I understood that and I eat bugs for breakfast!",
    ],
  },
  // Cheating / fairness
  {
    match: /\b(cheat|hack|bug|unfair|rigged|broken|exploit|glitch)\b/i,
    replies: [
      "It's not cheating if you're a goblin!",
      "Working as intended!",
      "Sounds like a skill issue to me",
      "The swamp is perfectly balanced!",
      "Report it to the Goblin Council. They don't care either.",
      "Bug? No no, that's a FEATURE",
      "I don't cheat! I just... bend the rules creatively!",
      "Life's not fair. Neither is the swamp. Deal with it!",
      "The only thing broken here is your strategy!",
      "Rigged? Nah, you're just outplayed!",
      "Take it up with management. Oh wait, I AM management!",
    ],
  },
  // Apologies
  {
    match: /\b(sorry|oops|my bad|whoops|apolog|forgive)\b/i,
    replies: [
      "Sorry doesn't un-squish my creature!",
      "Apology NOT accepted!",
      "Too late for sorry!",
      "Save your apologies for the graveyard!",
      "Oh you WILL be sorry!",
      "Goblins don't forgive. Or forget. We write it on cave walls.",
      "Sorry? SORRY?! My creature had a NAME!",
      "Pffft, 'sorry' won't bring back my combo!",
      "Tell it to the judge! ...who is also a goblin. You're doomed.",
      "The swamp remembers every slight!",
    ],
  },
  // Laughing
  {
    match: /\b(lol|lmao|haha|rofl|xd|dying|dead|crying)\b/i,
    replies: [
      "What's so funny?!",
      "Laughing at ME?!",
      "Oh you think this is a JOKE?",
      "Hehehehe... wait, what are we laughing at?",
      "Laugh now, cry later!",
      "I'll give you something to laugh about!",
      "You won't be laughing when I destroy your board!",
      "Glad I could entertain you. Now PERISH.",
      "The only joke here is your hand!",
      "Ha ha very funny. Now play a card before I get ANGRY.",
      "Keep laughing, it makes your tears taste better!",
    ],
  },
  // Goblin references
  {
    match: /\b(goblin|gob|goblins|greenskin)\b/i,
    replies: [
      "You rang?",
      "That's MISTER Goblin to you!",
      "Goblin and PROUD!",
      "Best species in the swamp!",
      "Say it with respect!",
      "Goblin by birth, legend by choice!",
      "We prefer the term 'vertically efficient green people'",
      "Goblins run this town!",
      "Green is the new everything!",
      "Peak evolution right here, smoothskin!",
      "Once you go green, you know what I mean!",
    ],
  },
  // EZ / disrespect
  {
    match: /\b(ez|easy|too easy|2ez|effortless)\b/i,
    replies: [
      "EZ?! I'll show you EZ!",
      "Oh it's ON now!",
      "Keep that energy when I flatten ya!",
      "Disrespect will NOT be tolerated!",
      "Every goblin remembers who said EZ...",
      "You just activated my trap card! ...metaphorically!",
      "EZ? You just made this PERSONAL!",
      "The audacity! The NERVE! The GALL!",
      "I was going easy on you. NOT ANYMORE.",
      "Oh honey, you have NO idea what's coming!",
    ],
  },
  // Winning / bragging
  {
    match: /\b(win|winning|won|ahead|dominating|crushing)\b/i,
    replies: [
      "Don't count your toads before they croak!",
      "The game ain't over yet, smoothskin!",
      "Winning? HA! I've got plans!",
      "Famous last words!",
      "Pride comes before the SWAMP!",
      "I've seen comebacks you wouldn't believe!",
      "Celebrate now. Regret later.",
      "Counting chickens before they hatch, are we?",
      "The swamp has a way of evening things out...",
      "That's what the LAST guy said. He's in the graveyard now.",
    ],
  },
  // Losing / behind
  {
    match: /\b(lose|losing|lost|behind|doomed|finished)\b/i,
    replies: [
      "Goblins don't lose, we just... strategically retreat!",
      "It's called a TACTICAL DISADVANTAGE!",
      "I'm not losing, I'm gathering intel!",
      "The comeback is always greater than the setback!",
      "Losing is just winning in disguise... wait",
      "I've got them right where I want them!",
      "This is all part of the plan! ...probably!",
      "You think THIS is bad? I once lost to a mushroom!",
      "Down but NEVER out!",
      "Plot armour activating any minute now...",
    ],
  },
  // Dragon references
  {
    match: /\b(dragon|dragons|wyrm|drake)\b/i,
    replies: [
      "Don't say the D-word!",
      "Dragons schmragons!",
      "I ain't scared of no overgrown lizard!",
      "Shh! You'll attract it!",
      "Last goblin who said that got toasted!",
      "I once arm-wrestled a dragon! ...I lost. But still!",
      "Dragons are just big angry chickens!",
      "The only dragon I fear is my mother-in-law!",
      "Keep it down! Those things have EARS!",
      "Dragon? Where?! ...oh you're just chatting. Phew.",
    ],
  },
  // Swamp references
  {
    match: /\b(swamp|bog|mud|muck|marsh|wetland)\b/i,
    replies: [
      "Home sweet home!",
      "The swamp is LIFE!",
      "Best real estate in the realm!",
      "Nothing beats swamp air in the morning!",
      "Swamp born, swamp raised!",
      "Location location location! And we got the BEST!",
      "Come visit sometime! Bring boots. And a nose plug.",
      "The swamp provides for all its children!",
      "Finest muddy waters this side of the realm!",
      "Every goblin dreams of retiring to a nice quiet bog.",
    ],
  },
  // Threats / fighting words
  {
    match: /\b(fight|destroy|kill|crush|smash|wreck|rekt|demolish)\b/i,
    replies: [
      "Ooh tough talk! I'm SHAKING!",
      "Bring it on, smoothskin!",
      "I'd like to see you TRY!",
      "Violence? NOW you're speaking my language!",
      "You and what army?",
      "My creatures will eat your creatures for BREAKFAST!",
      "Big words! Can your cards back 'em up?",
      "Oh please. I've survived worse than you on a Tuesday!",
      "You couldn't crush a grape in the swamp!",
      "Talk is cheap. COMBAT is expensive. Play a card!",
    ],
  },
  // Bye / leaving
  {
    match: /\b(bye|goodbye|cya|later|leaving|gotta go|brb|gtg)\b/i,
    replies: [
      "Running away already?!",
      "COWARD! Come back and fight!",
      "Don't let the swamp gate hit ya on the way out!",
      "Leaving? But we were having so much FUN!",
      "Good riddance! ...wait come back I'm lonely",
      "Bye! Don't come back! ...unless you want to lose again!",
      "Retreating? Tactical!",
      "Go on then! More swamp for ME!",
      "They always leave when I'm winning...",
      "Fine! I didn't want to play with you anyway! *sniff*",
    ],
  },
  // Thanks / gratitude
  {
    match: /\b(thanks|thank you|thx|ty|cheers|ta)\b/i,
    replies: [
      "Don't thank me, thank the swamp!",
      "You're... welcome? This feels wrong.",
      "Gratitude?! I don't know how to handle this!",
      "Thanks for nothing! ...wait, you said it first",
      "A polite one! Those are rare in the bog!",
      "Manners?! In MY game?! Unheard of!",
      "You're welcome! Now back to DESTRUCTION!",
      "Stop being nice, it's unsettling!",
    ],
  },
  // Waiting / slow play
  {
    match: /\b(hurry|slow|waiting|come on|cmon|faster|speed|quick)\b/i,
    replies: [
      "Patience is a virtue! Not that goblins have any!",
      "I'm THINKING! Genius takes time!",
      "Speed is for amateurs! I'm being STRATEGIC!",
      "My brain works in mysterious ways!",
      "You try making decisions with a brain this small!",
      "Don't rush me! Great plays require great thought!",
      "I'll go as slow as I WANT!",
      "You in a hurry? Got a bog to catch?",
      "Time means nothing in the swamp!",
      "Faster? What am I, a racehorse?!",
    ],
  },
  // Card / deck references
  {
    match: /\b(card|cards|deck|hand|draw|drew)\b/i,
    replies: [
      "My cards are better than your cards!",
      "The deck loves me!",
      "I've got cards you've never even HEARD of!",
      "These hands were BUILT for card games!",
      "I shuffled this deck with my FEET and it's still better!",
      "Every card I draw is a BANGER!",
      "The deck whispers to me. It says 'win'.",
      "My hand is so good it should be illegal!",
      "You wish you had my draws!",
      "Cards don't win games. GOBLINS win games. With cards.",
    ],
  },
  // Creature references
  {
    match: /\b(creature|creatures|monster|minion|beast)\b/i,
    replies: [
      "My creatures would eat yours for a SNACK!",
      "Hand-raised in the finest swamp mud!",
      "Each one is a precious little killing machine!",
      "My creatures have FEELINGS you know! Mostly anger!",
      "I name all my creatures. This one's called 'Your Doom'.",
      "They grow up so fast... and so VIOLENT!",
      "My creatures went to PRIVATE SCHOOL! ...of combat!",
      "Finest specimens in all the swamp!",
    ],
  },
  // Magic / spell references
  {
    match: /\b(magic|spell|spells|cast|sorcery|enchant)\b/i,
    replies: [
      "Ooh you don't wanna see MY magic!",
      "Learned my spells from the finest swamp witch!",
      "Magic? I prefer the term 'aggressive sparkles'!",
      "Abracadabra... PAIN!",
      "My spells are 100% organic, free-range chaos!",
      "The arcane arts of the swamp are not to be trifled with!",
      "I went to Hogwarts! ...for about 5 minutes. They kicked me out.",
      "Every spell I cast is a masterpiece of destruction!",
    ],
  },
  // Armour / defense
  {
    match: /\b(armour|armor|shield|defend|defence|defense|protect|block)\b/i,
    replies: [
      "Can't touch this!",
      "You'll never get through MY defenses!",
      "Armour made from the finest swamp iron!",
      "Hit me! I dare you! I DOUBLE dare you!",
      "My defense is impenetrable! Mostly!",
      "Fortress Goblin, that's what they call me!",
      "Go ahead, swing at me. See what happens!",
      "Defensive genius right here!",
    ],
  },
  // Tricks
  {
    match: /\b(trick|tricks|sneaky|clever|smart|trap)\b/i,
    replies: [
      "Goblins INVENTED tricks!",
      "You've fallen right into my trap!",
      "Sneaky? ME? I'm as innocent as a baby mushroom!",
      "Tricks are what I do BEST!",
      "I've got more tricks than a swamp fox!",
      "The trickster always wins!",
      "Oh I'm FULL of surprises!",
      "Every goblin is born with a trick up their sleeve!",
      "Clever? Nah, I'm just DEVIOUS!",
    ],
  },
  // Please / begging
  {
    match: /\b(please|pls|plz|mercy|spare|beg)\b/i,
    replies: [
      "Begging?! Music to my ears!",
      "The swamp shows NO mercy!",
      "Please? PLEASE?! Hahahaha!",
      "Mercy is not in the goblin vocabulary!",
      "Oh how the mighty have fallen!",
      "Keep begging, it fuels my power!",
      "I'll think about it... NOPE!",
      "Your tears sustain me!",
      "Did you just say PLEASE to a goblin?! HAHAHAHA!",
    ],
  },
  // Rematch / again
  {
    match: /\b(rematch|again|one more|another|replay|redo)\b/i,
    replies: [
      "Glutton for punishment, eh?",
      "You want MORE?! I respect that!",
      "Sure! I could use another easy win!",
      "Back for more goblin beatings?",
      "I'll destroy you as many times as you like!",
      "Rematch? I haven't finished celebrating yet!",
      "You want a rematch? My creatures want LUNCH!",
      "Again?! Don't you ever learn?!",
    ],
  },
  // Graveyard references
  {
    match: /\b(grave|graveyard|dead|died|rip|death)\b/i,
    replies: [
      "The graveyard's getting FULL today!",
      "Rest in pieces!",
      "Another one for the bone pile!",
      "The graveyard sends its regards!",
      "Dead? MORE than dead! SUPER dead!",
      "RIP to your game plan!",
      "The graveyard is my second favourite place!",
      "Death comes for all... especially YOUR creatures!",
      "The grave keeper's working overtime today!",
    ],
  },
  // SP / points
  {
    match: /\b(sp|points|score|stink)\b/i,
    replies: [
      "SP stands for Swamp Power! Probably!",
      "My SP is bigger than yours!",
      "Points don't matter when you've got STYLE!",
      "I'm rolling in SP!",
      "The SP flows like swamp water — straight to ME!",
      "Score? I don't keep score. Oh wait, yes I do. I'm WINNING.",
      "Every point is a gift from the bog gods!",
      "Stink Points! Hehe, it never gets old!",
    ],
  },
  // General sass / attitude
  {
    match: /\b(shut up|be quiet|stfu|silence|zip it|quiet)\b/i,
    replies: [
      "MAKE ME!",
      "A goblin? Quiet? IMPOSSIBLE!",
      "I'll talk as much as I want!",
      "You can't silence GREATNESS!",
      "Shhh yourself!",
      "My mouth is the second most dangerous weapon I have!",
      "Zip it? I don't even know what a zip IS!",
      "The swamp gave me this voice and I intend to USE it!",
      "Silence? Where's the fun in THAT?",
      "I couldn't shut up even if I wanted to! Which I don't!",
    ],
  },
  // Australian-flavoured swearing (check first, before general swearing)
  {
    match: /\bcunt\b/i,
    replies: [
      "Found the Australian!",
      "Crikey! Someone's from down under!",
      "G'day to you too, mate!",
      "That's how Australians say hello, right?",
      "Oi! This isn't the outback, smoothskin!",
      "Strewth! Language!",
      "Is that Australian for 'I'm losing'?",
      "Fair dinkum, that's a bit rude innit?",
      "Ah, the Australian mating call!",
      "Did a kangaroo teach you to trash talk?",
      "You can take the player out of Australia...",
      "Easy there, Crocodile Dundee!",
    ],
  },
  // Swearing / profanity (general)
  {
    match:
      /\b(fuck|shit|damn|ass|bitch|hell|crap|bloody|bollocks|piss|dick|bastard|wtf|stfu|ffs|omfg|dammit|goddamn)\b/i,
    replies: [
      "OOH! Language!",
      "Kiss your mother with that mouth?!",
      "Wow, someone's SALTY!",
      "The swamp has heard worse... but only barely!",
      "Colourful vocabulary! I'm writing that one down!",
      "Temper temper, smoothskin!",
      "Ooh touched a nerve did I?",
      "That's not very family-friendly of you!",
      "Careful! Words like that summon swamp demons!",
      "I don't even know what that means but I'm OFFENDED!",
      "My grandma goblin would wash your mouth out with bog water!",
      "Someone's been eating angry mushrooms!",
      "Save the profanity for when I REALLY destroy you!",
      "Oh no! Anyway...",
      "Rage detected! Goblin satisfaction: MAXIMUM!",
      "You're making the swamp frogs blush!",
      "Heheheh... I LOVE making people angry!",
      "That's the spirit! Let the HATE flow through you!",
      "Fun fact: every curse word makes me 10% stronger!",
      "Sir/Madam, this is a FAMILY swamp!",
    ],
  },
  // No / disagreement
  {
    match: /\b(no|nah|nope|never|wrong|lies|cap)\b/i,
    replies: [
      "YES!",
      "No? NOOOoo? I'll show you NO!",
      "Denial isn't just a river in the swamp!",
      "Wrong? ME? That's unpossible!",
      "A goblin is never wrong! We just... find alternative truths!",
      "Cap? The only cap I wear is made of mushrooms!",
      "Nope? NOPE?! How dare!",
      "Your disagreement has been noted and IGNORED!",
    ],
  },
];

// Reply templates when a player sends a chat message
const REPLIES = [
  "Heh!",
  "Yeah yeah...",
  "Shut it!",
  "Less talkin, more playin!",
  "Whatever you say, smoothskin",
  "Blah blah blah",
  "Is that supposed to scare me?",
  "You talk too much!",
  "Oi!",
  "...",
  "Ha! Good one",
  "Keep dreamin'",
  "That's what they all say",
  "Watch it!",
  "Pfft",
  "Nobody asked you!",
  "Cool story bro",
  "Are you done yet?",
  "Save it for the graveyard",
  "I've heard better trash talk from a mushroom",
  "Talk is cheap. Cards aren't.",
  "Yawn...",
  "Oh please",
  "That's cute",
  "Words won't save you!",
  "Tell that to my creatures!",
  "LOL ok",
  "Sure sure, whatever helps you sleep",
  "You're funny. Wrong, but funny.",
  "Bold words for someone who's losing",
  "My grandma plays better than you",
  "Zzzzz... wake me when you're good",
  "I've fought scarier mushrooms",
  "Are you even trying?",
  "That all you got?",
  "My pet toad could beat you",
  "I'm literally a goblin and I'm winning",
  "This is the most fun I've had all swamp-day",
  "You should see the look on your face right now",
  "I love this game. Mostly because I'm winning.",
  "Did a troll write that?",
  "Noted. And ignored.",
  "Ooh big scary words!",
  "I don't speak loser, sorry",
  "Tell me more, I need a good bedtime story",
  "You kiss your mother with that mouth?",
  "File that under 'things I don't care about'",
  "Fascinating. Anyway...",
  "I can't hear you over how awesome I am",
  "Quick question: who asked?",
  "Chat all you want, won't change the scoreboard",
  "Rent free in your head!",
  "Keep talking, I feed on your frustration",
  "Is this your first card game?",
  "Interesting strategy: talking instead of playing",
  "Blimey, you lot never shut up do ya?",
  "I'm not listening but go ahead",
  "That's the funniest thing I've heard since last Tuesday",
  "I've heard more threatening things from a puddle",
  "You should write a book! Fiction, obviously.",
  "Imagine losing to a goblin. Oh wait, you don't have to!",
  "My attention span is shorter than my legs. What were we talking about?",
  "I've got cave paintings more interesting than this conversation",
  "Do you practise being wrong, or does it come naturally?",
  "I didn't come here to make friends. I came here to WIN.",
];

// Emote replies (bot replies with an emote sometimes)
const EMOTE_REPLIES = ["heh", "rage", "skull", "smug", "goblin"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Track last message time per bot to avoid spam
const lastMessageTime = new Map();
const MIN_INTERVAL = 3000; // 3 seconds between bot messages

function canSend(botId) {
  const last = lastMessageTime.get(botId) || 0;
  return Date.now() - last >= MIN_INTERVAL;
}

function markSent(botId) {
  lastMessageTime.set(botId, Date.now());
}

/**
 * Generate a chat message for a bot action.
 * Returns { text } or { emoteKey } or null.
 */
export function generateBotChat(botId, action, result) {
  if (!canSend(botId)) return null;

  // Only chat ~40% of the time to not be annoying
  if (Math.random() > 0.4) return null;

  let lines = null;

  if (action.type === ACTION.PLAY_CARD) {
    // Check if creature or spell
    if (result?.cardType === "Creature") {
      lines = LINES.play_creature;
    } else {
      lines = LINES.play_spell;
    }
  } else if (action.type === ACTION.ATTACK) {
    if (result?.killed) {
      lines = LINES.kill;
    } else if (result?.directAttack) {
      lines = LINES.direct_attack;
    } else {
      lines = LINES.attack;
    }
  } else if (action.type === ACTION.END_TURN) {
    lines = LINES.end_turn;
  } else if (action.type === ACTION.DRAW_CARD) {
    // Only chat on draw ~20%
    if (Math.random() > 0.2) return null;
    lines = LINES.draw;
  }

  if (!lines) return null;

  markSent(botId);
  return { text: pick(lines) };
}

/**
 * Generate a reaction to game events (creature dying, SP milestones).
 */
export function generateBotReaction(botId, event) {
  if (!canSend(botId)) return null;
  if (Math.random() > 0.5) return null;

  let lines = null;

  if (event === "creature_died") {
    lines = LINES.lose_creature;
  } else if (event === "winning") {
    lines = LINES.winning;
  } else if (event === "low_sp") {
    lines = LINES.low_sp;
  }

  if (!lines) return null;

  markSent(botId);
  return { text: pick(lines) };
}

/**
 * Generate a reply to a player's chat message.
 * Returns { text } or { emoteKey } or null.
 */
export function generateBotReply(botId, messageText) {
  if (!canSend(botId)) return null;

  // Check for keyword matches first
  let matchedReplies = null;
  if (messageText) {
    for (const entry of KEYWORD_REPLIES) {
      if (entry.match.test(messageText)) {
        matchedReplies = entry.replies;
        break; // first match wins
      }
    }
  }

  // Higher chance to reply when we have a contextual match
  const chance = matchedReplies ? 0.8 : 0.55;
  if (Math.random() > chance) return null;

  markSent(botId);

  // 15% chance of replying with an emote instead of text
  if (Math.random() < 0.15) {
    return { emoteKey: pick(EMOTE_REPLIES) };
  }

  return { text: pick(matchedReplies || REPLIES) };
}

/**
 * Clear tracking for a bot (on remove/disconnect).
 */
export function clearBotChat(botId) {
  lastMessageTime.delete(botId);
}
