import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BookHeart,
  BookOpen,
  Check,
  ChevronRight,
  Heart,
  Lightbulb,
  Music2,
  Search,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { useBibleApp } from "@/context/BibleAppContext";

type Story = {
  id: string;
  title: string;
  subtitle: string;
  reference: string;
  book: number;
  chapter: number;
  age: string;
  minutes: number;
  theme: string;
  icon: string;
  colors: string;
  story: string[];
  lesson: string;
  ask: string;
  activity: string;
  prayer: string;
  illustrated?: boolean;
};

const STORIES: Story[] = [
  {
    id: "storm", title: "Jesus Calms the Storm", subtitle: "Peace in the middle of a big, scary storm", reference: "Mark 4:35–41", book: 41, chapter: 4, age: "4–9", minutes: 4, theme: "Courage", icon: "⛵", colors: "from-sky-900 via-blue-800 to-indigo-950",
    story: ["One evening, Jesus and His friends climbed into a boat to cross the lake. Jesus was so tired that He lay down and fell asleep.", "Suddenly, a strong wind rushed over the water. Waves splashed into the boat, and the friends were frightened. They woke Jesus: ‘Teacher, don’t You care if we drown?’", "Jesus stood up and spoke to the wind and waves. ‘Quiet! Be still!’ At once, the wind stopped and the lake became calm. Jesus reminded His friends that they could trust Him, even when they felt afraid."],
    lesson: "When life feels stormy, we can talk to God and remember that we are not alone.", ask: "What is something that makes you feel worried? Who could you talk to about it?", activity: "Draw a wavy sea on one side of a page and a calm sea on the other. Add one thing that helps you feel safe.", prayer: "Dear God, when I feel afraid, help me remember You are with me. Amen.", illustrated: true,
  },
  {
    id: "good-samaritan", title: "A Neighbor Shows Kindness", subtitle: "The Good Samaritan helps a stranger", reference: "Luke 10:25–37", book: 42, chapter: 10, age: "5–10", minutes: 5, theme: "Kindness", icon: "💛", colors: "from-amber-700 via-orange-600 to-rose-700",
    story: ["A traveler was hurt on the road. Some people saw him but kept walking. Then a Samaritan traveler came by. He stopped, cleaned the man's wounds, and helped him onto his own animal.", "The Samaritan took the traveler somewhere safe and made sure he would be cared for. Jesus told this story to teach that a neighbor is anyone who needs our kindness."],
    lesson: "Love becomes real when we notice someone who needs help and choose to care.", ask: "Who might need a kind word or a helping hand today?", activity: "Make a ‘kindness card’ for someone at home, school, or in your community.", prayer: "God, open my eyes to people who need kindness. Help me be a good neighbor. Amen.",
  },
  {
    id: "lost-sheep", title: "The Shepherd Finds One Lost Sheep", subtitle: "You matter and are never forgotten", reference: "Luke 15:3–7", book: 42, chapter: 15, age: "3–8", minutes: 3, theme: "You are loved", icon: "🐑", colors: "from-emerald-700 via-teal-600 to-sky-800",
    story: ["Jesus told about a shepherd with one hundred sheep. When one wandered away, the shepherd went searching until he found it.", "The shepherd was so happy to find the little sheep! He carried it home and invited his friends to celebrate. Jesus said that God's love is like that: each person is precious."],
    lesson: "You are precious to God. You are loved, seen, and worth finding.", ask: "How do you feel when someone comes looking for you?", activity: "Draw one hundred tiny sheep—or count a few cotton balls as a flock! Hide one sheep and take turns finding it.", prayer: "Thank You, God, for knowing me and loving me. Help me remember that everyone matters. Amen.",
  },
  {
    id: "david", title: "David Faces Goliath", subtitle: "A young shepherd trusts God to help", reference: "1 Samuel 17", book: 9, chapter: 17, age: "6–11", minutes: 5, theme: "Bravery", icon: "🪨", colors: "from-lime-700 via-emerald-700 to-teal-900",
    story: ["David was a young shepherd who came to bring food to his brothers. He heard the giant Goliath challenging Israel's army. Everyone was afraid, but David remembered how God had helped him protect his sheep.", "David went to meet Goliath with a sling and five smooth stones. He trusted God, not his size or strength. David's courage reminded everyone that what looks impossible can be faced with faith and help."],
    lesson: "Being brave doesn't mean never feeling scared. It means doing what is right and asking God for help.", ask: "What is one small brave thing you could do this week?", activity: "Find five smooth stones. On each one, say a strength you can use to help someone—like patience, honesty, or courage.", prayer: "God, help me be brave and kind, especially when something feels hard. Amen.",
  },
  {
    id: "creation", title: "A Wonderful World Begins", subtitle: "God creates light, land, plants, and life", reference: "Genesis 1:1–31", book: 1, chapter: 1, age: "3–8", minutes: 4, theme: "Wonder", icon: "🌿", colors: "from-indigo-800 via-violet-700 to-fuchsia-800",
    story: ["The Bible begins with God making a beautiful world. God made light and sky, land and sea, plants and trees. God filled the sky with lights and the water and land with living creatures.", "Last of all, God made people and gave them a special job: to care for the world and one another. God looked at everything and called it very good."],
    lesson: "The world is a gift. We can care for God's creation and treat every person with love.", ask: "What is one part of nature that makes you say ‘wow’?", activity: "Go on a five-senses nature walk. Draw or describe one thing you can see, hear, smell, touch, and thank God for.",
    prayer: "Creator God, thank You for this wonderful world. Help me care for it and everyone in it. Amen.",
  },
  {
    id: "loaves", title: "A Little Lunch Goes a Long Way", subtitle: "Jesus feeds a huge crowd", reference: "John 6:1–14", book: 43, chapter: 6, age: "4–9", minutes: 4, theme: "Generosity", icon: "🍞", colors: "from-orange-700 via-amber-600 to-yellow-700",
    story: ["A huge crowd came to hear Jesus. Everyone was getting hungry, and there was not enough food for so many people. A boy had five small loaves and two fish.", "He shared what he had. Jesus gave thanks, and the food was shared with the crowd. Everyone ate until they were full, and there was even food left over. A small gift, shared with love, became something wonderful."],
    lesson: "You don't have to have a lot to make a difference. Sharing what you have can be a beautiful start.", ask: "What is something you can share besides food?", activity: "Plan a simple way to share this week: your time, a toy, a compliment, or help with a job.", prayer: "Jesus, thank You for caring for people. Show me how to share what I have. Amen.",
  },
  {
    id: "zachaeus", title: "Zacchaeus Climbs a Tree", subtitle: "Jesus sees someone others overlook", reference: "Luke 19:1–10", book: 42, chapter: 19, age: "4–9", minutes: 4, theme: "Belonging", icon: "🌳", colors: "from-green-800 via-emerald-700 to-lime-800",
    story: ["Zacchaeus was short, and a crowd blocked his view of Jesus. He hurried ahead and climbed a tree. When Jesus reached the spot, He looked up and called Zacchaeus by name.", "Jesus chose to visit Zacchaeus, even though people complained. Being welcomed changed Zacchaeus. He decided to make things right and share with people in need."],
    lesson: "Jesus notices people others may ignore. Being welcomed can help us choose a better path.", ask: "How can you help someone feel included?", activity: "Invite someone new to join a game, sit with you, or share a story.", prayer: "Jesus, thank You for seeing me. Help me notice and welcome others. Amen.",
  },
  {
    id: "jonah", title: "Jonah Learns to Listen", subtitle: "A second chance in a surprising place", reference: "Jonah 1–3", book: 32, chapter: 1, age: "5–10", minutes: 5, theme: "Second chances", icon: "🐋", colors: "from-cyan-800 via-blue-700 to-indigo-900",
    story: ["God asked Jonah to go to Nineveh and share an important message. Jonah ran the other way and boarded a ship. A great storm came, and Jonah was thrown into the sea. God sent a great fish to keep Jonah safe.", "Inside the fish, Jonah prayed. After three days, he was brought safely to land. Jonah went to Nineveh and shared God's message. The people listened and changed their ways. God gave them another chance."],
    lesson: "We can talk to God honestly, listen again, and make a fresh start.", ask: "When have you needed a second chance? How did it feel?", activity: "Make a ‘fresh start’ bookmark. Write one kind choice you want to try tomorrow.",
    prayer: "God, thank You for listening when I pray and helping me begin again. Amen.",
  },
];

