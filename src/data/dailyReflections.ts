export interface CuratedDevotional {
  id: string;
  title: string;
  themeBadge: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  verseEnd?: number;
  fallbackText: string;
  meditation: string;
  lectioQuestion: string;
  prayerStarter: string;
  breathPrayer: { inhale: string; exhale: string };
}

export const DAILY_DEVOTIONALS: CuratedDevotional[] = [
  {
    id: "dev-1",
    title: "Mercies Fresh Before Your Feet Hit the Floor",
    themeBadge: "Renewal & Grace",
    bookNumber: 25,
    chapter: 3,
    verse: 22,
    verseEnd: 23,
    fallbackText:
      "Because of the LORD’s loving devotion we are not consumed, for His compassions never fail. They are new every morning; great is Your faithfulness!",
    meditation:
      "Notice where these words were born: not in a sunlit garden, but in the ashes of Lamentations. Yet right in the middle of grief, the poet remembers that yesterday's depleted grace does not have to carry today's weight. God does not hand out stale mercy; He meets this exact morning with fresh compassion.",
    lectioQuestion:
      "What regret or exhaustion from yesterday are you still carrying that God's morning mercy invites you to set down?",
    prayerStarter:
      "Faithful Father, thank You that Your compassion did not run out overnight. Today I receive fresh mercy for...",
    breathPrayer: {
      inhale: "Your mercies are new this morning,",
      exhale: "Great is Your faithfulness to me.",
    },
  },
  {
    id: "dev-2",
    title: "Unhurried Beside Quiet Waters",
    themeBadge: "Rest & Trust",
    bookNumber: 19,
    chapter: 23,
    verse: 1,
    verseEnd: 3,
    fallbackText:
      "The LORD is my shepherd; I shall not want. He makes me lie down in green pastures; He leads me beside quiet waters. He restores my soul.",
    meditation:
      "Sheep never lie down while afraid, hungry, or agitated. When David says 'He makes me lie down,' he is describing a Shepherd whose presence settles our nervous systems. Restoration is not something you manufacture by trying harder; it happens when you let the Shepherd lead your pace.",
    lectioQuestion:
      "Where in your schedule or inner life is the Good Shepherd inviting you to slow down and let your soul be restored?",
    prayerStarter:
      "Good Shepherd, quiet the noise inside me today. Lead my thoughts away from scarcity and toward...",
    breathPrayer: {
      inhale: "The Lord is my Shepherd,",
      exhale: "I have everything I truly need.",
    },
  },
  {
    id: "dev-3",
    title: "A Lamp for the Next Step, Not the Whole Mile",
    themeBadge: "Guidance & Wisdom",
    bookNumber: 19,
    chapter: 119,
    verse: 105,
    fallbackText: "Your word is a lamp to my feet and a light to my path.",
    meditation:
      "An ancient clay oil lamp did not flood the highway two miles ahead like stadium headlights—it cast just enough warm golden circle for your next two footsteps. Often we delay obedience waiting for a five-year blueprint, while God faithfully illuminates the very next step of integrity, kindness, or trust.",
    lectioQuestion:
      "What is one clear, small next step you already have enough light to take today?",
    prayerStarter:
      "Lord of light, forgive my demand to see every turn ahead. Give me courage to take the step right in front of me...",
    breathPrayer: {
      inhale: "Your Word lights this step,",
      exhale: "I trust You with the road ahead.",
    },
  },
  {
    id: "dev-4",
    title: "Abiding Where the Sap Flows",
    themeBadge: "Intimacy with Christ",
    bookNumber: 43,
    chapter: 15,
    verse: 4,
    verseEnd: 5,
    fallbackText:
      "Remain in Me, and I will remain in you. Just as no branch can bear fruit by itself unless it remains in the vine, neither can you bear fruit unless you remain in Me.",
    meditation:
      "Walk through a vineyard and you will never hear a branch straining and groaning to squeeze out grapes. A branch has one vocation: stay vitally connected to the living vine so life-giving sap flows unimpeded. Fruitfulness is the natural overflow of closeness with Jesus.",
    lectioQuestion:
      "Have you been striving to produce fruit on your own lately rather than resting in connection with Christ?",
    prayerStarter:
      "True Vine, draw my scattered attention back into living union with You throughout the ordinary hours of today...",
    breathPrayer: {
      inhale: "Abiding in You, Jesus,",
      exhale: "Your life bears fruit in me.",
    },
  },
  {
    id: "dev-5",
    title: "Trading Worry for Guarded Peace",
    themeBadge: "Peace & Prayer",
    bookNumber: 50,
    chapter: 4,
    verse: 6,
    verseEnd: 7,
    fallbackText:
      "Be anxious for nothing, but in everything, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.",
    meditation:
      "Paul wrote these words while chained to a Roman praetorian guard—so when he says God's peace 'will stand garrison guard' over your heart and mind, the metaphor was clanking right beside his wrist. Notice the divine exchange: every pang of anxiety becomes a bell summoning us to honest prayer mingled with gratitude.",
    lectioQuestion:
      "Which recurring worry today can become your prompt to pause, name one gratitude, and hand it to God?",
    prayerStarter:
      "God of peace, right now I place into Your hands my concern about... and I thank You that You have already...",
    breathPrayer: {
      inhale: "I hand You every anxious thought,",
      exhale: "Your peace stands guard over my heart.",
    },
  },
  {
    id: "dev-6",
    title: "Strength That Borrows Eagle Wings",
    themeBadge: "Endurance & Hope",
    bookNumber: 23,
    chapter: 40,
    verse: 30,
    verseEnd: 31,
    fallbackText:
      "Even youths grow tired and weary, and young men stumble and fall. But those who wait upon the LORD will renew their strength; they will mount up with wings like eagles; they will run and not grow weary, they will walk and not faint.",
    meditation:
      "Notice the surprising climax of Isaiah's poetry: first soaring on thermal currents, then running, and finally—walking without fainting! Because in real life, ordinary Tuesday faithfulness—putting one steady foot in front of the other when nobody is applauding—requires the deepest miracle of grace.",
    lectioQuestion:
      "Where is God sustaining you to simply keep walking faithfully today without giving up?",
    prayerStarter:
      "Everlasting God, You never faint or grow weary. Exchange my tired strength today for Yours as I...",
    breathPrayer: {
      inhale: "Waiting quietly upon the Lord,",
      exhale: "You renew my strength to walk on.",
    },
  },
  {
    id: "dev-7",
    title: "Held by Undefeatable Love",
    themeBadge: "Assurance & Identity",
    bookNumber: 45,
    chapter: 8,
    verse: 38,
    verseEnd: 39,
    fallbackText:
      "For I am convinced that neither death nor life, neither angels nor principalities, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.",
    meditation:
      "Paul searches every corner of the cosmos—life, death, calendar, unseen realms, highest peaks, darkest depths—looking for a wedge strong enough to pry a child of God loose from the Father's grip. He comes back empty-handed. Your security does not rest on the strength of your grip on God, but on His grip on you.",
    lectioQuestion:
      "How would you approach today's challenges differently if you lived 100% convinced nothing can separate you from God's love?",
    prayerStarter:
      "Loving Father, anchor my identity deeper than my performance or fears today. Remind me that in Christ...",
    breathPrayer: {
      inhale: "Held fast in Christ Jesus,",
      exhale: "Nothing can separate me from Your love.",
    },
  },
  {
    id: "dev-8",
    title: "Wisdom Given Without Scolding",
    themeBadge: "Discernment",
    bookNumber: 59,
    chapter: 1,
    verse: 5,
    fallbackText:
      "Now if any of you lacks wisdom, he should ask God, who gives generously to all without finding fault, and it will be given to him.",
    meditation:
      "Sometimes we hesitate to ask God for help because we feel embarrassed that we don't already have the answer—or worse, that our own missteps tangled the knot. James unveils God's disposition: single-hearted, open-handed generosity that never rolls His eyes when His children ask for wisdom.",
    lectioQuestion:
      "What conversation, project, or decision today needs God's gentle, clear-eyed wisdom?",
    prayerStarter:
      "Generous God, thank You that You welcome my questions without reproach. Please grant me discerning wisdom regarding...",
    breathPrayer: {
      inhale: "I ask You for wisdom today,",
      exhale: "You give generously without reproach.",
    },
  },
  {
    id: "dev-9",
    title: "Come Simply as You Are, Heavy-Laden",
    themeBadge: "Gentle Humility",
    bookNumber: 40,
    chapter: 11,
    verse: 28,
    verseEnd: 30,
    fallbackText:
      "Come to Me, all you who are weary and burdened, and I will give you rest. Take My yoke upon you and learn from Me, for I am gentle and humble in heart, and you will find rest for your souls.",
    meditation:
      "The only place in all four Gospels where Jesus explicitly describes His own heart is right here: 'gentle and lowly in heart.' He does not wait at the finish line demanding you clean yourself up first; He steps beside the exhausted, shoulders the heavy beam of the yoke, and teaches an unforced rhythm of grace.",
    lectioQuestion:
      "What heavy burden have you been carrying solo that Jesus is offering to shoulder alongside you?",
    prayerStarter:
      "Gentle Savior, I come to You honestly tired from carrying... Teach me Your unforced rhythm of grace...",
    breathPrayer: {
      inhale: "Gentle and humble in heart,",
      exhale: "In You my soul finds true rest.",
    },
  },
  {
    id: "dev-10",
    title: "Power Perfected in Jars of Clay",
    themeBadge: "Grace in Weakness",
    bookNumber: 47,
    chapter: 12,
    verse: 9,
    fallbackText:
      "But He said to me, “My grace is sufficient for you, for My power is perfected in weakness.” Therefore I will boast all the more gladly in my weaknesses, so that the power of Christ may rest upon me.",
    meditation:
      "Our culture trains us to hide every crack and curate effortless competence. The gospel flips the script: your limitations are not disqualifications—they are the exact canvas where Christ's sustaining grace shines unmistakably.",
    lectioQuestion:
      "What personal limitation or vulnerability today can become a doorway to lean on Christ's sufficient grace?",
    prayerStarter:
      "Lord Jesus, instead of resenting my limits today, I invite Your sufficient grace to rest upon...",
    breathPrayer: {
      inhale: "Your grace is enough for me,",
      exhale: "Your power shines through my weakness.",
    },
  },
];

