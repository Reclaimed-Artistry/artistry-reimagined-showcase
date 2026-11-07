import { CANONICAL_BOOKS, getBookMeta } from "./canonicalBooks";
import type {
  ReadingPassageRange,
  ReadingPlanDay,
  ReadingPlanDefinition,
} from "@/types/bible";

/**
 * Evenly distributes all chapters from `bookNumbers` across `totalDays` days,
 * compressing consecutive chapters within the same book into clean `ReadingPassageRange`s.
 */
export function distributeBooksAcrossDays(
  bookNumbers: number[],
  totalDays: number,
  promptGenerator?: (day: number, passages: ReadingPassageRange[]) => { title: string; prompt: string }
): ReadingPlanDay[] {
  const chaptersFlat: { bookNumber: number; chapter: number }[] = [];
  for (const bNum of bookNumbers) {
    const meta = getBookMeta(bNum);
    for (let ch = 1; ch <= meta.chapters; ch++) {
      chaptersFlat.push({ bookNumber: bNum, chapter: ch });
    }
  }

  const safeDays = Math.max(1, Math.min(totalDays, chaptersFlat.length));
  const days: ReadingPlanDay[] = [];

  for (let d = 0; d < safeDays; d++) {
    const startIdx = Math.floor((d * chaptersFlat.length) / safeDays);
    const endIdx = Math.floor(((d + 1) * chaptersFlat.length) / safeDays);
    const slice = chaptersFlat.slice(startIdx, Math.max(startIdx + 1, endIdx));

    // Compress consecutive chapters per book
    const passages: ReadingPassageRange[] = [];
    for (const item of slice) {
      const last = passages[passages.length - 1];
      if (last && last.bookNumber === item.bookNumber && item.chapter === last.endChapter + 1) {
        last.endChapter = item.chapter;
      } else {
        passages.push({
          bookNumber: item.bookNumber,
          startChapter: item.chapter,
          endChapter: item.chapter,
        });
      }
    }

    const labelParts = passages.map((p) => {
      const b = getBookMeta(p.bookNumber);
      return p.startChapter === p.endChapter
        ? `${b.shortName} ${p.startChapter}`
        : `${b.shortName} ${p.startChapter}–${p.endChapter}`;
    });

    const customMeta = promptGenerator ? promptGenerator(d + 1, passages) : undefined;
    days.push({
      day: d + 1,
      title: customMeta?.title || labelParts.join(" • "),
      reflectionPrompt:
        customMeta?.prompt ||
        "What does today's reading reveal about God's character, and what one truth will you carry into your conversations today?",
      passages,
    });
  }

  return days;
}

function createWholeBible365Plan(): ReadingPlanDefinition {
  // Pair Old Testament progression (books 1..39 excluding Psalms) with New Testament + Psalms!
  const otNarrativeAndProphets = CANONICAL_BOOKS.filter(
    (b) => b.testament === "OT" && b.bookNumber !== 19
  ).map((b) => b.bookNumber);
  const ntAndPsalms = [
    ...CANONICAL_BOOKS.filter((b) => b.testament === "NT").map((b) => b.bookNumber),
    19, // Psalms
  ];

  const otDays = distributeBooksAcrossDays(otNarrativeAndProphets, 365);
  const ntDays = distributeBooksAcrossDays(ntAndPsalms, 365);

  const days: ReadingPlanDay[] = otDays.map((otDay, idx) => {
    const ntDay = ntDays[idx];
    const combined = [...otDay.passages, ...(ntDay ? ntDay.passages : [])];
    return {
      day: idx + 1,
      title: `${otDay.title}${ntDay ? ` + ${ntDay.title}` : ""}`,
      reflectionPrompt:
        "Notice how the Old Testament story and New Testament / Psalms reading illuminate one unified redemptive promise.",
      passages: combined,
    };
  });

  return {
    id: "whole-bible-365",
    title: "The Whole Bible in a Year",
    subtitle: "Old Testament + New Testament & Psalms daily rhythm",
    category: "Whole Bible",
    durationDays: 365,
    estimatedMinutesPerDay: 15,
    accentColor: "#B4651D",
    description:
      "Read every chapter from Genesis to Revelation in 365 days by pairing daily Old Testament chapters with New Testament and Psalms.",
    days,
  };
}

