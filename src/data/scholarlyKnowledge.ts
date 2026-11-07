export interface OriginalWordStudy {
  id: string;
  strongs: string;
  original: string;
  transliteration: string;
  language: "Hebrew" | "Greek";
  englishTriggers: string[];
  literalGloss: string;
  richMeaning: string;
  keyRefs: string[];
}

export const ORIGINAL_WORD_LEXICON: OriginalWordStudy[] = [
  {
    id: "hesed",
    strongs: "H2617",
    original: "חֶסֶד",
    transliteration: "ḥeseḏ (Hesed)",
    language: "Hebrew",
    englishTriggers: ["lovingkindness", "steadfast love", "mercy", "mercies", "unfailing love", "kindness"],
    literalGloss: "Covenant loyal-love / unfailing mercy",
    richMeaning:
      "Far deeper than fleeting affection, ḥeseḏ combines fierce covenant loyalty with tender, undeserved generosity—God's refusal to let go of His people.",
    keyRefs: ["Exodus 34:6", "Psalms 23:6", "Lamentations 3:22", "Ruth 2:20"],
  },
  {
    id: "shalom",
    strongs: "H7965",
    original: "שָׁלוֹם",
    transliteration: "šālôm (Shalom)",
    language: "Hebrew",
    englishTriggers: ["peace", "prosper", "wholeness", "welfare"],
    literalGloss: "Wholeness, flourishing, complete harmony",
    richMeaning:
      "Not merely the absence of conflict, shalom describes everything restored to right relationship—humanity with God, neighbor with neighbor, and creation made whole.",
    keyRefs: ["Numbers 6:26", "Isaiah 9:6", "Isaiah 26:3", "Psalms 29:11"],
  },
  {
    id: "ruach",
    strongs: "H7307",
    original: "רוּחַ",
    transliteration: "rûaḥ (Ruach)",
    language: "Hebrew",
    englishTriggers: ["spirit", "breath", "wind"],
    literalGloss: "Breath, wind, life-giving Spirit",
    richMeaning:
      "From hovering over the waters in Genesis 1:2 to breathing life into dry bones in Ezekiel 37, ruach portrays God's invisible, energizing life-breath.",
    keyRefs: ["Genesis 1:2", "Psalms 51:11", "Ezekiel 37:5", "Joel 2:28"],
  },
  {
    id: "berit",
    strongs: "H1285",
    original: "בְּרִית",
    transliteration: "bərîṯ (Berit)",
    language: "Hebrew",
    englishTriggers: ["covenant", "testament", "promise"],
    literalGloss: "Sacred binding covenant",
    richMeaning:
      "Unlike a fragile contract that breaks when one side falters, God's covenant pledges His own character to redeem and restore.",
    keyRefs: ["Genesis 15:18", "Jeremiah 31:33", "Psalms 105:8"],
  },
  {
    id: "kadosh",
    strongs: "H6918",
    original: "קָדוֹשׁ",
    transliteration: "qāḏôš (Kadosh)",
    language: "Hebrew",
    englishTriggers: ["holy", "holiness", "sanctify", "sanctified", "sacred"],
    literalGloss: "Set apart, transcendent, radiant in purity",
    richMeaning:
      "God's holiness is His incomparable beauty and moral perfection—which cleanses rather than destroys those He invites near.",
    keyRefs: ["Isaiah 6:3", "Leviticus 19:2", "Psalms 99:5"],
  },
  {
    id: "logos",
    strongs: "G3056",
    original: "λόγος",
    transliteration: "lógos (Logos)",
    language: "Greek",
    englishTriggers: ["word", "message", "saying"],
    literalGloss: "The Living Word, Divine Reason & Self-Expression",
    richMeaning:
      "John takes both the Hebrew creative Word of God ('God said, Let there be light') and Greek longing for cosmic meaning and declares: the Logos became flesh in Jesus.",
    keyRefs: ["John 1:1", "John 1:14", "Hebrews 4:12", "Revelation 19:13"],
  },
  {
    id: "agape",
    strongs: "G26",
    original: "ἀγάπη",
    transliteration: "agápē (Agape)",
    language: "Greek",
    englishTriggers: ["love", "loved", "charity", "beloved"],
    literalGloss: "Self-giving, unconditional love",
    richMeaning:
      "Agape chooses the highest good of another at cost to oneself, supremely revealed at the cross while we were still sinners.",
    keyRefs: ["John 3:16", "Romans 5:8", "1 Corinthians 13:4", "1 John 4:8"],
  },
  {
    id: "charis",
    strongs: "G5485",
    original: "χάρις",
    transliteration: "cháris (Charis)",
    language: "Greek",
    englishTriggers: ["grace", "gracious", "favor", "favour"],
    literalGloss: "Unmerited gift, transforming divine favor",
    richMeaning:
      "Grace is God's free, joyful generosity toward those who could never earn it—both forgiving our past and empowering new life.",
    keyRefs: ["Ephesians 2:8", "2 Corinthians 12:9", "John 1:16", "Titus 2:11"],
  },
  {
    id: "pistis",
    strongs: "G4102",
    original: "πίστις",
    transliteration: "pístis (Pistis)",
    language: "Greek",
    englishTriggers: ["faith", "believe", "believed", "believeth", "trust", "faithful"],
    literalGloss: "Active trust, allegiance, confident reliance",
    richMeaning:
      "Biblical pistis is never mere mental agreement—it is entrusting your weight onto God's trustworthy character.",
    keyRefs: ["Hebrews 11:1", "Romans 1:17", "Ephesians 2:8", "Galatians 2:20"],
  },
  {
    id: "dikaiosyne",
    strongs: "G1343",
    original: "δικαιοσύνη",
    transliteration: "dikaiosýnē (Dikaiosyne)",
    language: "Greek",
    englishTriggers: ["righteousness", "righteous", "justified", "justify", "justice"],
    literalGloss: "Right-standing and covenant justice",
    richMeaning:
      "Both God's saving fidelity in putting sinners right with Himself through Christ, and the just, restorative life that flows from it.",
    keyRefs: ["Romans 3:21-22", "2 Corinthians 5:21", "Matthew 5:6"],
  },
  {
    id: "metanoia",
    strongs: "G3341",
    original: "μετάνοια",
    transliteration: "metánoia (Metanoia)",
    language: "Greek",
    englishTriggers: ["repent", "repentance", "turned"],
    literalGloss: "A transformative change of mind, heart, and direction",
    richMeaning:
      "More than regret, metanoia is waking up to God's Kingdom and turning homeward into the Father's embrace.",
    keyRefs: ["Mark 1:15", "Luke 15:17-20", "Acts 3:19", "Romans 2:4"],
  },
  {
    id: "elpis",
    strongs: "G1680",
    original: "ἐλπίς",
    transliteration: "elpís (Elpis)",
    language: "Greek",
    englishTriggers: ["hope", "hoped"],
    literalGloss: "Confident expectation anchored in resurrection",
    richMeaning:
      "Whereas modern English uses 'hope' as wishful uncertainty, New Testament elpis is rock-solid certainty about God's promised future.",
    keyRefs: ["Romans 5:5", "Romans 15:13", "Hebrews 6:19", "1 Peter 1:3"],
  },
  {
    id: "parakletos",
    strongs: "G3875",
    original: "παράκλητος",
    transliteration: "paráklētos (Parakletos)",
    language: "Greek",
    englishTriggers: ["comforter", "helper", "advocate", "counselor"],
    literalGloss: "One called alongside to strengthen, comfort, and advocate",
    richMeaning:
      "Jesus' name for the Holy Spirit in John 14–16: the ever-present Strengthener, Counselor, and Advocate who dwells within believers.",
    keyRefs: ["John 14:16", "John 14:26", "John 16:7", "1 John 2:1"],
  },
];

