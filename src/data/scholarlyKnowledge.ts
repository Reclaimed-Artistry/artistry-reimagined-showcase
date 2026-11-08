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
  {
    id: "love",
    label: "Love in Scripture",
    emoji: "💛",
    summary: "Tracing love as faithful action toward God and neighbor, not only a feeling.",
    passages: [
      { ref: "1 Corinthians 13:4-7", note: "Paul describes the patient, self-giving shape of love" },
      { ref: "1 John 4:7-12", note: "Love flows from God, who first loved us" },
      { ref: "John 15:12-13", note: "Jesus joins love to the costly act of laying down one's life" },
      { ref: "Leviticus 19:18", note: "Israel is commanded to love the neighbor as oneself" },
    ],
  },
  {
    id: "faith",
    label: "Faith & Trust",
    emoji: "🌱",
    summary: "Faith in Scripture is trust that becomes faithful response, held honestly even in uncertainty.",
    passages: [
      { ref: "Hebrews 11:1", note: "A classic description of faith and hoped-for realities" },
      { ref: "Romans 10:17", note: "Paul connects faith with hearing the message of Christ" },
      { ref: "Mark 9:24", note: "A father brings both belief and doubt honestly to Jesus" },
      { ref: "James 2:17", note: "James says living faith bears fruit in action" },
    ],
  },
  {
    id: "hope",
    label: "Hope & Encouragement",
    emoji: "🌅",
    summary: "Biblical hope is expectation grounded in God's character and promises, not denial of hardship.",
    passages: [
      { ref: "Romans 15:13", note: "Paul prays for joy, peace, and hope through the Spirit" },
      { ref: "1 Peter 1:3-4", note: "Hope is tied to resurrection and an enduring inheritance" },
      { ref: "Psalms 42:5", note: "The psalmist speaks to a downcast soul while waiting on God" },
      { ref: "Lamentations 3:21-24", note: "Hope is remembered amid grief and loss" },
    ],
  },
  {
    id: "prayer",
    label: "Prayer",
    emoji: "🙏",
    summary: "Scripture presents prayer as honest relationship: praise, asking, lament, confession, and listening.",
    passages: [
      { ref: "Matthew 6:9-13", note: "Jesus gives a pattern for prayer centered on God's name, kingdom, and daily needs" },
      { ref: "Philippians 4:6-7", note: "Paul invites prayer and thanksgiving amid anxiety" },
      { ref: "1 Thessalonians 5:16-18", note: "A short rhythm of joy, prayer, and gratitude" },
      { ref: "Psalms 13:1-6", note: "A lament that moves from painful questions toward trust" },
    ],
  },
  {
    id: "salvation",
    label: "Salvation & Grace",
    emoji: "🕊️",
    summary: "Explore how Scripture describes God's rescue, forgiveness, and new life; traditions explain some details differently.",
    passages: [
      { ref: "Ephesians 2:8-10", note: "Grace, faith, and good works in Paul's account of salvation" },
      { ref: "Romans 5:1-8", note: "Reconciliation and God's love while people are still weak" },
      { ref: "John 3:16-17", note: "God's love and the purpose of the Son's coming" },
      { ref: "Titus 3:4-7", note: "Mercy, renewal, and hope in Paul's letter" },
    ],
  },
  {
    id: "holy-spirit",
    label: "The Holy Spirit",
    emoji: "✨",
    summary: "Read key passages about the Spirit's presence, teaching, empowerment, and fruit.",
    passages: [
      { ref: "John 14:25-27", note: "Jesus speaks of the Spirit teaching and reminding the disciples" },
      { ref: "Acts 1:8", note: "The Spirit empowers witness" },
      { ref: "Galatians 5:22-25", note: "Paul names the fruit associated with life in the Spirit" },
      { ref: "Romans 8:26-27", note: "The Spirit helps in weakness and intercedes" },
    ],
  },
  {
    id: "temptation",
    label: "Temptation & Resilience",
    emoji: "🛡️",
    summary: "The Bible describes temptation honestly and points toward wise support, endurance, and God's faithfulness.",
    passages: [
      { ref: "1 Corinthians 10:13", note: "Paul speaks of God's faithfulness and a way to endure temptation" },
      { ref: "James 1:13-15", note: "James examines how desire can grow into destructive action" },
      { ref: "Matthew 4:1-11", note: "Jesus faces temptation in the wilderness" },
      { ref: "Hebrews 4:14-16", note: "Jesus' compassion grounds an invitation to seek help" },
    ],
  },
  {
    id: "anger",
    label: "Anger & Reconciliation",
    emoji: "🕊️",
    summary: "Scripture takes anger seriously and calls readers toward patience, truthful speech, and repair.",
    passages: [
      { ref: "James 1:19-20", note: "Be quick to listen, slow to speak, and slow to anger" },
      { ref: "Ephesians 4:26-32", note: "Address anger without letting it become a foothold for harm" },
      { ref: "Proverbs 15:1", note: "A gentle answer can turn away wrath" },
      { ref: "Matthew 5:21-24", note: "Jesus connects worship with seeking reconciliation" },
    ],
  },
  {
    id: "family",
    label: "Family & Relationships",
    emoji: "🏡",
    summary: "Explore biblical guidance on care, commitment, humility, and mutual responsibility in relationships.",
    passages: [
      { ref: "Ephesians 4:1-3", note: "Humility, patience, and bearing with one another" },
      { ref: "Colossians 3:12-14", note: "Compassion, forgiveness, and love as a bond of unity" },
      { ref: "1 Corinthians 13:4-7", note: "A description of patient and generous love" },
      { ref: "Ephesians 6:1-4", note: "Instructions to children and parents in their historical setting" },
    ],
  },
  {
    id: "suffering",
    label: "Suffering & Lament",
    emoji: "🕯️",
    summary: "The Bible gives space to grief and protest as well as comfort; suffering should not be minimized or blamed on the sufferer.",
    passages: [
      { ref: "Psalms 13:1-6", note: "A prayer that names distress and asks how long" },
      { ref: "Job 3:1-10", note: "Job voices the depth of his anguish" },
      { ref: "John 11:32-36", note: "Jesus weeps with those grieving Lazarus" },
      { ref: "2 Corinthians 1:3-7", note: "Paul writes about comfort amid affliction" },
    ],
  },
  {
    id: "courage",
    label: "Courage & Fear",
    emoji: "🦁",
    summary: "Biblical courage grows from God's presence and faithful action; it does not require pretending danger or fear is absent.",
    passages: [
      { ref: "Joshua 1:5-9", note: "Joshua is called to courage grounded in God's presence and instruction" },
      { ref: "Psalms 27:1-5", note: "The Lord is named as light and refuge amid threat" },
      { ref: "Isaiah 41:8-13", note: "God promises presence and help to fearful Israel" },
      { ref: "Acts 4:23-31", note: "The church prays for boldness in the face of opposition" },
    ],
  },
  {
    id: "integrity",
    label: "Integrity & Honesty",
    emoji: "🧭",
    summary: "Integrity is whole-life faithfulness: truthful speech, just conduct, and consistency when no one is watching.",
    passages: [
      { ref: "Psalms 15:1-5", note: "A portrait of truthful and just life before God" },
      { ref: "Proverbs 10:9", note: "Walking in integrity offers a secure path" },
      { ref: "Daniel 6:3-5", note: "Daniel's public service is marked by trustworthiness" },
      { ref: "Luke 16:10-13", note: "Faithfulness in small things reveals what we serve" },
    ],
  },
  {
    id: "gratitude",
    label: "Gratitude & Thanksgiving",
    emoji: "🌾",
    summary: "Biblical gratitude notices God's gifts without denying grief, injustice, or unanswered questions.",
    passages: [
      { ref: "Psalms 100:1-5", note: "Give thanks because the Lord is good and steadfast in love" },
      { ref: "1 Thessalonians 5:16-18", note: "Joy, prayer, and thanksgiving form a communal practice" },
      { ref: "Colossians 3:15-17", note: "Gratitude shapes worship, speech, and shared life" },
      { ref: "Luke 17:11-19", note: "One healed Samaritan returns to give thanks" },
    ],
  },
  {
    id: "justice",
    label: "Justice & Mercy",
    emoji: "⚖️",
    summary: "The prophets join worship to justice, mercy, humility, and practical care for people facing oppression.",
    passages: [
      { ref: "Micah 6:6-8", note: "Do justice, love mercy, and walk humbly with God" },
      { ref: "Isaiah 1:16-17", note: "Learn to do good and defend the vulnerable" },
      { ref: "Amos 5:21-24", note: "Worship is rejected when justice is absent" },
      { ref: "Luke 4:16-21", note: "Jesus announces good news and release in his mission" },
    ],
  },
  {
    id: "humility",
    label: "Humility & Service",
    emoji: "🫶",
    summary: "Christian humility is not self-hatred; it is a Christ-shaped willingness to honor others and serve without seeking status.",
    passages: [
      { ref: "Philippians 2:1-11", note: "Paul points to Christ's self-giving humility" },
      { ref: "John 13:1-17", note: "Jesus washes his disciples' feet and calls them to serve" },
      { ref: "James 4:6-10", note: "Resist pride, draw near to God, and practice humility" },
      { ref: "Micah 6:8", note: "Walk humbly while doing justice and loving mercy" },
    ],
  },
  {
    id: "leadership",
    label: "Servant Leadership",
    emoji: "🪔",
    summary: "Jesus contrasts leadership by domination with leadership expressed through service, care, and accountable example.",
    passages: [
      { ref: "Mark 10:35-45", note: "Jesus teaches greatness through serving rather than lording power" },
      { ref: "John 13:12-17", note: "The teacher and Lord models humble service" },
      { ref: "1 Peter 5:1-4", note: "Shepherd the community willingly and without domineering" },
      { ref: "1 Timothy 3:1-7", note: "Leadership is tied to character and trustworthy conduct" },
    ],
  },
  {
    id: "stewardship",
    label: "Stewardship & Generosity",
    emoji: "🌱",
    summary: "Resources, gifts, and creation are entrusted responsibilities to be used faithfully, generously, and with care.",
    passages: [
      { ref: "Genesis 1:26-31", note: "Human vocation includes responsibility for God's good creation" },
      { ref: "Luke 12:35-48", note: "Faithfulness is pictured as responsible stewardship" },
      { ref: "2 Corinthians 9:6-11", note: "Generosity is willing, cheerful, and directed toward shared need" },
      { ref: "1 Peter 4:10-11", note: "Use received gifts to serve one another" },
    ],
  },
  {
    id: "perseverance",
    label: "Perseverance & Endurance",
    emoji: "🏃",
    summary: "Scripture encourages endurance through hope, community, and renewed faithfulness—not through denying exhaustion or refusing help.",
    passages: [
      { ref: "Hebrews 12:1-3", note: "Run with endurance while looking to Jesus" },
      { ref: "James 1:2-8", note: "Trials can form endurance as believers ask God for wisdom" },
      { ref: "Galatians 6:7-10", note: "Do not grow weary in doing good" },
      { ref: "Romans 5:1-5", note: "Paul traces a hope-filled pattern through suffering and endurance" },
    ],
  },
  {
    id: "technology",
    label: "Technology & Wisdom",
    emoji: "📱",
    summary: "The Bible does not address modern devices directly, but it offers wisdom about attention, truth, speech, self-control, and loving our neighbors.",
    passages: [
      { ref: "Philippians 4:8-9", note: "Attend to what is true, honorable, just, pure, and worthy of praise" },
      { ref: "Ephesians 4:25-32", note: "Use truthful speech that builds others up and refuses destructive words" },
      { ref: "1 Corinthians 10:23-24", note: "Ask not only what is allowed, but what builds others up" },
      { ref: "James 3:1-12", note: "The tongue can cause great harm and needs wise discipline" },
    ],
  },
  {
    id: "work",
    label: "Work & Vocation",
    emoji: "🛠️",
    summary: "Scripture connects work with service, justice, rest, and the dignity of people; ancient household texts need careful historical reading.",
    passages: [
      { ref: "Ecclesiastes 3:9-13", note: "Work is part of life, and its fruit can be received as a gift" },
      { ref: "Colossians 3:22-24", note: "A first-century instruction to enslaved people, not an endorsement of slavery or abusive labor" },
      { ref: "Ephesians 2:8-10", note: "Good works are a result of grace, not a way to earn worth" },
      { ref: "1 Thessalonians 4:9-12", note: "Paul commends quiet faithfulness and responsible work" },
    ],
  },
  {
    id: "worship",
    label: "Worship & Everyday Life",
    emoji: "🎶",
    summary: "Biblical worship includes praise and gathered prayer, and the prophets insist that it must be joined to justice and faithful living.",
    passages: [
      { ref: "Psalms 95:1-7", note: "Worship celebrates God and listens for God's voice" },
      { ref: "John 4:19-24", note: "Jesus speaks about worship in spirit and truth" },
      { ref: "Romans 12:1-2", note: "Paul describes a whole-life response shaped by renewed minds" },
      { ref: "Amos 5:21-24", note: "Ritual without justice is rejected by the prophet" },
    ],
  },
  {
    id: "patience",
    label: "Patience & Self-Control",
    emoji: "⏳",
    summary: "Patience is Spirit-shaped endurance and gentleness, not passive acceptance of harm or injustice.",
    passages: [
      { ref: "Galatians 5:22-26", note: "Patience and self-control are named among the fruit of the Spirit" },
      { ref: "Ephesians 4:1-3", note: "Bear with one another in love while seeking unity" },
      { ref: "James 5:7-11", note: "James encourages patient endurance in hardship" },
      { ref: "Proverbs 15:1", note: "A gentle answer can turn away wrath" },
    ],
  },
  {
    id: "doubt",
    label: "Doubt & Honest Questions",
    emoji: "❓",
    summary: "The Bible preserves honest questions and stories of struggle; doubt should be met with truth, compassion, and room to seek.",
    passages: [
      { ref: "Mark 9:14-29", note: "A father brings both belief and doubt to Jesus" },
      { ref: "Psalms 73:1-17", note: "A psalmist voices confusion and seeks understanding in worship" },
      { ref: "John 20:24-29", note: "Thomas is met by Jesus in the midst of his questions" },
      { ref: "James 1:5-8", note: "James encourages asking God for wisdom" },
    ],
  },
  {
    id: "reconciliation",
    label: "Reconciliation & Repair",
    emoji: "🧩",
    summary: "Scripture calls for truthful repair and peace where possible, while reconciliation must never be used to force unsafe contact.",
    passages: [
      { ref: "Matthew 5:21-26", note: "Jesus calls disciples to take damaged relationships seriously" },
      { ref: "2 Corinthians 5:17-21", note: "Paul describes reconciliation as God's work in Christ" },
      { ref: "Ephesians 4:25-32", note: "Truthful speech, kindness, and forgiveness shape community" },
      { ref: "Romans 12:17-21", note: "Pursue peace as far as it depends on you without taking revenge" },
    ],
  },
  {
    id: "healing",
    label: "Healing & Care",
    emoji: "🩹",
    summary: "The Bible includes prayer for healing, compassionate care, and faithful life amid ongoing illness; it does not promise every person will be cured now.",
    passages: [
      { ref: "Psalms 103:1-5", note: "A song of praise that remembers God's care and restoration" },
      { ref: "Mark 2:1-12", note: "Jesus responds to a paralyzed man brought by a caring community" },
      { ref: "James 5:13-16", note: "The community prays for the sick and cares for one another" },
      { ref: "2 Corinthians 12:7-10", note: "Paul speaks of weakness and sustaining grace without receiving the healing he sought" },
    ],
  },
  {
    id: "evangelism",
    label: "Witness & Sharing Faith",
    emoji: "🕊️",
    summary: "Christian witness is grounded in Jesus and expressed with gentleness, respect, truthful speech, and attentive listening.",
    passages: [
      { ref: "Matthew 28:16-20", note: "Jesus commissions disciples to teach and make disciples" },
      { ref: "1 Peter 3:13-17", note: "Give an account of hope with gentleness and respect" },
      { ref: "Acts 17:16-34", note: "Paul engages listeners in Athens by attending to their context" },
      { ref: "Colossians 4:2-6", note: "Speak graciously and wisely with those outside the community" },
    ],
  },
];