function createPsalmsProverbs31Plan(): ReadingPlanDefinition {
  const days: ReadingPlanDay[] = [];
  for (let d = 1; d <= 31; d++) {
    const passages: ReadingPassageRange[] = [];
    if (d <= 30) {
      const startPs = (d - 1) * 5 + 1;
      passages.push({ bookNumber: 19, startChapter: startPs, endChapter: startPs + 4 });
    } else {
      // Day 31: Psalm 119 meditation + Proverbs 31
      passages.push({ bookNumber: 19, startChapter: 119, endChapter: 119 });
    }
    passages.push({ bookNumber: 20, startChapter: d, endChapter: d });

    days.push({
      day: d,
      title: d <= 30 ? `Psalms ${(d - 1) * 5 + 1}–${d * 5} • Proverbs ${d}` : `Psalm 119 • Proverbs 31`,
      reflectionPrompt:
        "Choose one prayer line from today's Psalms to pray aloud and one proverb to practice in a concrete relationship today.",
      passages,
    });
  }

  return {
    id: "psalms-proverbs-31",
    title: "31 Days of Wisdom & Worship",
    subtitle: "Five Psalms & one Proverb every day for a month",
    category: "Wisdom",
    durationDays: 31,
    estimatedMinutesPerDay: 12,
    accentColor: "#3F6212",
    description:
      "Immerse your heart in the entire book of Psalms and all 31 chapters of Proverbs in a single life-giving month.",
    days,
  };
}