export interface CrossReferenceCluster {
  anchorPattern: string; // e.g. "1:1" -> bookNumber:chapter or bookNumber:chapter:verse
  refs: { ref: string; note: string }[];
}

export const CURATED_CROSS_REFERENCES: Record<string, { ref: string; note: string }[]> = {
  "1:1": [
    { ref: "John 1:1-3", note: "Through the Eternal Word all things were made" },
    { ref: "Psalms 33:6", note: "By the word of the Lord the heavens were made" },
    { ref: "Colossians 1:16", note: "All things created through Him and for Him" },
    { ref: "Hebrews 11:3", note: "By faith we understand the universe was formed" },
  ],
  "1:12": [
    { ref: "Galatians 3:8", note: "The gospel preached beforehand to Abraham" },
    { ref: "Matthew 1:1", note: "Jesus Christ, the son of David, the son of Abraham" },
  ],
  "2:12": [
    { ref: "1 Corinthians 5:7", note: "Christ, our Passover lamb, has been sacrificed" },
    { ref: "John 1:29", note: "Behold, the Lamb of God who takes away the sin of the world" },
  ],
  "19:23": [
    { ref: "John 10:11", note: "Jesus declares: 'I am the good shepherd'" },
    { ref: "Ezekiel 34:11-15", note: "God Himself promises to search for and shepherd His sheep" },
    { ref: "1 Peter 2:25", note: "Returned to the Shepherd and Overseer of your souls" },
    { ref: "Revelation 7:17", note: "The Lamb at the center of the throne will be their shepherd" },
  ],
  "19:91": [
    { ref: "Matthew 4:6", note: "Quoted in the wilderness temptation" },
    { ref: "Psalms 46:1", note: "God is our refuge and strength, an ever-present help" },
    { ref: "Romans 8:38-39", note: "Nothing in all creation can separate us from God's love" },
  ],
  "19:119": [
    { ref: "2 Timothy 3:16-17", note: "All Scripture is God-breathed and equips for every good work" },
    { ref: "Matthew 4:4", note: "Man shall not live by bread alone, but by every word of God" },
  ],
  "20:3": [
    { ref: "James 1:5", note: "If any lacks wisdom, let him ask of God generously" },
    { ref: "Jeremiah 29:11", note: "Plans for welfare and a future with hope" },
    { ref: "Psalms 37:5", note: "Commit your way to the Lord; trust in Him" },
  ],
  "23:53": [
    { ref: "1 Peter 2:24", note: "He Himself bore our sins in His body on the tree; by His wounds you have been healed" },
    { ref: "Acts 8:32-35", note: "Philip explains Isaiah 53 to the Ethiopian official" },
    { ref: "2 Corinthians 5:21", note: "Made Him to be sin who knew no sin" },
  ],
  "40:5": [
    { ref: "Luke 6:20-26", note: "Parallel Beatitudes on the plain" },
    { ref: "Isaiah 61:1-3", note: "Good news to the poor and comfort to all who mourn" },
    { ref: "Psalms 37:11", note: "The meek shall inherit the land and delight in abundant peace" },
  ],
  "43:1": [
    { ref: "Genesis 1:1", note: "'In the beginning' — John intentionally echoes creation's dawn" },
    { ref: "Hebrews 1:1-3", note: "The Son is the radiance of God's glory and exact imprint" },
    { ref: "1 John 1:1-2", note: "That which was from the beginning, the Word of life" },
  ],
  "43:3": [
    { ref: "Numbers 21:8-9", note: "The bronze serpent lifted up in the wilderness" },
    { ref: "Ezekiel 36:25-27", note: "Cleansing water and a new Spirit—background to 'born of water and Spirit'" },
    { ref: "Romans 5:8", note: "God demonstrates His own love toward us" },
  ],
  "45:8": [
    { ref: "John 14:16-18", note: "The Spirit of adoption dwelling within believers" },
    { ref: "Isaiah 54:17", note: "No charge can stand against those God justifies" },
    { ref: "Ephesians 1:13-14", note: "Sealed with the promised Holy Spirit as guarantee" },
  ],
  "46:13": [
    { ref: "1 John 4:7-12", note: "Love comes from God, because God is love" },
    { ref: "Colossians 3:14", note: "Above all these put on love, which binds everything together" },
  ],
  "49:2": [
    { ref: "Titus 3:5", note: "He saved us, not because of works done by us in righteousness, but according to His mercy" },
    { ref: "Romans 3:24", note: "Justified freely by His grace through the redemption in Christ Jesus" },
  ],
  "50:4": [
    { ref: "1 Peter 5:7", note: "Casting all your anxieties on Him, because He cares for you" },
    { ref: "Isaiah 26:3", note: "You keep him in perfect peace whose mind is stayed on You" },
    { ref: "Matthew 6:25-34", note: "Jesus' teaching not to be anxious about tomorrow" },
  ],
  "58:11": [
    { ref: "Genesis 15:6", note: "Abram believed the Lord, and He credited it to him as righteousness" },
    { ref: "Habakkuk 2:4", note: "The righteous shall live by his faith" },
  ],
  "66:21": [
    { ref: "Isaiah 65:17-19", note: "Behold, I create new heavens and a new earth" },
    { ref: "Isaiah 25:8", note: "He will swallow up death forever and wipe away tears from all faces" },
    { ref: "Genesis 2:8-10", note: "Eden's river and tree of life restored in the New Jerusalem" },
  ],
};