export interface SermonFrameworkPoint {
  title: string;
  exposition: string;
  application: string;
}

export interface SermonFramework {
  bigIdea: string;
  purpose: string;
  points: [SermonFrameworkPoint, SermonFrameworkPoint, SermonFrameworkPoint];
}

/** Curated sermon-building notes paired with the topical reading guides above. */
export const SERMON_FRAMEWORKS: Record<string, SermonFramework> = {
  anxiety: {
    bigIdea: "God meets anxious people with presence, prayer, and care; Scripture does not shame them for feeling fear.",
    purpose: "Invite honest prayer and wise support while remembering God's nearness.",
    points: [
      { title: "Name what weighs on the heart", exposition: "The Psalms make room for fear and lament rather than hiding them.", application: "Let people name a real concern without being rushed into a slogan." },
      { title: "Bring the concern to God", exposition: "Philippians 4 connects prayer and thanksgiving with God's guarding peace.", application: "Practice one honest prayer and identify a trusted person or practical next step." },
      { title: "Receive care one day at a time", exposition: "Jesus points to the Father's care in Matthew 6 without promising a trouble-free life.", application: "Separate today's faithful action from tomorrow's imagined burdens." },
    ],
  },
  wisdom: {
    bigIdea: "God gives wisdom, and Scripture trains us to seek it with humility, discernment, and faithful action.",
    purpose: "Help listeners take a wise next step rather than demand certainty about the entire future.",
    points: [
      { title: "Ask God for wisdom", exposition: "James 1:5 invites people who lack wisdom to ask God generously.", application: "Turn a decision into a specific prayer, not just a request for a preferred outcome." },
      { title: "Let trust reshape the decision", exposition: "Proverbs 3:5-6 calls for trust in God rather than self-sufficient certainty.", application: "Test options against Scripture, character, and the counsel of mature people." },
      { title: "Walk the light you have", exposition: "Psalm 119 pictures God's word as a lamp for the next step.", application: "Name one responsible action you can take now, and remain open to correction." },
    ],
  },
  grief: {
    bigIdea: "God's people may lament honestly, and the community of faith is called to share comfort and hope.",
    purpose: "Offer companionship and scriptural hope without minimizing loss or prescribing a timetable for grief.",
    points: [
      { title: "Tell the truth about sorrow", exposition: "The Psalms and Lamentations give faithful language to pain and unanswered questions.", application: "Make room for silence, tears, and honest questions in the congregation." },
      { title: "Notice God beside the brokenhearted", exposition: "Psalm 34:18 speaks of God's nearness; John 11 shows Jesus weeping with mourners.", application: "Be present before offering explanations; ask what practical care is needed." },
      { title: "Hold hope without rushing grief", exposition: "Christian hope looks toward God's promised restoration while taking present suffering seriously.", application: "Offer one concrete act of support and let lament and hope coexist." },
    ],
  },
  forgiveness: {
    bigIdea: "God's mercy frees people from condemnation and forms communities marked by truthful, costly forgiveness.",
    purpose: "Invite people to receive grace and pursue repair without excusing abuse or removing wise boundaries.",
    points: [
      { title: "Receive mercy honestly", exposition: "Psalm 103 and 1 John 1:9 describe God's compassion and cleansing.", application: "Name wrong honestly; grace is not pretending harm did not happen." },
      { title: "Release vengeance to God", exposition: "Jesus and the apostles call disciples away from retaliation and toward mercy.", application: "Forgiveness is not the same as instant trust, reconciliation, or access to an unsafe person." },
      { title: "Practice repair where possible", exposition: "Ephesians 4 joins forgiveness with kindness and changed speech.", application: "Where it is safe and appropriate, make amends, seek accountability, and rebuild trust over time." },
    ],
  },
  strength: {
    bigIdea: "God meets human limits with sustaining grace, rest, and the help of others.",
    purpose: "Encourage weary listeners to receive care and take sustainable steps rather than glorify burnout.",
    points: [
      { title: "Admit our limits", exposition: "Biblical lament and the ministry of Jesus make room for human weakness and rest.", application: "Notice exhaustion without treating it as a spiritual failure." },
      { title: "Receive grace for today", exposition: "Isaiah 40 and 2 Corinthians 12 speak of strength that comes from God, not self-sufficiency.", application: "Ask what support, rest, or help is needed now." },
      { title: "Keep going together", exposition: "The church is called to bear burdens and encourage one another.", application: "Choose one small faithful action and one person who can walk alongside you." },
    ],
  },
  purpose: {
    bigIdea: "In Christ, people are welcomed by grace and formed for good works that serve the world.",
    purpose: "Ground identity in God's grace and invite service without turning vocation into a measure of worth.",
    points: [
      { title: "Receive identity as gift", exposition: "Ephesians 2 places good works after God's gift of grace, not as a way to earn it.", application: "Separate your worth from productivity, role, or public recognition." },
      { title: "Notice how you are being formed", exposition: "Scripture describes gifts and character as resources for serving neighbors.", application: "Ask what needs and gifts are already present in your community." },
      { title: "Take the next faithful step", exposition: "Micah 6:8 joins justice, mercy, and humility in everyday life with God.", application: "Choose a concrete act of service rather than waiting for a perfect life plan." },
    ],
  },
  love: {
    bigIdea: "God's love, revealed in Christ, becomes a practical pattern of patient and self-giving love for neighbors.",
    purpose: "Move listeners from sentiment about love to concrete, truthful care for others.",
    points: [
      { title: "Begin with the love of God", exposition: "1 John 4 says love originates in God, who loved us first.", application: "Receive love as grace before treating love as a performance test." },
      { title: "Look at love's shape", exposition: "1 Corinthians 13 describes patience, kindness, truth, and endurance in community.", application: "Ask which of these qualities a real relationship needs this week." },
      { title: "Practice love through service", exposition: "Jesus connects love with laying down status and serving others.", application: "Choose a specific act of care that respects the other person's dignity and safety." },
    ],
  },
  faith: {
    bigIdea: "Biblical faith is trust in God that can speak honestly about doubt and grows into faithful action.",
    purpose: "Invite listeners to bring questions to Jesus and take a grounded next step of trust.",
    points: [
      { title: "Hear the promise and story", exposition: "Hebrews 11 remembers people who trusted God amid unfinished outcomes.", application: "Read the whole story, not only a slogan about faith." },
      { title: "Bring honest doubt to Jesus", exposition: "In Mark 9:24 a father voices both belief and need for help.", application: "Make room for questions and prayer for help within the community." },
      { title: "Let trust become action", exposition: "James 2 insists that living faith bears fruit in practical care.", application: "Identify one act of obedience or neighbor-love that follows from trust." },
    ],
  },
  hope: {
    bigIdea: "Christian hope is grounded in God's character and resurrection, and it can live alongside grief and waiting.",
    purpose: "Encourage patient, active hope without denying hardship or promising a quick outcome.",
    points: [
      { title: "Remember what is true", exposition: "Biblical hope often begins by recalling God's steadfast love in difficult circumstances.", application: "Name a trustworthy promise in its original context, not as a guarantee of ease." },
      { title: "Look toward resurrection hope", exposition: "The New Testament roots hope in the resurrection of Jesus and God's future renewal.", application: "Let future hope strengthen compassion in the present." },
      { title: "Practice hope together", exposition: "Scripture calls communities to encourage one another and persevere in doing good.", application: "Offer a practical word or act of support to someone who is waiting." },
    ],
  },
  prayer: {
    bigIdea: "Prayer is honest relationship with God: praise, lament, confession, asking, gratitude, and listening.",
    purpose: "Help listeners build a truthful, sustainable rhythm of prayer shaped by Jesus.",
    points: [
      { title: "Begin with God's name and kingdom", exposition: "The Lord's Prayer centers prayer on God's holiness and purposes before personal requests.", application: "Pray one line of the Lord's Prayer slowly and connect it to daily life." },
      { title: "Bring daily need honestly", exposition: "Jesus teaches people to ask for daily bread and forgiveness, not to perform for an audience.",
        application: "Name one need and one relationship in which you need grace." },
      { title: "Keep prayer rooted in life", exposition: "Paul joins prayer with thanksgiving and the pursuit of peace.", application: "Choose a simple time and place to pray, and let prayer lead to faithful action." },
    ],
  },
  salvation: {
    bigIdea: "Salvation is God's gracious rescue and new life, received by faith and expressed in good works.",
    purpose: "Explain grace clearly while acknowledging that Christian traditions differ on some details of salvation.",
    points: [
      { title: "Start with God's initiative", exposition: "Ephesians 2:8-10 presents salvation as a gift of grace, not a human achievement.", application: "Reject boasting and despair alike; neither earns God's welcome." },
      { title: "See the cost and reach of love", exposition: "Romans 5 describes God's love shown toward people while they were still weak and sinful.", application: "Let received mercy produce gratitude and humility." },
      { title: "Walk in the new life grace creates", exposition: "The same passage connects grace with good works prepared for the community.", application: "Choose a work of justice, service, or reconciliation as fruit, not payment, for grace." },
    ],
  },
  "holy-spirit": {
    bigIdea: "The Holy Spirit is God's empowering presence, forming Christlike character and equipping the church for witness and service.",
    purpose: "Explore the Spirit through biblical texts while avoiding claims that go beyond what a passage says.",
    points: [
      { title: "Receive the Spirit's presence", exposition: "Jesus promises the Spirit's help and teaching to his disciples in John 14.", application: "Seek God's guidance with humility and test impressions alongside Scripture and wise community." },
      { title: "Be empowered to witness", exposition: "Acts 1:8 connects the Spirit's power with witness to Jesus.", application: "Speak and serve with courage, humility, and respect for others." },
      { title: "Look for the Spirit's fruit", exposition: "Galatians 5 names love, joy, peace, patience, and other marks of Spirit-shaped life.", application: "Ask which fruit needs to grow in your relationships this week." },
    ],
  },
  temptation: {
    bigIdea: "Scripture names temptation honestly and calls people to seek God's help, wise boundaries, and supportive community.",
    purpose: "Offer practical hope without shaming people or implying that every struggle has a simple solution.",
    points: [
      { title: "Understand the pull", exposition: "James 1 describes how desire can grow toward harmful choices.", application: "Notice triggers and patterns without reducing a person to a struggle." },
      { title: "Remember God's faithfulness", exposition: "1 Corinthians 10:13 points to God's faithfulness and a way to endure temptation.", application: "Make a concrete plan for the moment of temptation and seek trusted support." },
      { title: "Approach Jesus for help", exposition: "Hebrews 4 presents Jesus as compassionate toward human weakness.", application: "Ask for help early; include pastoral, medical, or recovery support when appropriate." },
    ],
  },
  anger: {
    bigIdea: "Scripture takes anger seriously and calls people toward listening, truthful speech, justice, and repair.",
    purpose: "Help listeners respond to anger without excusing harm or silencing people who have been wronged.",
    points: [
      { title: "Listen before reacting", exposition: "James 1:19-20 warns that human anger does not automatically produce God's justice.", application: "Pause long enough to hear what is happening and who may be harmed." },
      { title: "Speak truth without cruelty", exposition: "Ephesians 4 urges truthful speech and warns against letting anger become destructive.", application: "Set clear limits; do not use reconciliation language to pressure someone into danger." },
      { title: "Pursue repair and justice", exposition: "Jesus connects worship with seeking reconciliation where possible.", application: "Take accountable steps toward repair, with protection and outside help when needed." },
    ],
  },
  family: {
    bigIdea: "The biblical vision for relationships includes mutual care, patience, and love that protects the dignity of each person.",
    purpose: "Encourage healthy, reciprocal relationships without using household texts to excuse coercion or abuse.",
    points: [
      { title: "Put on compassion and patience", exposition: "Colossians 3 calls the community to kindness, forgiveness, and love.", application: "Name one way to listen and speak with respect at home." },
      { title: "Practice mutual responsibility", exposition: "The New Testament addresses households within their historical setting and also calls believers to care for one another.", application: "Read household passages carefully; never use them to justify violence or coercive control." },
      { title: "Build a home of safety and grace", exposition: "Love is patient and seeks the good of the neighbor.", application: "Make safety, truth, and support priorities when a relationship is harmful." },
    ],
  },
  suffering: {
    bigIdea: "The Bible gives language for lament and shows God drawing near; suffering is not proof that a person has failed.",
    purpose: "Stand with people in pain and offer hope without blaming, minimizing, or forcing a quick resolution.",
    points: [
      { title: "Give pain its truthful voice", exposition: "Psalm 13 asks 'How long?' and still turns toward God in prayer.", application: "Let lament be part of faithful worship and do not silence hard questions." },
      { title: "Remember God shares our grief", exposition: "John 11 shows Jesus weeping with mourners before the story turns toward hope.", application: "Offer presence and practical help before offering explanations." },
      { title: "Receive and pass on comfort", exposition: "2 Corinthians 1 describes comfort received from God and shared with others.", application: "Connect people to community and professional care when needed." },
    ],
  },
  courage: {
    bigIdea: "Courage is faithful action rooted in God's presence, not the absence of fear.",
    purpose: "Encourage a faithful next step while acknowledging real risks and seeking wise support.",
    points: [
      { title: "Ground courage in God's presence", exposition: "Joshua 1 links courage with God's presence and attention to the instruction given to Joshua.", application: "Ask what faithfulness looks like in this situation, not what fearlessness would look like." },
      { title: "Pray for courage together", exposition: "Acts 4 shows the early church asking for boldness amid opposition.", application: "Name a challenge in community and pray for wise, truthful speech." },
      { title: "Act with courage and care", exposition: "Biblical courage serves God's purposes rather than seeking danger for its own sake.", application: "Take a responsible step and use appropriate protection and counsel." },
    ],
  },
  integrity: {
    bigIdea: "Integrity joins inner conviction to honest, dependable action in public and private life.",
    purpose: "Call listeners to truthful conduct, accountability, and repair when they fail.",
    points: [
      { title: "Walk truthfully", exposition: "Psalm 15 portrays worship as inseparable from truthful speech and just conduct.", application: "Tell the truth even when doing so requires accountability." },
      { title: "Be faithful in small things", exposition: "Jesus teaches that faithfulness in little matters reflects the heart.", application: "Review ordinary commitments—money, time, words, and promises." },
      { title: "Let integrity serve the common good", exposition: "Daniel's trustworthiness is visible in public life, not only private devotion.", application: "Use influence to protect others and correct wrongdoing." },
    ],
  },
  gratitude: {
    bigIdea: "Gratitude is a practiced response to God's goodness that can coexist with lament and the work of justice.",
    purpose: "Cultivate thankfulness without telling people to be grateful for abuse, loss, or injustice.",
    points: [
      { title: "Remember goodness received", exposition: "Psalm 100 grounds thanksgiving in God's enduring goodness and faithfulness.", application: "Name gifts honestly without denying what remains hard." },
      { title: "Practice gratitude in community", exposition: "Colossians connects thankfulness with worship and words that build others up.", application: "Offer specific thanks to God and to someone whose care you have received." },
      { title: "Let gratitude become generosity", exposition: "Paul's teaching connects God's gifts with sharing and care for others.", application: "Respond to what you have received with a concrete act of generosity." },
    ],
  },
  justice: {
    bigIdea: "Faithful worship bears fruit in justice, mercy, humility, and practical solidarity with the vulnerable.",
    purpose: "Move from religious words toward truthful, accountable action that seeks neighbors' well-being.",
    points: [
      { title: "Hear the prophets' challenge", exposition: "Amos rejects worship detached from justice; Micah joins justice with mercy and humility.", application: "Ask who is excluded or harmed by the way a community operates." },
      { title: "Practice justice concretely", exposition: "Isaiah calls God's people to defend the vulnerable and learn to do good.", application: "Choose an action that addresses a real need, with affected people heard and involved." },
      { title: "Follow the mission of Jesus", exposition: "Luke 4 presents Jesus announcing good news and release as part of his mission.", application: "Pair compassion with sustained service and accountability." },
    ],
  },
  humility: {
    bigIdea: "Christ-shaped humility releases status-seeking and turns toward honoring and serving others.",
    purpose: "Invite humble service without teaching people to accept humiliation or abuse.",
    points: [
      { title: "See humility in Jesus", exposition: "Philippians 2 points to Christ's self-giving pattern.", application: "Use status or influence to make room for others, not to diminish yourself." },
      { title: "Take the posture of a servant", exposition: "In John 13 Jesus washes the disciples' feet and calls them to follow his example.", application: "Choose one unnoticed act of care that respects the receiver's dignity." },
      { title: "Walk humbly with God", exposition: "Micah 6:8 joins humility to justice and mercy.", application: "Stay teachable, receive correction, and act for your neighbor's good." },
    ],
  },
  leadership: {
    bigIdea: "In Jesus' teaching, leadership is accountable service rather than domination or self-promotion.",
    purpose: "Call leaders to protect, equip, and serve people entrusted to their care.",
    points: [
      { title: "Reject power used to dominate", exposition: "Mark 10 contrasts Jesus' way with rulers who 'lord it over' others.", application: "Examine where authority is being used for personal benefit." },
      { title: "Lead by serving", exposition: "Jesus models humble service and calls disciples to do likewise.", application: "Ask those affected what support they need; make service visible in decisions." },
      { title: "Remain accountable", exposition: "1 Peter 5 warns shepherds not to domineer and points to willing example.", application: "Welcome oversight, safeguarding, and honest feedback." },
    ],
  },
  stewardship: {
    bigIdea: "What we receive is entrusted to us for faithful care, generosity, and service to others.",
    purpose: "Encourage responsible care of resources and creation without reducing faithfulness to wealth.",
    points: [
      { title: "Recognize what is entrusted", exposition: "Genesis presents humans with responsibility within God's good creation.", application: "Consider how time, money, skills, and the natural world are being cared for." },
      { title: "Give freely, not under pressure", exposition: "2 Corinthians 9 commends willing generosity rather than reluctant compulsion.", application: "Make a thoughtful plan to share in ways that are sustainable and transparent." },
      { title: "Use gifts to serve", exposition: "1 Peter 4 calls people to use their gifts for one another.", application: "Offer a skill or resource to meet a concrete community need." },
    ],
  },
  perseverance: {
    bigIdea: "Christian endurance keeps moving toward faithful love with eyes on Jesus and help from community.",
    purpose: "Strengthen weary listeners without shaming them for needing rest, support, or a changed course.",
    points: [
      { title: "Lay aside what hinders", exposition: "Hebrews 12 pictures endurance as a race focused on Jesus.", application: "Identify one burden to share or one unhelpful pattern to release." },
      { title: "Ask for wisdom in trials", exposition: "James 1 connects endurance with wisdom asked from God.", application: "Seek counsel and take the next safe, faithful step rather than forcing certainty." },
      { title: "Do not grow weary in doing good", exposition: "Galatians 6 encourages sustained good while recognizing a season of harvest.", application: "Rest, share the work, and celebrate small acts of faithfulness." },
    ],
  },
  technology: {
    bigIdea: "Technology should be evaluated by truth, wisdom, self-control, and whether its use builds up our neighbors.",
    purpose: "Offer a biblical framework for modern tools without pretending Scripture directly discusses contemporary devices.",
    points: [
      { title: "Attend to what forms the mind", exposition: "Philippians 4 calls the church to attend to what is true, just, and worthy.", application: "Review what receives your attention and how it shapes hope, fear, and habits." },
      { title: "Ask whether it builds people up", exposition: "First Corinthians 10 asks what is beneficial and what serves another's good.", application: "Set boundaries around tools that exploit attention or harm relationships." },
      { title: "Use words to give grace", exposition: "Ephesians 4 and James 3 warn that speech can wound or strengthen a community.", application: "Choose truth, kindness, and accountability in digital conversations." },
    ],
  },
  work: {
    bigIdea: "Work has dignity when it serves life and neighbor, but a person's worth is never measured by productivity.",
    purpose: "Connect work with vocation, justice, rest, and grace while reading ancient labor texts in their historical setting.",
    points: [
      { title: "Receive work without making it an idol", exposition: "Ecclesiastes recognizes both the labor and the gift of enjoying its fruit.", application: "Name what is meaningful in work and where rest or change is needed." },
      { title: "Seek fairness and dignity", exposition: "New Testament household instructions addressed an ancient unequal system and must not be used to excuse exploitation.", application: "Ask whether workers are treated safely, fairly, and with respect." },
      { title: "Let grace shape vocation", exposition: "Ephesians 2 places good works after grace as a way of serving, not earning worth.", application: "Use skills to contribute to the common good and honor limits." },
    ],
  },
  worship: {
    bigIdea: "Worship is praise and attentive response to God that must take shape in justice and everyday life.",
    purpose: "Join gathered worship with ethical living, listening, and care for neighbors.",
    points: [
      { title: "Come with praise and attention", exposition: "Psalm 95 joins joyful praise with listening to God's voice.", application: "Make room for gratitude, silence, and attentive reading in worship." },
      { title: "Offer your whole life", exposition: "Romans 12 describes a life of service shaped by a renewed mind.", application: "Connect Sunday worship with decisions, work, and relationships during the week." },
      { title: "Let worship bear justice", exposition: "Amos challenges religious practice that ignores injustice.", application: "Ask what change in community life would make worship more truthful." },
    ],
  },
  patience: {
    bigIdea: "Patience is Spirit-shaped steadiness and love, not passivity in the face of harm.",
    purpose: "Encourage thoughtful restraint and endurance while preserving boundaries and justice.",
    points: [
      { title: "Let the Spirit form patience", exposition: "Galatians 5 names patience and self-control among the fruit of the Spirit.", application: "Pause before reacting and seek help to change a harmful pattern." },
      { title: "Bear with one another in love", exposition: "Ephesians 4 connects patience with humility and the work of unity.", application: "Practice listening and repair without demanding that harmed people stay unsafe." },
      { title: "Wait with active hope", exposition: "James 5 uses the farmer's patience to picture endurance while awaiting justice.", application: "Keep doing good and seek support through a long season." },
    ],
  },
  doubt: {
    bigIdea: "Honest questions can be brought into relationship with God and a community that makes room for seeking.",
    purpose: "Invite listeners to explore doubt without shame and to attend carefully to what Scripture says.",
    points: [
      { title: "Tell the truth about questions", exposition: "The Psalms preserve confusion and protest as part of faithful prayer.", application: "Let people ask real questions without labeling them faithless." },
      { title: "Bring uncertainty to Jesus", exposition: "In Mark 9 a father brings both belief and doubt while asking Jesus for help.", application: "Pray honestly and seek conversation with patient, trustworthy people." },
      { title: "Keep seeking with the community", exposition: "John 20 tells how Jesus meets Thomas among the disciples after his questions.", application: "Read, discuss, and test claims together rather than demanding instant certainty." },
    ],
  },
  reconciliation: {
    bigIdea: "God's reconciling work calls for truth, accountability, and peace where possible, never coerced contact with an unsafe person.",
    purpose: "Teach repair and peacemaking with clear safeguards against excusing abuse or injustice.",
    points: [
      { title: "Name the breach truthfully", exposition: "Jesus treats damaged relationships as serious and calls disciples to address them.", application: "Acknowledge harm specifically and listen to those affected." },
      { title: "Pursue repair with accountability", exposition: "Paul describes reconciliation as God's work and calls communities into a new way of life.", application: "Where safe, take responsible steps; include mediation or professional help when needed." },
      { title: "Seek peace without enabling harm", exposition: "Romans 12 urges peace as far as it depends on us while rejecting vengeance.", application: "Set boundaries, protect the vulnerable, and do not promise restored trust without evidence." },
    ],
  },
  healing: {
    bigIdea: "God's people pray for healing and care for the sick while remaining honest that cure is not guaranteed in this life.",
    purpose: "Offer comfort and communal care without blaming sick people or discouraging medical treatment.",
    points: [
      { title: "Bring illness and need into community", exposition: "James 5 invites prayer and care for the sick within the community.", application: "Ask what practical, medical, emotional, and spiritual support is wanted." },
      { title: "Notice Christ's compassionate attention", exposition: "The Gospel stories show Jesus meeting suffering people with compassion and dignity.", application: "Center the person's voice and needs rather than making them an illustration." },
      { title: "Trust grace amid unanswered prayer", exposition: "Paul's account in 2 Corinthians 12 holds weakness and sustaining grace together.", application: "Do not promise a cure or blame the sufferer; continue care and prayer." },
    ],
  },
  evangelism: {
    bigIdea: "Christian witness shares hope in Jesus through truthful words, attentive listening, and gentleness.",
    purpose: "Encourage faithful witness that respects the dignity and freedom of the people being addressed.",
    points: [
      { title: "Ground witness in Jesus' way", exposition: "Matthew 28 commissions disciples to teach and make disciples among the nations.", application: "Let teaching and practice reflect Jesus' commands and character." },
      { title: "Speak with gentleness and respect", exposition: "First Peter 3 calls believers to give an account of hope without coercion.", application: "Listen first, answer honestly, and respect a person's freedom to disagree." },
      { title: "Attend to the listener's context", exposition: "Acts 17 shows Paul observing his audience and reasoning from their setting.", application: "Use clear language, build relationships, and avoid manipulation or pressure." },
    ],
  },
};

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
