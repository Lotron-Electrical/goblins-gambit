export const STORY_CHARACTERS = {
  tavern: {
    regulars: [
      {
        id: "tavern_1",
        name: "Grog the Barkeep",
        dialogue: {
          intro: "You want a drink or a fight? Either way, I'm pouring.",
          win: "Back behind the bar I go. You hit harder than my morning hangover.",
          lose: "I've been breaking up brawls for twenty years. You never stood a chance.",
        },
      },
      {
        id: "tavern_2",
        name: "Dizzy the Barmaid",
        dialogue: {
          intro: "Don't let the apron fool you. I've knocked out bigger goblins than you with a serving tray.",
          win: "Well played! I'll fetch you an ale on the house.",
          lose: "Tips are better when the customers are unconscious. Nothing personal.",
        },
      },
      {
        id: "tavern_3",
        name: "Old Rattlebones",
        dialogue: {
          intro: "These old bones still have some fight left in 'em. Come closer and find out.",
          win: "Bah, my joints are acting up again. You got lucky, whelp.",
          lose: "Experience beats youth every time. Now fetch me my pipe.",
        },
      },
      {
        id: "tavern_4",
        name: "Mugface the Regular",
        dialogue: {
          intro: "I've been sitting on this stool since before you were born. Nobody moves me.",
          win: "Alright, alright. You earned my seat. But just for tonight.",
          lose: "This is MY tavern. I don't care what the deed says.",
        },
      },
      {
        id: "tavern_5",
        name: "Squint the Gambler",
        dialogue: {
          intro: "I'll bet three coppers I can beat you without breaking a sweat.",
          win: "Blast! Double or nothing? No? Fine, take your winnings.",
          lose: "The house always wins. And tonight, I AM the house.",
        },
      },
    ],
    boss: {
      id: "tavern_boss",
      name: "Knuckles McGraw",
      dialogue: {
        intro: "They call me the Tavern Champion for a reason. Nobody leaves this bar standing unless I say so.",
        win: "You... you actually beat me? The drinks are on me tonight. You've earned that much.",
        lose: "Another challenger down. Somebody drag them to the gutter before they stain my floor.",
        taunt: "That all you got? I've taken harder hits from a swinging door.",
      },
    },
  },

  hills: {
    regulars: [
      {
        id: "hills_1",
        name: "Dusty Pete",
        dialogue: {
          intro: "The road's been long, but I've still got enough fight for the likes of you.",
          win: "Fair enough. Maybe I should stick to robbing merchants instead.",
          lose: "Your coin purse is mine now. Don't take it personally, it's just business.",
        },
      },
      {
        id: "hills_2",
        name: "Rockjaw",
        dialogue: {
          intro: "See this jaw? Took a boulder to the face and kept chewing. You won't do better.",
          win: "Huh. Maybe my jaw ain't as tough as I thought. Or maybe you're just tougher.",
          lose: "Like punching a cliff face, ain't it? That's Rockjaw for ya.",
        },
      },
      {
        id: "hills_3",
        name: "Bramble the Scout",
        dialogue: {
          intro: "I spotted you coming a mile away. You're not exactly subtle.",
          win: "Sharp eyes don't mean sharp fists, I suppose. Well fought.",
          lose: "I see every move before you make it. Try sneaking up on someone else.",
        },
      },
      {
        id: "hills_4",
        name: "Windy Meg",
        dialogue: {
          intro: "The hill winds carry whispers about you. None of them are flattering.",
          win: "The winds were wrong about you after all. I'll spread the word.",
          lose: "The hills belong to those who can weather the storm. You can't.",
        },
      },
      {
        id: "hills_5",
        name: "Stumpy",
        dialogue: {
          intro: "Lost my leg to a wolf, my eye to a hawk, and my patience to fools like you.",
          win: "Well, at least I've still got my pride. Wait, no. You took that too.",
          lose: "Missing parts just means less of me to hit. Think about that.",
        },
      },
    ],
    boss: {
      id: "hills_boss",
      name: "Redhand Rex",
      dialogue: {
        intro: "Every traveler on these hills pays tribute to me. You'll pay in blood or coin. Your choice.",
        win: "Impossible! No one bests Redhand Rex! Take your victory and go before I change my mind.",
        lose: "Another fool who thought they could waltz through MY hills. Add their boots to the pile.",
        taunt: "My bandits are watching. Best make this entertaining before I finish you off.",
      },
    },
  },

  swamp: {
    regulars: [
      {
        id: "swamp_1",
        name: "Bogsworth",
        dialogue: {
          intro: "Welcome to the bog. Mind your step, the mud here swallows the careless.",
          win: "Glub... back into the muck I go. You're stronger than you look.",
          lose: "The swamp takes what it wants. Today, it wants you.",
        },
      },
      {
        id: "swamp_2",
        name: "Leech Queen",
        dialogue: {
          intro: "My little darlings are hungry, and you look positively full of blood.",
          win: "My leeches will remember your taste. Consider yourself lucky they're letting go.",
          lose: "Drained dry, just like the rest. The swamp always feeds.",
        },
      },
      {
        id: "swamp_3",
        name: "Mudgulp",
        dialogue: {
          intro: "BLURB BLURB. That means 'prepare to lose' in mud-speak.",
          win: "BLUB blub blurb... Fine. You win. The mud will remember this.",
          lose: "The mud speaks, and it says you're finished. BLURB.",
        },
      },
      {
        id: "swamp_4",
        name: "Sporetoad",
        dialogue: {
          intro: "Breathe deep. Those spores you're inhaling? That's just a taste of what's coming.",
          win: "Croak... the spores couldn't save me this time. Well played, dry-skin.",
          lose: "Feeling dizzy yet? That's the fungus settling in. Sweet dreams.",
        },
      },
      {
        id: "swamp_5",
        name: "Rotwood",
        dialogue: {
          intro: "I was a tree once. Now I'm something worse. Much worse.",
          win: "My roots... you've severed them. I'll grow back. I always grow back.",
          lose: "Decay is patient. Decay is strong. And you? You're just compost now.",
        },
      },
    ],
    boss: {
      id: "swamp_boss",
      name: "Mother Murk",
      dialogue: {
        intro: "Come into my waters, little morsel. Mother Murk has been expecting you for a very long time.",
        win: "You dare... defeat me in my own swamp? The bog will remember this insult for centuries.",
        lose: "Sink beneath the murk, child. The swamp is hungry and you are its next meal.",
        taunt: "Struggling already? The deep waters haven't even noticed you yet.",
      },
    },
  },

  tundra: {
    regulars: [
      {
        id: "tundra_1",
        name: "Frostbite Frank",
        dialogue: {
          intro: "Lost six toes to the cold and I'm still standing. What's your excuse gonna be?",
          win: "Brrr... beaten by someone who still has all their fingers. Shameful.",
          lose: "The cold doesn't care how tough you are. Neither do I.",
        },
      },
      {
        id: "tundra_2",
        name: "Icicle Irene",
        dialogue: {
          intro: "Every icicle on this mountain answers to me. I'd watch where you step.",
          win: "My ice... shattered. You burn hotter than I expected, outsider.",
          lose: "Frozen solid. You'll make a lovely ice sculpture until the spring thaw.",
        },
      },
      {
        id: "tundra_3",
        name: "Snowdrift",
        dialogue: {
          intro: "I move like the blizzard: silent, everywhere, and impossible to fight.",
          win: "You caught the wind. I didn't think that was possible.",
          lose: "Buried under six feet of snow. By the time anyone finds you, it won't matter.",
        },
      },
      {
        id: "tundra_4",
        name: "The Yeti's Shadow",
        dialogue: {
          intro: "You don't want to meet the Yeti. Trust me, fighting his shadow is bad enough.",
          win: "The shadow fades... but the Yeti stirs. You should run while you can.",
          lose: "If my shadow frightens you this much, pray you never see what casts it.",
        },
      },
      {
        id: "tundra_5",
        name: "Glacius",
        dialogue: {
          intro: "I am the glacier. Slow, inevitable, and utterly crushing.",
          win: "Cracked... but not broken. I will reform. Glaciers always do.",
          lose: "Ten thousand years of ice against your fragile bones. The math was never in your favor.",
        },
      },
    ],
    boss: {
      id: "tundra_boss",
      name: "Jarl Rimeclaw",
      dialogue: {
        intro: "I am the Frost Warden, keeper of the frozen gate. None pass without my blessing, and I am not feeling generous.",
        win: "The ice cracks beneath my throne... You have earned passage, warm-blood. Do not make me regret it.",
        lose: "Your blood freezes before it hits the ground. The tundra claims another fool.",
        taunt: "Feel that chill in your bones? That's my patience running out.",
      },
    },
  },

  cliffs: {
    regulars: [
      {
        id: "cliffs_1",
        name: "Gale the Drifter",
        dialogue: {
          intro: "The wind up here has a mind of its own. Lucky for me, we're old friends.",
          win: "The gale abandons me? Fine. I'll find another cliff to haunt.",
          lose: "One gust is all it takes. Hope you weren't afraid of heights.",
        },
      },
      {
        id: "cliffs_2",
        name: "Stonetalon",
        dialogue: {
          intro: "These claws have carved handholds into sheer rock. Imagine what they'll do to you.",
          win: "My grip... loosens. You've pried me from my perch. Well done, climber.",
          lose: "Cling all you want. Eventually, everyone falls.",
        },
      },
      {
        id: "cliffs_3",
        name: "Cliffhanger",
        dialogue: {
          intro: "I've been dangling off ledges since I could crawl. Danger is just Tuesday for me.",
          win: "Whoa! Nearly went over the edge there. You fight like a mountain goat on fire.",
          lose: "Look down. That's a long way to fall. Now look at me. I'm the one who pushes.",
        },
      },
      {
        id: "cliffs_4",
        name: "Sky Shrieker",
        dialogue: {
          intro: "SCREEEEEE! That's a warning. The next one shatters bone.",
          win: "My voice... silenced. The cliffs feel strangely quiet now.",
          lose: "The echo carries your screams for miles. Music to my ears.",
        },
      },
      {
        id: "cliffs_5",
        name: "Ledge Lurker",
        dialogue: {
          intro: "You didn't see me, did you? Nobody ever does until it's too late.",
          win: "Spotted and beaten. I need to find a better hiding spot.",
          lose: "One step to the left and there's nothing but air. Guess which way I'm pushing you.",
        },
      },
    ],
    boss: {
      id: "cliffs_boss",
      name: "Vertigo Vex",
      dialogue: {
        intro: "Welcome to the summit. I am the Cliff Lord, and gravity answers to me alone up here.",
        win: "The heights... betray me? You've conquered vertigo itself. I bow to you, groundwalker.",
        lose: "The fall is not what kills you. It's the sudden stop. And I control both.",
        taunt: "Feeling dizzy? The altitude is nothing compared to what I'm about to do to you.",
      },
    },
  },

  volcano: {
    regulars: [
      {
        id: "volcano_1",
        name: "Cinderfang",
        dialogue: {
          intro: "Every breath here tastes like ash and fury. I was born in this heat. You'll die in it.",
          win: "The embers dim... but they never truly go out. Remember that.",
          lose: "Burned to cinders, just like everything else that dares enter the caldera.",
        },
      },
      {
        id: "volcano_2",
        name: "Magmaw",
        dialogue: {
          intro: "My jaws are lined with molten rock. Care to test how fireproof you are?",
          win: "Cooled and cracked... you doused my fire. I didn't think that was possible.",
          lose: "Swallowed by the mountain. The volcano always hungers.",
        },
      },
      {
        id: "volcano_3",
        name: "Ashwalker",
        dialogue: {
          intro: "I've walked through eruptions that leveled kingdoms. You're barely a spark.",
          win: "The ash settles... and I fall with it. You burn brighter than I expected.",
          lose: "Ash to ash. You were never meant to survive this heat.",
        },
      },
      {
        id: "volcano_4",
        name: "Ember Eye",
        dialogue: {
          intro: "My gaze alone has set forests ablaze. Try not to make eye contact.",
          win: "My fire... extinguished. The world grows dark and cold without it.",
          lose: "One look. That's all it took. Your resolve turned to smoke.",
        },
      },
      {
        id: "volcano_5",
        name: "Pyroclast",
        dialogue: {
          intro: "I am the eruption given form. Unstoppable, explosive, and very, very angry.",
          win: "The eruption subsides... for now. But volcanoes never stay quiet for long.",
          lose: "Buried under a river of fire and stone. The mountain buries all challengers.",
        },
      },
    ],
    boss: {
      id: "volcano_boss",
      name: "Ignatius Rex",
      dialogue: {
        intro: "I am the Molten King, forged in the heart of this volcano. Everything here burns at my command.",
        win: "My crown of fire... dims. You have quenched the unquenchable. Take your victory before the mountain erupts in my rage.",
        lose: "Kneel before the Molten King. Your ambition melts like wax in my presence.",
        taunt: "The lava rises with my fury. How much longer can you withstand the heat?",
      },
    },
  },
};

export function getRandomCharacter(levelName, excludeIds = []) {
  const level = STORY_CHARACTERS[levelName];
  if (!level) return null;
  const available = level.regulars.filter((c) => !excludeIds.includes(c.id));
  return (
    available[Math.floor(Math.random() * available.length)] || level.regulars[0]
  );
}

export function getBossCharacter(levelName) {
  return STORY_CHARACTERS[levelName]?.boss || null;
}