export interface TopicalGuideTopic {
  id: string;
  label: string;
  emoji: string;
  summary: string;
  passages: { ref: string; note: string }[];
}

export const TOPICAL_LIFE_GUIDES: TopicalGuideTopic[] = [
  {
    id: "anxiety",
    label: "Peace in Anxiety",
    emoji: "🌿",
    summary: "Anchoring a racing mind in the nearness and care of God.",
    passages: [
      { ref: "Philippians 4:6-7", note: "Trade anxious thoughts for thanksgiving and guarded peace" },
      { ref: "Psalms 23:1-4", note: "The Shepherd leads beside still waters and through dark valleys" },
      { ref: "Matthew 6:25-34", note: "Consider the birds and lilies—your Father knows what you need" },
      { ref: "Isaiah 41:10", note: "Fear not, for I am with you; I will strengthen and uphold you" },
      { ref: "1 Peter 5:7", note: "Cast every care upon Him, because He cares personally for you" },
    ],
  },
  {
    id: "wisdom",
    label: "Wisdom & Decisions",
    emoji: "🧭",
    summary: "Clarity and discernment when standing at a crossroads.",
    passages: [
      { ref: "James 1:5", note: "God gives wisdom generously and without reproach" },
      { ref: "Proverbs 3:5-6", note: "Trust wholeheartedly; He will make straight your paths" },
      { ref: "Psalms 119:105", note: "A lamp for the next step, even before seeing the horizon" },
      { ref: "Psalms 25:4-5", note: "Show me Your ways, O Lord; teach me Your paths" },
    ],
  },
  {
    id: "grief",
    label: "Comfort in Grief",
    emoji: "🕯️",
    summary: "Gentle Scripture for heavy hearts, loss, and waiting.",
    passages: [
      { ref: "Psalms 34:18", note: "The Lord is near to the brokenhearted" },
      { ref: "Lamentations 3:22-24", note: "Mercies fresh every morning in the middle of sorrow" },
      { ref: "2 Corinthians 1:3-4", note: "The Father of mercies and God of all comfort" },
      { ref: "Revelation 21:4", note: "The promise that every tear will be wiped away" },
    ],
  },
  {
    id: "forgiveness",
    label: "Grace & Forgiveness",
    emoji: "🕊️",
    summary: "Receiving cleansing mercy and extending freedom to others.",
    passages: [
      { ref: "Psalms 103:10-12", note: "As far as the east is from the west, so far He removes transgression" },
      { ref: "1 John 1:9", note: "Faithful and just to forgive and cleanse from all unrighteousness" },
      { ref: "Romans 8:1", note: "There is now no condemnation for those who are in Christ Jesus" },
      { ref: "Ephesians 4:32", note: "Be kind and tenderhearted, forgiving one another" },
    ],
  },
  {
    id: "strength",
    label: "Strength When Weary",
    emoji: "⛰️",
    summary: "Renewed endurance when your own energy runs dry.",
    passages: [
      { ref: "Isaiah 40:28-31", note: "Those who wait for the Lord shall renew their strength" },
      { ref: "Matthew 11:28-30", note: "Come to Me, all who labor and are heavy laden, and I will give you rest" },
      { ref: "2 Corinthians 12:9", note: "My grace is sufficient for you; power made perfect in weakness" },
      { ref: "Joshua 1:9", note: "Be strong and courageous—the Lord goes with you wherever you go" },
    ],
  },
  {
    id: "purpose",
    label: "Identity & Calling",
    emoji: "✨",
    summary: "Remembering who you are and why you were created.",
    passages: [
      { ref: "Ephesians 2:10", note: "His workmanship, created in Christ Jesus for good works" },
      { ref: "Psalms 139:13-16", note: "Fearfully and wonderfully woven together" },
      { ref: "1 Peter 2:9", note: "Called out of darkness into His marvelous light" },
      { ref: "Micah 6:8", note: "Do justice, love kindness, and walk humbly with your God" },
    ],
  },
];