const readStoriesFromStorage = (): string[] => {
  try { return JSON.parse(localStorage.getItem("selah_kids_read_v1") || "[]") as string[]; } catch { return []; }
};

export const KidsStoriesView: React.FC = () => {
  const { navigateTo, setActiveSection } = useBibleApp();
  const [selectedId, setSelectedId] = useState("storm");
  const [query, setQuery] = useState("");
  const [readStories, setReadStories] = useState<string[]>(readStoriesFromStorage);
  const selectedStory = STORIES.find((story) => story.id === selectedId) || STORIES[0];
  const filteredStories = useMemo(() => {
    const value = query.trim().toLowerCase();
    return STORIES.filter((story) => !value || `${story.title} ${story.subtitle} ${story.theme} ${story.reference}`.toLowerCase().includes(value));
  }, [query]);

  const toggleRead = (id: string) => {
    setReadStories((previous) => {
      const next = previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id];
      localStorage.setItem("selah_kids_read_v1", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="kids-page mx-auto max-w-6xl space-y-8 px-4 pb-32 pt-7 sm:px-8 sm:pt-10">
      <section className="kids-intro overflow-hidden rounded-[2rem] border border-amber-200/60 bg-[#fffaf1] shadow-[0_24px_70px_-36px_rgba(77,45,12,.35)] dark:border-white/10 dark:bg-[#191b24]">
        <div className="grid lg:grid-cols-[1.02fr_.98fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-amber-900 dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> A little light for little hearts
            </div>
            <h1 className="max-w-xl font-display text-4xl font-semibold leading-[1.06] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl">
              Big stories. <span className="text-amber-700 dark:text-amber-300">Gentle beginnings.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
              Meet brave, kind, and surprising people from the Bible. Every story is retold in child-friendly words, with a big idea, a question to share, and a little activity.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#story-time" className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/15 transition hover:-translate-y-0.5 dark:bg-amber-200 dark:text-stone-900">
                <BookOpen className="h-4 w-4" /> Start story time <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{STORIES.length} stories · made to read together</span>
            </div>
            <p className="mt-6 max-w-lg text-[11px] leading-5 text-stone-500 dark:text-stone-400">A parent or caregiver can read aloud, explore the Bible reference together, and adapt each story for the child’s age. These are simplified retellings, not a replacement for the Bible text.</p>
          </div>
          <div className="relative min-h-[260px] overflow-hidden bg-slate-950 sm:min-h-[360px] lg:min-h-[470px]">
            <img src="/kids-story-hero.webp" alt="Jesus and friends sharing a peaceful moment in a boat on the lake" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/10" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4 text-white sm:bottom-8 sm:left-8 sm:right-8">
              <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-200">Story of the day</div><div className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Peace, be still.</div><div className="mt-1 text-xs text-white/75">Mark 4 · A story about courage</div></div>
              <div className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur"><BookHeart className="h-5 w-5" /></div>
            </div>
          </div>
        </div>
      </section>

      <section id="story-time" className="grid gap-7 lg:grid-cols-[.85fr_1.15fr]">
        <aside className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Choose a story</p><h2 className="mt-1 font-display text-2xl font-semibold">The story shelf</h2></div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{readStories.length}/{STORIES.length} read</span>
          </div>
          <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a story or big idea" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </label>
          <div className="space-y-2">
            {filteredStories.map((story, index) => (
              <button key={story.id} type="button" onClick={() => setSelectedId(story.id)} className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedId === story.id ? "border-primary/40 bg-primary/8 shadow-sm" : "border-border/70 bg-card/70 hover:border-primary/25 hover:bg-card"}`}>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br ${story.colors} text-2xl shadow-inner shadow-white/10`}>{story.icon}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{story.title}</span><span className="mt-1 block text-xs text-muted-foreground">{story.theme} · {story.minutes} min · Ages {story.age}</span></span>
                {readStories.includes(story.id) ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" /></span> : <ChevronRight className={`h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 ${selectedId === story.id ? "text-primary" : ""}`} />}
                <span className="sr-only">Story {index + 1}</span>
              </button>
            ))}
            {filteredStories.length === 0 && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No story matches that search yet.</p>}
          </div>
          <div className="rounded-2xl border border-violet-200/70 bg-violet-50/80 p-4 text-violet-950 dark:border-violet-200/10 dark:bg-violet-300/5 dark:text-violet-100">
            <div className="flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-violet-600 dark:text-violet-300" /> Grown-up note</div>
            <p className="mt-2 text-xs leading-5 text-violet-900/75 dark:text-violet-100/75">Stories are adapted for young listeners. Read the linked passage for the full account, and feel free to pause, ask questions, and follow your child’s curiosity.</p>
          </div>
        </aside>

        <article className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_24px_70px_-48px_rgba(15,23,42,.4)]">
          <div className={`relative overflow-hidden bg-gradient-to-br ${selectedStory.colors} px-6 py-7 text-white sm:px-9 sm:py-9`}>
            {selectedStory.illustrated && <img src="/kids-story-hero.webp" alt="A calm lake and boat from the story" className="absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-screen" />}
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
            <div className="relative max-w-xl">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-white/75"><Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> {selectedStory.theme} · {selectedStory.minutes} minute read</div>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{selectedStory.title}</h2>
              <p className="mt-2 text-sm text-white/80">{selectedStory.subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">{selectedStory.reference}</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">Ages {selectedStory.age}</span></div>
            </div>
          </div>
          <div className="space-y-7 p-6 sm:p-9">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><BookHeart className="h-4 w-4" /> The story</div>
              <div className="space-y-4 font-scripture text-[17px] leading-8 text-foreground/90 sm:text-lg sm:leading-9">{selectedStory.story.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 dark:border-amber-100/10 dark:bg-amber-200/5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200"><Lightbulb className="h-4 w-4" /> The big idea</div><p className="mt-2 text-sm leading-6 text-amber-950/80 dark:text-amber-100/80">{selectedStory.lesson}</p></div>
              <div className="rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4 dark:border-sky-100/10 dark:bg-sky-200/5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-200"><Heart className="h-4 w-4" /> Talk about it</div><p className="mt-2 text-sm leading-6 text-sky-950/80 dark:text-sky-100/80">{selectedStory.ask}</p></div>
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 dark:border-emerald-100/10 dark:bg-emerald-200/5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200"><WandSparkles className="h-4 w-4" /> Try it together</div><p className="mt-2 text-sm leading-6 text-emerald-950/80 dark:text-emerald-100/80">{selectedStory.activity}</p></div>
              <div className="rounded-2xl border border-violet-200/70 bg-violet-50/80 p-4 dark:border-violet-100/10 dark:bg-violet-200/5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-900 dark:text-violet-200"><Music2 className="h-4 w-4" /> A little prayer</div><p className="mt-2 text-sm leading-6 text-violet-950/80 dark:text-violet-100/80">{selectedStory.prayer}</p></div>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-border pt-5">
              <button type="button" onClick={() => { navigateTo(selectedStory.book, selectedStory.chapter); setActiveSection("reader"); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"><BookOpen className="h-4 w-4" /> Read {selectedStory.reference} in the Bible</button>
              <button type="button" onClick={() => toggleRead(selectedStory.id)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${readStories.includes(selectedStory.id) ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-background hover:bg-accent"}`}><Check className="h-4 w-4" /> {readStories.includes(selectedStory.id) ? "Read together" : "We read this together"}</button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};