export const BUILTIN_READING_PLANS: ReadingPlanDefinition[] = [
  {
    id: "gospels-30",
    title: "Walk With Jesus: The Four Gospels",
    subtitle: "30-day journey through Matthew, Mark, Luke & John",
    category: "Gospels",
    durationDays: 30,
    estimatedMinutesPerDay: 10,
    accentColor: "#991B1B",
    description:
      "Walk closely beside Jesus for 30 days—hearing His parables, witnessing His compassion, standing at the cross, and meeting the risen Lord.",
    days: distributeBooksAcrossDays([40, 41, 42, 43], 30, (day) => ({
      title: `Day ${day} • Walking With Jesus`,
      prompt:
        "How did Jesus treat the people He encountered in today's chapters, and what invitation is He extending to you?",
    })),
  },
  {
    id: "peace-anxious-heart-7",
    title: "Peace for an Anxious Heart",
    subtitle: "7 days of stillness, courage, and unshakeable rest",
    category: "Topical",
    durationDays: 7,
    estimatedMinutesPerDay: 7,
    accentColor: "#0F766E",
    description:
      "Seven restorative days through Scripture's most comforting chapters on trading worry for God's steady presence.",
    days: [
      {
        day: 1,
        title: "The Shepherd Who Leads Beside Still Waters",
        reflectionPrompt: "Where do you feel hurried right now, and what would it look like to let the Good Shepherd set your pace today?",
        passages: [
          { bookNumber: 19, startChapter: 23, endChapter: 23 },
          { bookNumber: 43, startChapter: 10, endChapter: 10 },
        ],
      },
      {
        day: 2,
        title: "God Our Refuge When Mountains Shake",
        reflectionPrompt: "What fear feels loudest today? Practice whispering 'Be still, and know that I am God' over it.",
        passages: [
          { bookNumber: 19, startChapter: 46, endChapter: 46 },
          { bookNumber: 19, startChapter: 91, endChapter: 91 },
        ],
      },
      {
        day: 3,
        title: "Consider the Birds and Lilies",
        reflectionPrompt: "Notice how Jesus invites you out of tomorrow's imaginary burdens back into today's grace.",
        passages: [{ bookNumber: 40, startChapter: 6, endChapter: 6 }],
      },
      {
        day: 4,
        title: "Renewed Strength for Weary Wings",
        reflectionPrompt: "In what area of life have your own reserves run dry? Ask the Creator who never faints to carry you.",
        passages: [{ bookNumber: 23, startChapter: 40, endChapter: 40 }],
      },
      {
        day: 5,
        title: "Let Not Your Heart Be Troubled",
        reflectionPrompt: "How is Christ's peace different from the fragile peace the world offers?",
        passages: [{ bookNumber: 43, startChapter: 14, endChapter: 14 }],
      },
      {
        day: 6,
        title: "Guarded by Peace Beyond Understanding",
        reflectionPrompt: "Turn your top three worries today into three specific prayers laced with gratitude.",
        passages: [{ bookNumber: 50, startChapter: 4, endChapter: 4 }],
      },
      {
        day: 7,
        title: "Nothing Can Separate Us",
        reflectionPrompt: "Read the closing verses aloud. What changes when you know your future is held by invincible love?",
        passages: [{ bookNumber: 45, startChapter: 8, endChapter: 8 }],
      },
    ],
  },
  {
    id: "foundations-14",
    title: "The Story of Scripture: 14-Day Foundations",
    subtitle: "From Creation to New Creation in two clear weeks",
    category: "Topical",
    durationDays: 14,
    estimatedMinutesPerDay: 9,
    accentColor: "#7C3AED",
    description:
      "Ideal for both newcomers and longtime readers wanting to see how the entire Bible fits together as one breathtaking story.",
    days: [
      {
        day: 1,
        title: "Creation & Image-Bearers",
        reflectionPrompt: "What does it mean that human beings were made intentionally in God's image and declared 'very good'?",
        passages: [{ bookNumber: 1, startChapter: 1, endChapter: 2 }],
      },
      {
        day: 2,
        title: "The Fracture & First Promise",
        reflectionPrompt: "Even in humanity's hiding, notice God comes walking and calling, 'Where are you?'",
        passages: [{ bookNumber: 1, startChapter: 3, endChapter: 3 }],
      },
      {
        day: 3,
        title: "Abraham's Call to Bless All Nations",
        reflectionPrompt: "God's rescue plan begins with a promise to bless every family on earth.",
        passages: [
          { bookNumber: 1, startChapter: 12, endChapter: 12 },
          { bookNumber: 1, startChapter: 15, endChapter: 15 },
        ],
      },
      {
        day: 4,
        title: "Passover & Red Sea Deliverance",
        reflectionPrompt: "How does Israel's rescue from slavery foreshadow spiritual freedom in Christ?",
        passages: [{ bookNumber: 2, startChapter: 12, endChapter: 14 }],
      },
      {
        day: 5,
        title: "David's Shepherd Heart & Eternal Promise",
        reflectionPrompt: "Reflect on God's surprising grace in promising an everlasting kingdom.",
        passages: [
          { bookNumber: 10, startChapter: 7, endChapter: 7 },
          { bookNumber: 19, startChapter: 51, endChapter: 51 },
        ],
      },
      {
        day: 6,
        title: "The Promised Suffering Servant",
        reflectionPrompt: "Written seven centuries before Bethlehem—pause over every line of Isaiah 53.",
        passages: [{ bookNumber: 23, startChapter: 52, endChapter: 53 }],
      },
      {
        day: 7,
        title: "A New Heart & New Spirit",
        reflectionPrompt: "God promises transformation from the inside out rather than mere external rules.",
        passages: [{ bookNumber: 26, startChapter: 36, endChapter: 37 }],
      },
      {
        day: 8,
        title: "The Word Became Flesh",
        reflectionPrompt: "Eternity stepped into our neighborhood full of grace and truth.",
        passages: [{ bookNumber: 43, startChapter: 1, endChapter: 1 }],
      },
      {
        day: 9,
        title: "Kingdom Upside-Down: Sermon on the Mount",
        reflectionPrompt: "Which Beatitude challenges modern assumptions about success the most?",
        passages: [{ bookNumber: 40, startChapter: 5, endChapter: 5 }],
      },
      {
        day: 10,
        title: "The Father Running Toward Prodigals",
        reflectionPrompt: "Do you identify more today with the younger wanderer or the exhausted older brother?",
        passages: [{ bookNumber: 42, startChapter: 15, endChapter: 15 }],
      },
      {
        day: 11,
        title: "Crucifixion & Empty Tomb",
        reflectionPrompt: "Why is the resurrection the hinge on which Christian hope turns?",
        passages: [{ bookNumber: 42, startChapter: 23, endChapter: 24 }],
      },
      {
        day: 12,
        title: "Pentecost & the Birth of the Church",
        reflectionPrompt: "Notice how the Spirit empowers ordinary people across every language.",
        passages: [{ bookNumber: 44, startChapter: 2, endChapter: 2 }],
      },
      {
        day: 13,
        title: "Saved by Grace, Alive in the Spirit",
        reflectionPrompt: "You are God's workmanship—loved before performing.",
        passages: [{ bookNumber: 49, startChapter: 2, endChapter: 2 }],
      },
      {
        day: 14,
        title: "Behold, I Make All Things New",
        reflectionPrompt: "Scripture ends not in escape from creation, but in heaven and earth healed and reunited.",
        passages: [{ bookNumber: 66, startChapter: 21, endChapter: 22 }],
      },
    ],
  },
  createPsalmsProverbs31Plan(),
  {
    id: "pauls-letters-21",
    title: "Grace & Courage: Paul's Letters",
    subtitle: "21 days through Romans, Ephesians, Philippians & Colossians",
    category: "Epistles",
    durationDays: 21,
    estimatedMinutesPerDay: 9,
    accentColor: "#1D4ED8",
    description:
      "Deepen your grasp of gospel grace, Christian joy, and spiritual resilience across Paul's most beloved letters.",
    days: distributeBooksAcrossDays([45, 48, 49, 50, 51], 21),
  },
  {
    id: "new-testament-90",
    title: "New Testament in 90 Days",
    subtitle: "All 260 chapters from Matthew to Revelation (~3 chapters/day)",
    category: "New Testament",
    durationDays: 90,
    estimatedMinutesPerDay: 12,
    accentColor: "#C2410C",
    description:
      "Read the entire New Testament from cover to cover in one season—three chapters a day at an unhurried, absorbing pace.",
    days: distributeBooksAcrossDays(
      CANONICAL_BOOKS.filter((b) => b.testament === "NT").map((b) => b.bookNumber),
      90
    ),
  },
  createWholeBible365Plan(),
];