export interface HeartMoodOption {
  id: string;
  label: string;
  iconName: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  verseEnd?: number;
  encouragement: string;
}

export const HEART_MOOD_COMPASS: HeartMoodOption[] = [
  {
    id: "anxious",
    label: "Anxious",
    iconName: "Wind",
    bookNumber: 60,
    chapter: 5,
    verse: 7,
    encouragement: "You don't have to untangle tomorrow tonight—He cares personally and attentively for you.",
  },
  {
    id: "grateful",
    label: "Grateful",
    iconName: "Sun",
    bookNumber: 19,
    chapter: 103,
    verse: 1,
    verseEnd: 4,
    encouragement: "Let gratitude turn every ordinary gift today into conscious worship.",
  },
  {
    id: "weary",
    label: "Weary",
    iconName: "Moon",
    bookNumber: 40,
    chapter: 11,
    verse: 28,
    encouragement: "Rest is not laziness; you are deeply loved even before you accomplish another task.",
  },
  {
    id: "uncertain",
    label: "Seeking Direction",
    iconName: "Compass",
    bookNumber: 20,
    chapter: 3,
    verse: 5,
    verseEnd: 6,
    encouragement: "Lean your full weight on God's wisdom rather than trying to predict every outcome.",
  },
  {
    id: "heavy",
    label: "Heavy-Hearted",
    iconName: "Heart",
    bookNumber: 19,
    chapter: 34,
    verse: 18,
    encouragement: "God does not stand at a distance from tears—He draws closest to the brokenhearted.",
  },
  {
    id: "hopeful",
    label: "Hopeful",
    iconName: "Sparkles",
    bookNumber: 45,
    chapter: 15,
    verse: 13,
    encouragement: "May the God of hope fill you with all joy and peace in believing.",
  },
];

export function getDevotionalForDate(dateStr: string): CuratedDevotional {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return DAILY_DEVOTIONALS[hash % DAILY_DEVOTIONALS.length];
}
