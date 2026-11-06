import type { AudienceId } from '@/learning/types';

export interface Audience {
  id: AudienceId;
  label: string;
  shortLabel: string;
  description: string;
  recommendedPath: string;
  recommendation: string;
}

export const audiences: Audience[] = [
  {
    id: 'beginner',
    label: 'I’m a complete beginner',
    shortLabel: 'Complete beginner',
    description: 'Start with the essentials.',
    recommendedPath: 'digital-workplace',
    recommendation: 'Begin with the tools used in almost any role: files, collaboration, and clear communication.',
  },
  {
    id: 'student',
    label: 'I’m a student or job seeker',
    shortLabel: 'Student / job seeker',
    description: 'Build skills and projects to show.',
    recommendedPath: 'spreadsheets-data',
    recommendation: 'Turn information into useful answers and leave with a project you can explain.',
  },
  {
    id: 'professional',
    label: 'I’m already working',
    shortLabel: 'Working professional',
    description: 'Work smarter and grow.',
    recommendedPath: 'spreadsheets-data',
    recommendation: 'Build on your experience. Organise data, answer business questions, and communicate findings clearly.',
  },
];

export interface Lesson {
  slug: string;
  title: string;
  minutes: number;
  intro: string;
  sections: { title: string; body: string; bullets?: string[] }[];
  example: { title: string; body: string };
  practice: string;
  quiz: { question: string; options: string[]; answer: number; explanation: string };
}

export interface LearningPath {
  slug: string;
  title: string;
  category: string;
  description: string;
  level: 'Beginner' | 'Building confidence';
  color: 'green' | 'blue' | 'orange' | 'purple';
  icon: 'workplace' | 'data' | 'design' | 'web';
  audiences: AudienceId[];
  skills: string[];
  outcomes: string[];
  projectTitle: string;
  projectSummary: string;
  projectSteps: string[];
  deliverables: string[];
  rubric: string[];
  lessons: Lesson[];
}