export function buildCustomReadingPlan(params: {
  title: string;
  bookNumbers: number[];
  durationDays: number;
}): ReadingPlanDefinition {
  const sortedBooks = [...new Set(params.bookNumbers)].sort((a, b) => a - b);
  const days = distributeBooksAcrossDays(sortedBooks, params.durationDays);
  const bookNames = sortedBooks.slice(0, 4).map((n) => getBookMeta(n).shortName);
  const subtitle =
    sortedBooks.length > 4
      ? `${bookNames.join(", ")} + ${sortedBooks.length - 4} more`
      : bookNames.join(", ");

  return {
    id: `custom-${Date.now()}`,
    title: params.title.trim() || "My Custom Reading Plan",
    subtitle: `${days.length} days • ${subtitle}`,
    category: "Custom",
    durationDays: days.length,
    estimatedMinutesPerDay: Math.max(5, Math.round((sortedBooks.reduce((s, n) => s + getBookMeta(n).chapters, 0) / days.length) * 3.5)),
    accentColor: "#8B5CF6",
    description: `Personalized ${days.length}-day reading schedule across ${sortedBooks.length} selected Bible book${sortedBooks.length === 1 ? "" : "s"}.`,
    days,
    isCustom: true,
  };
}

export function formatPassageRangeLabel(range: ReadingPassageRange): string {
  const book = getBookMeta(range.bookNumber);
  return range.startChapter === range.endChapter
    ? `${book.name} ${range.startChapter}`
    : `${book.name} ${range.startChapter}–${range.endChapter}`;
}