/**
 * Checks whether a verse in Gospels/Acts/Revelation likely contains direct speech of Jesus
 * when a translation doesn't provide explicit USFM wordsOfJesus offsets.
 */
export function detectHeuristicJesusSpeechRanges(
  bookNumber: number,
  chapter: number,
  text: string
): { start: number; end: number }[] | undefined {
  // Matthew (40), Mark (41), Luke (42), John (43), Acts 1/9, Rev 1-3/22
  const isGospel = bookNumber >= 40 && bookNumber <= 43;
  if (!isGospel && bookNumber !== 66) return undefined;

  // Extended full-discourse chapters of Jesus (Sermon on the Mount Matt 5-7, Upper Room John 14-17)
  if (
    (bookNumber === 40 && chapter >= 5 && chapter <= 7) ||
    (bookNumber === 43 && chapter >= 14 && chapter <= 17)
  ) {
    // Exclude brief narrative intro in Matt 5:1-2
    if (bookNumber === 40 && chapter === 5 && /^And seeing the multitudes|^Now when Jesus saw|^And he opened/i.test(text)) {
      return undefined;
    }
    return [{ start: 0, end: text.length }];
  }

  // Quoted Jesus speech in modern translations ("..." or “...”) when Jesus is speaker
  if (/Jesus\s+(said|answered|replied|cried|spoke|asked|told)/i.test(text)) {
    const quoteMatches: { start: number; end: number }[] = [];
    const regex = /([“"][^”"]+[”"]?)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      quoteMatches.push({ start: m.index, end: m.index + m[0].length });
    }
    if (quoteMatches.length > 0) return quoteMatches;

    // KJV style: "Jesus saith unto him, I am the way..."
    const kjvMatch = text.match(
      /Jesus\s+(?:saith|said|answered(?:\s+and\s+said)?|spake)[^,:]*[,:]\s*(.+)$/i
    );
    if (kjvMatch && kjvMatch.index !== undefined) {
      const start = text.indexOf(kjvMatch[1], kjvMatch.index);
      if (start >= 0) return [{ start, end: text.length }];
    }
  }

  return undefined;
}