export const paths: LearningPath[] = [
  {
    slug: 'digital-workplace',
    title: 'Digital Workplace Essentials',
    category: 'Work essentials',
    description: 'Build the everyday digital habits that help you feel capable, organised, and ready to collaborate.',
    level: 'Beginner',
    color: 'green',
    icon: 'workplace',
    audiences: ['beginner', 'student', 'professional'],
    skills: ['File organisation', 'Collaboration', 'Digital safety'],
    outcomes: [
      'Create a folder structure other people can understand.',
      'Share documents with appropriate permissions.',
      'Write clear messages and recognise common online risks.',
    ],
    projectTitle: 'Set up a digital workspace',
    projectSummary: 'Imagine you’re helping a small team organise its files. Create a folder plan, a naming convention, and a short handover message.',
    projectSteps: [
      'Create a main folder called Community Workshop, with subfolders for Planning, Materials, and Delivery.',
      'Create three harmless sample documents and name them consistently. Include a project, document type, and version.',
      'Write a short sharing policy: who needs view access, who needs edit access, and how access should be removed.',
      'Draft a handover email explaining where things are, what changed, and what the recipient should do next.',
    ],
    deliverables: ['A screenshot or diagram of your folder structure', 'A naming convention with three examples', 'A sharing checklist and handover email'],
    rubric: [
      'My folders and filenames are clear and consistent.',
      'My sharing policy gives people only the access they need.',
      'My handover message includes a clear next action.',
      'I checked that no personal or confidential information is included.',
    ],
    lessons: [
      {
        slug: 'organise-your-files', title: 'Make files easy to find', minutes: 10,
        intro: 'A useful digital workspace is not about having the most folders. It is about making information easy to find, understand, and hand over.',
        sections: [
          { title: 'Start with the way work happens', body: 'Group files by project or purpose rather than by the application that created them. Keep the structure shallow enough that a new teammate can navigate it.', bullets: ['Use a small number of clearly named top-level folders.', 'Separate working documents from final deliverables.', 'Archive completed work instead of letting it crowd active projects.'] },
          { title: 'Make names carry meaning', body: 'A filename should still make sense outside its folder. Include the project, document purpose, and a version or date where useful. Use YYYY-MM-DD for dates that need to sort chronologically.', bullets: ['Prefer workshop-budget-v02.xlsx to final-final-new.xlsx.', 'Agree on one version convention with your team.', 'Keep an original copy before making substantial changes.'] },
        ],
        example: { title: 'A small structure goes a long way', body: 'Community Workshop / Planning / workshop-plan-v01.docx\nCommunity Workshop / Materials / participant-handout-v02.pdf\nCommunity Workshop / Delivery / final-feedback-summary.pdf' },
        practice: 'Look at five files on your device. Rename copies—not important originals—so that someone else could understand each file without opening it.',
        quiz: { question: 'Which filename is easiest to understand and maintain?', options: ['document-final-FINAL2.docx', 'workshop-budget-v03.xlsx', 'Untitled spreadsheet.xlsx'], answer: 1, explanation: 'It identifies the project, the document’s purpose, and a clear version. The other names depend on context or become confusing over time.' },
      },
      {
        slug: 'collaborate-with-confidence', title: 'Collaborate without the confusion', minutes: 12,
        intro: 'Good collaboration is more than sending a link. People need the right access, a shared understanding of the latest version, and a clear way to give feedback.',
        sections: [
          { title: 'Give the right level of access', body: 'Start with the least access someone needs. A reviewer usually needs to view or comment, not edit. Check sharing settings before sending a link, and remove access when a project ends.', bullets: ['Avoid public links for private documents.', 'Use named access where possible.', 'Check permissions from the recipient’s point of view.'] },
          { title: 'Keep feedback in one place', body: 'Use comments or a shared feedback document rather than scattered messages. Assign an owner and a due date to each requested change. Version history can help recover mistakes, but it is not a replacement for backups.', bullets: ['Say what needs changing and why.', 'Resolve comments only after checking the change.', 'Keep important backups according to your organisation’s policy.'] },
        ],
        example: { title: 'A clearer review request', body: 'Please review the agenda in Planning/workshop-agenda-v02.docx by Thursday at 15:00. Focus on session timings. Add comments rather than editing directly; I’ll incorporate the agreed changes in v03.' },
        practice: 'Write a two-sentence review request for a sample document. Include the document location, the feedback you need, and a deadline.',
        quiz: { question: 'A client only needs to read a proposal. What is the best default?', options: ['A public link with edit access', 'View access for the intended recipient', 'Send them your account password'], answer: 1, explanation: 'View access supports the task without allowing unnecessary changes. Passwords should never be shared, and private work should not be publicly accessible.' },
      },
      {
        slug: 'communicate-and-stay-safe', title: 'Communicate clearly. Stay safe online.', minutes: 12,
        intro: 'Clear communication and sensible security habits make you easier to work with—and reduce avoidable problems for the whole team.',
        sections: [
          { title: 'Make the next action obvious', body: 'Use a specific subject, put the main point first, and explain who needs to do what by when. Keep the message short enough to scan. A polite tone and concrete context are more useful than a long introduction.', bullets: ['Subject: Workshop agenda—feedback needed by Thursday.', 'Context: one sentence on why the message matters.', 'Action: one clear request, owner, and deadline.'] },
          { title: 'Pause before you trust a message', body: 'Urgent requests for money, passwords, or sign-in details deserve extra checking. Verify a suspicious request through a known, separate channel. Use unique passwords, a password manager where available, and multi-factor authentication.', bullets: ['Check the actual sender address and link destination.', 'Do not approve an unexpected sign-in prompt.', 'Follow your organisation’s reporting process for suspicious messages.'] },
        ],
        example: { title: 'Verify through a channel you already trust', body: 'An email asks you to change a supplier’s bank details. Contact the supplier using the number already in your records—not the number in the email—and follow your organisation’s approval process.' },
        practice: 'Draft a short work request with a specific subject and deadline. Then list two things you would check before acting on an unexpected payment email.',
        quiz: { question: 'An unexpected email asks for your password. What should you do?', options: ['Reply if the email uses your company logo', 'Send the password if the request seems urgent', 'Verify through a trusted channel and report it'], answer: 2, explanation: 'Logos and urgency can be copied or manufactured. Verify independently and follow your organisation’s security process instead of sharing credentials.' },
      },
    ],
  },
  {
    slug: 'spreadsheets-data', title: 'Spreadsheets & Data Fundamentals', category: 'Data & spreadsheets',
    description: 'Turn messy information into clear answers using practical spreadsheet skills that travel across industries.',
    level: 'Building confidence', color: 'blue', icon: 'data', audiences: ['beginner', 'student', 'professional'],
    skills: ['Data cleaning', 'Formulas', 'Charts & storytelling'],
    outcomes: ['Prepare a dataset without losing the original information.', 'Use formulas to answer a business question.', 'Create a chart and explain what the numbers do—and do not—show.'],
    projectTitle: 'Make sense of a small business’s sales',
    projectSummary: 'Use the supplied practice dataset to create a clean sales table, a regional revenue summary, and a short recommendation.',
    projectSteps: [
      'Download the practice CSV and open it in your spreadsheet application. Keep the original file unchanged.',
      'Inspect the duplicate order and missing region. Document your decisions; do not guess a missing region.',
      'Create a Revenue column using Quantity × Unit price. Check your numeric columns and remove the repeated order from the analysis copy.',
      'Summarise revenue by region, label any unknown region clearly, and create one appropriate chart.',
      'Write a short summary: your main finding, one limitation, and a sensible next step.',
    ],
    deliverables: ['Your cleaned spreadsheet with formulas', 'One clearly labelled chart', 'A 100–150 word explanation of your findings and limitations'],
    rubric: ['I preserved the original data and documented cleaning decisions.', 'My totals are reproducible and exclude the duplicate order.', 'My chart has a clear title, appropriate labels, and an honest scale.', 'My explanation distinguishes evidence from assumptions.'],
    lessons: [
      {
        slug: 'prepare-your-data', title: 'Start with data you can trust', minutes: 12,
        intro: 'A polished chart cannot fix unreliable inputs. Before calculating anything, understand what each row and column represents.',
        sections: [
          { title: 'Inspect before changing', body: 'Keep an untouched original and work on a copy. Check column meanings, data types, missing values, and repeated records. A repeated value is not automatically an error: two customers can legitimately have the same name.', bullets: ['Identify what one row represents.', 'Check whether identifiers should be unique.', 'Record cleaning decisions so someone else can follow them.'] },
          { title: 'Do not invent missing information', body: 'Missing values need a deliberate decision. Sometimes you can verify them from a reliable source. Otherwise, label them as unknown or exclude them from a specific calculation and explain the effect.', bullets: ['Keep dates and numbers in consistent formats.', 'Do not silently replace missing values with zero.', 'Check totals before and after cleaning.'] },
        ],
        example: { title: 'A useful cleaning note', body: 'Order 1004 appeared twice with identical values, so I kept one copy in the analysis. Order 1008 has no region; its revenue is included under “Unknown” rather than assigned to a guessed region.' },
        practice: 'Open the project dataset. Write down what one row represents, one duplicate you find, and one value you should not guess.',
        quiz: { question: 'A sales record has no region. What is the safest approach?', options: ['Assign the most common region', 'Label it Unknown or verify it from a reliable source', 'Delete the entire dataset'], answer: 1, explanation: 'Guessing creates false information. Preserve transparency by verifying the value or explicitly showing that it is unknown.' },
      },
      {
        slug: 'ask-formulas-a-question', title: 'Let formulas answer a question', minutes: 15,
        intro: 'The best formula starts with a plain-language question. Decide what you want to know before choosing a function.',
        sections: [
          { title: 'Build from a clear calculation', body: 'If each row has quantity in column C and unit price in column D, row revenue can be calculated as =C2*D2. Copy the formula down, then inspect a few rows manually to confirm the references are correct.', bullets: ['Use a helper column when it makes the logic easier to check.', 'Use SUM to add a range of numbers.', 'Use SUMIFS to total values that meet one or more conditions.'] },
          { title: 'Check the answer, not just the syntax', body: 'A formula can run without an error and still answer the wrong question. Check ranges, criteria, and whether your data has been cleaned. IFERROR can make a sheet tidy, but it can also hide mistakes if used without investigation.', bullets: ['Test a small example by hand.', 'Make sure summary ranges include every relevant row.', 'Explain assumptions alongside important outputs.'] },
        ],
        example: { title: 'Revenue for one region', body: 'If region labels are in F2:F13 and revenue is in E2:E13:\n=SUMIFS(E2:E13, F2:F13, "North")\nAdjust the ranges to match your cleaned table.' },
        practice: 'Calculate revenue for each order, then total revenue for one region. Check the result by adding that region’s rows manually.',
        quiz: { question: 'Which function is designed to total revenue only for the North region?', options: ['SUMIFS', 'COUNT', 'LEN'], answer: 0, explanation: 'SUMIFS adds values that meet specified conditions. COUNT counts numeric entries, and LEN measures text length.' },
      },
      {
        slug: 'tell-a-story-with-data', title: 'Make the finding clear', minutes: 12,
        intro: 'A useful chart helps someone understand a specific finding. Your explanation should make the takeaway clear without overstating the evidence.',
        sections: [
          { title: 'Choose the chart for the question', body: 'A bar chart is often a clear choice for comparing categories such as regions. A line chart is usually more useful for change over time. Remove decoration that does not help the reader.', bullets: ['Use a descriptive title and clear units.', 'For a bar chart comparing quantities, start the value axis at zero.', 'Order categories thoughtfully and label the data source.'] },
          { title: 'Explain what happens next', body: 'Separate observation from interpretation. “North generated the highest revenue in this sample” is an observation. A recommendation should consider limitations such as missing regions, small sample size, or missing cost information.', bullets: ['State the main finding in one sentence.', 'Name a limitation that matters.', 'Suggest a next step supported by the data.'] },
        ],
        example: { title: 'A measured takeaway', body: 'North generated the highest recorded revenue in this small practice dataset. One order has an unknown region, so the regional comparison is incomplete. Verify that region before using these results to allocate a marketing budget.' },
        practice: 'Create one chart from your regional summary. Ask someone what they think it shows before reading your explanation. Use their response to improve the title or labels.',
        quiz: { question: 'Which statement is most responsible for this small dataset?', options: ['North will always be our best region.', 'North has the highest recorded revenue in this sample, with one region unknown.', 'The data proves we should double every price.'], answer: 1, explanation: 'It describes what the sample shows and acknowledges a limitation. The dataset alone does not establish future performance or pricing decisions.' },
      },
    ],
  },
  {
    slug: 'design-content', title: 'Design & Digital Content', category: 'Design & content',
    description: 'Learn to turn a message into clear, useful visual content—not just something that looks nice.',
    level: 'Beginner', color: 'orange', icon: 'design', audiences: ['beginner', 'student', 'professional'],
    skills: ['Visual hierarchy', 'Brand consistency', 'Content design'],
    outcomes: ['Match a message to an audience and a clear action.', 'Use type, spacing, and colour consistently.', 'Adapt one idea into several useful content formats.'],
    projectTitle: 'Create a small-business campaign kit',
    projectSummary: 'Invent a fictional local business and design a coherent social post, story, and flyer that help people understand one offer.',
    projectSteps: ['Write a short brief: audience, offer, desired action, and one important detail.', 'Choose two type styles, a small colour palette, and a consistent spacing approach.', 'Design a square social post, a vertical story, and a simple flyer.', 'Check readability at actual viewing size and ask someone to identify the offer and next action.', 'Export the files and write a short explanation of your design choices.'],
    deliverables: ['Three exported campaign assets', 'A one-page brief and miniature style guide', 'A short explanation of changes made after feedback'],
    rubric: ['The audience, offer, and next action are clear.', 'Type, colour, and spacing are consistent across the assets.', 'Each format works at its intended viewing size.', 'I used original or appropriately licensed materials and fictional business details.'],
    lessons: [
      {
        slug: 'give-design-a-job', title: 'Give your design a job', minutes: 10,
        intro: 'Design is a communication tool. Before choosing colours, decide who needs to understand what—and what you want them to do next.',
        sections: [
          { title: 'Write the brief first', body: 'A useful brief names the audience, the single main message, the action, and any essential constraints. “Everyone” is usually too broad to guide useful decisions.', bullets: ['Audience: people attending their first community workshop.', 'Message: a beginner-friendly Saturday session.', 'Action: reserve a place using the provided link.'] },
          { title: 'Create a reading order', body: 'Use size, position, spacing, and contrast to guide attention. If every element shouts, nothing stands out. Keep the main message prominent and move supporting details lower in the hierarchy.', bullets: ['Lead with one main message.', 'Group related details together.', 'Make the next action specific and easy to find.'] },
        ],
        example: { title: 'From vague to useful', body: 'Vague: “Make something exciting about our event.”\nUseful: “Help first-time visitors understand that Saturday’s free repair workshop is beginner-friendly, then encourage them to reserve a place.”' },
        practice: 'Write a three-line brief for a fictional business: audience, main message, and desired action.',
        quiz: { question: 'What should you establish before choosing decorative elements?', options: ['The audience, message, and desired action', 'As many fonts as possible', 'The longest possible headline'], answer: 0, explanation: 'A clear communication goal guides the visual choices. Decoration should support that goal rather than replace it.' },
      },
      {
        slug: 'build-a-visual-system', title: 'Make consistency feel effortless', minutes: 12,
        intro: 'A small set of repeatable choices makes content look coherent and speeds up future work.',
        sections: [
          { title: 'Limit the choices', body: 'Start with one or two typefaces, a few purposeful colours, and a simple spacing scale. Define roles: heading, body, caption, and action. Consistency matters more than novelty.', bullets: ['Use readable body text and generous line spacing.', 'Give each colour a purpose.', 'Reuse alignment and spacing patterns.'] },
          { title: 'Design for readability', body: 'Check contrast between text and background. Do not rely on colour alone to communicate meaning. Test the design at the size people will actually see it, especially on a phone.', bullets: ['Keep important text away from crowded edges.', 'Avoid placing small text over a busy image.', 'Use descriptive link or button labels.'] },
        ],
        example: { title: 'A miniature style guide', body: 'Headings: bold sans serif.\nBody: regular sans serif.\nColours: dark green text, off-white background, one warm accent.\nSpacing: use a consistent small / medium / large scale.' },
        practice: 'Create a miniature style guide with two type styles, three colours, and three spacing values. Apply it to a simple announcement.',
        quiz: { question: 'Which choice usually makes a campaign more coherent?', options: ['A different font and layout for every asset', 'Repeated type, colour, and spacing roles', 'Making every piece of text the largest size'], answer: 1, explanation: 'Reusable visual roles create consistency while leaving enough flexibility for different formats.' },
      },
      {
        slug: 'adapt-your-message', title: 'One idea, the right formats', minutes: 12,
        intro: 'Repurposing content is not simply stretching the same image. Preserve the message while adapting the composition to the place it will appear.',
        sections: [
          { title: 'Design for the context', body: 'A story, feed post, and flyer have different viewing distances and reading times. Keep the core offer consistent, but adjust the amount of detail and placement of the action.', bullets: ['A story needs a quickly understood focal point.', 'A feed post should remain readable as a small thumbnail.', 'A flyer can include supporting details and a clear contact route.'] },
          { title: 'Check rights and export carefully', body: 'Use your own work or materials with a licence that permits your intended use. Keep editable source files. Export a suitable image format, check dimensions, and preview the final files before sharing.', bullets: ['Use meaningful filenames.', 'Provide alternative text when publishing images.', 'Ask a reviewer what they think the offer and next action are.'] },
        ],
        example: { title: 'A quick feedback question', body: 'Instead of “Do you like it?”, ask: “What is being offered, who is it for, and what would you do next?” The answers reveal whether the communication works.' },
        practice: 'Adapt your announcement into two formats. Keep the message consistent but change the composition. Record one improvement after checking readability.',
        quiz: { question: 'What is the best way to adapt a feed post into a flyer?', options: ['Stretch the image until it fits', 'Keep the core message and recompose for the format', 'Remove all contact and action information'], answer: 1, explanation: 'The message should stay consistent, but hierarchy, detail, and spacing should respond to the new viewing context.' },
      },
    ],
  },
  {
    slug: 'web-foundations', title: 'Web & No-Code Fundamentals', category: 'Web & no-code',
    description: 'Understand how useful websites work, then plan and build a clear, responsive page with code or a no-code tool.',
    level: 'Beginner', color: 'purple', icon: 'web', audiences: ['beginner', 'student', 'professional'],
    skills: ['Page structure', 'Responsive layouts', 'Accessibility'],
    outcomes: ['Plan a page around a visitor’s task.', 'Build a layout that adapts to smaller screens.', 'Check keyboard access, readability, and essential publishing details.'],
    projectTitle: 'Build a useful one-page website',
    projectSummary: 'Create a responsive page for a fictional service. A visitor should understand the offer and know how to take the next step.',
    projectSteps: ['Choose a fictional service and write the main visitor task.', 'Sketch the page: introduction, offer, explanation, and one clear action.', 'Build it using HTML/CSS or a no-code website tool you can access.', 'Test at narrow and wide screen sizes and navigate using only a keyboard.', 'Publish only if you are ready; otherwise share screenshots or a local preview. Do not include real customer information.'],
    deliverables: ['A page preview, published link, or screenshots', 'A short explanation of the visitor task', 'A checklist of mobile and accessibility checks'],
    rubric: ['The page communicates a clear offer and next action.', 'The layout remains usable on a narrow screen.', 'Headings, labels, contrast, and keyboard navigation have been checked.', 'I used fictional details and have permission for any published materials.'],
    lessons: [
      {
        slug: 'structure-around-a-task', title: 'Start with the visitor’s task', minutes: 12,
        intro: 'A website is useful when it helps someone accomplish something. Start with that task rather than a collection of sections you think a website should have.',
        sections: [
          { title: 'Define the primary action', body: 'For a small service website, the action might be requesting a quote or finding opening hours. Make that action clear, then organise supporting information around it.', bullets: ['State who the page is for.', 'Explain the offer in plain language.', 'Choose one primary next action.'] },
          { title: 'Use meaningful structure', body: 'In HTML, headings describe the hierarchy of the content. Navigation, main content, and footer regions help browsers and assistive technologies understand the page. No-code tools often expose equivalent settings.', bullets: ['Use one clear main heading.', 'Keep heading levels logical rather than choosing them only by size.', 'Use descriptive navigation and button labels.'] },
        ],
        example: { title: 'A simple page outline', body: 'Header: business name and navigation.\nMain: what the service does → how it works → common questions.\nAction: request a quote.\nFooter: essential contact and privacy information.' },
        practice: 'Write a one-sentence visitor task and a four-part outline for a fictional service page.',
        quiz: { question: 'Which is the strongest starting point for a service page?', options: ['A visitor task and a clear next action', 'As many animations as possible', 'Copying a competitor word for word'], answer: 0, explanation: 'The visitor’s task gives the page a purpose and helps you decide what content and actions matter.' },
      },
      {
        slug: 'design-for-every-screen', title: 'Let the layout adapt', minutes: 15,
        intro: 'Responsive design is about preserving usefulness across screen sizes—not merely making everything smaller.',
        sections: [
          { title: 'Start narrow', body: 'Arrange the essential content in a sensible single-column order. Add columns only when there is enough space. Flexible widths, wrapping, and CSS grid or flexbox help content adapt.', bullets: ['Avoid fixed page widths that overflow a phone screen.', 'Keep tap targets comfortably sized and spaced.', 'Let long text wrap instead of clipping it.'] },
          { title: 'Test real content', body: 'Empty layouts can hide problems. Test long headings, different image proportions, and zoomed text. Check that the primary action remains easy to find.', bullets: ['Test narrow and wide viewports.', 'Increase browser zoom and check for lost content.', 'Use appropriately sized images and reserve their dimensions where possible.'] },
        ],
        example: { title: 'A practical responsive check', body: 'At phone width, cards stack in one column. At wider sizes, they form two or three columns. The reading order and primary action stay clear in both layouts.' },
        practice: 'Sketch your page at phone and desktop widths. Mark where sections stack, wrap, or gain columns.',
        quiz: { question: 'What is a good mobile-first approach?', options: ['Fix the page at desktop width', 'Start with essential content in a usable narrow layout', 'Hide all important information on phones'], answer: 1, explanation: 'Starting narrow forces useful prioritisation. Wider layouts can then add space and columns without changing the core task.' },
      },
      {
        slug: 'publish-with-care', title: 'Make it usable before you share it', minutes: 12,
        intro: 'A useful launch is a checked launch. Basic accessibility, performance, and privacy checks prevent many avoidable problems.',
        sections: [
          { title: 'Check more than appearance', body: 'Navigate with a keyboard, check visible focus, and make sure controls have understandable names. Provide useful alternative text for meaningful images and sufficient contrast for text.', bullets: ['Form inputs need visible labels.', 'Links should describe their destination.', 'Do not rely on colour alone for errors or status.'] },
          { title: 'Publish responsibly', body: 'Use HTTPS hosting where available. Test every link and form. If you collect personal information, explain why and protect it appropriately. A portfolio project can use fictional details and avoid collecting data altogether.', bullets: ['Check the page title and description.', 'Remove unused scripts and oversized assets.', 'Recheck the live version after publishing.'] },
        ],
        example: { title: 'A five-minute pre-launch check', body: 'Can I navigate by keyboard? Are labels and headings clear? Does the page work at narrow width? Do all links work? Have I removed private information and unnecessary scripts?' },
        practice: 'Run the five-minute check on your project. Record one issue you found and how you fixed it.',
        quiz: { question: 'Which item belongs in a pre-launch accessibility check?', options: ['Only checking the page on your own monitor', 'Keyboard navigation, labels, headings, and contrast', 'Adding an animation to every section'], answer: 1, explanation: 'These checks help reveal barriers that a visual desktop-only review can miss. They are a starting point, not a complete accessibility audit.' },
      },
    ],
  },
];

export const getPath = (slug: string | undefined) => paths.find((path) => path.slug === slug);
export const getAudience = (id: AudienceId | null) => audiences.find((audience) => audience.id === id);
export const pathMinutes = (path: LearningPath) => path.lessons.reduce((total, lesson) => total + lesson.minutes, 0);
export const completedPathLessons = (path: LearningPath, completed: string[]) => path.lessons.filter((lesson) => completed.includes(`${path.slug}/${lesson.slug}`)).length;
export const nextLesson = (path: LearningPath, completed: string[]) => path.lessons.find((lesson) => !completed.includes(`${path.slug}/${lesson.slug}`)) ?? path.lessons[0];

export const practiceCsv = `Order ID,Date,Product,Quantity,Unit price,Region\n1001,2026-01-05,Notebook,4,1200,North\n1002,2026-01-06,Desk pad,2,3500,South\n1003,2026-01-07,Notebook,3,1200,East\n1004,2026-01-08,Marker set,5,1800,West\n1004,2026-01-08,Marker set,5,1800,West\n1005,2026-01-09,Desk pad,1,3500,North\n1006,2026-01-10,Notebook,6,1200,South\n1007,2026-01-11,Marker set,2,1800,East\n1008,2026-01-12,Desk pad,3,3500,\n1009,2026-01-13,Notebook,5,1200,North\n1010,2026-01-14,Marker set,4,1800,West\n1011,2026-01-15,Desk pad,2,3500,South\n`;
