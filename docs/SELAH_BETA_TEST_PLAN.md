# Selah Bible beta test plan

## Purpose

Gather actionable feedback on whether people can find, understand, and reliably use Selah’s main reading, study, reflection, and mobile features. The form is designed for adult testers and should take about 7–10 minutes; questions about features a tester did not try can be skipped.

## Feature coverage and what testers should expect

| Area | What the app offers | What to check in testing |
| --- | --- | --- |
| Home and navigation | Home dashboard, resume reading, shortcuts, and a persistent centered bottom navigation | Can a tester identify the current section and reach the main areas on a small phone and larger screen? Does the nav stay centered and avoid clipping or horizontal scrolling? |
| Bible reading | Book/chapter navigation, version switching, parallel reading, verse comparison, display settings, footnotes, selection, highlights, bookmarks, and notes | Can a tester find a passage, change a version or appearance, use a study action, and tell what was saved? Are text and controls comfortable to read and tap? |
| Version Vault and offline use | Search and browse available versions, download a version for offline reading, see download status, remove downloads, and import/export JSON Bible files | Is it clear which versions are already offline versus online? Does a download complete with understandable progress/errors? Can downloaded text be reopened after connectivity is turned off? Provider catalogs and availability can vary. |
| Search and study | Bible text search and a personal study area for notes, tags, bookmarks, and highlights | Do results match the query and link to the expected passage? Can a tester find and revisit saved study material? |
| Selah Bible Companion | A local, Scripture-grounded study helper with passage references, guided prompts, quizzes, and sermon-outline support | Are answers understandable and useful? Are Scripture references relevant? Is it clear this is a study aid rather than an authoritative replacement for Scripture, pastoral counsel, or professional advice? |
| Reading plans | Ready-made plans, a custom-plan builder, enrollments, daily passages, and completion tracking | Can a tester find a plan, begin it, read its passage, and understand how to mark progress? Does the custom builder make its choices clear? |
| Daily reflection and prayer | Daily reflections, mood check-in, guided reflection/journaling, and a Prayer Sanctuary with answered-prayer tracking | Can a tester understand the prompts and save/revisit a test entry? Do not enter another person’s name or private/confidential prayer information in feedback. |
| Audio | Device speech synthesis and studio narration where available, verse-following playback, voice/speed controls, sleep timer, and ambient sound | Does playback start/pause and follow the passage? Are voice, speed, timer, and ambient controls understandable? Availability may depend on browser/device and a connection for third-party studio audio. |
| Kids Storybook | Bible-book journeys and child-friendly story retellings with references, questions, activities, and prayers | Can an adult find a story and its companion activity? Is language and navigation appropriate for the intended family use? Do not submit children’s names or other identifying information. |
| Reminders and saved data | Optional daily reading reminders; local-first storage for reading preferences and study progress, with optional account-based cloud backup/sync and shared reading groups | Does the permission request explain itself? Can the tester set or change a reminder? Do they understand what stays on the device versus what requires optional sign-in? Browser/OS reminder behavior varies. |
| Install and responsive behavior | Android/iOS browser installation and native Capacitor app builds; app branding is Selah | Ask how the tester opened Selah. Check whether an installed app launches as a standalone app, and whether navigation/layout fit the device. PWA and native behaviors differ by platform. |
| About and support | About page explains the app; optional one-time NGN support checkout is hosted by Paystack | Is the invitation clear and non-pressuring? **Do not submit a donation during the test.** Production checkout may use a live key; if a tester opens it, they should stop before paying and return to Selah. |

## Testing expectations and guardrails

- Test with ordinary tasks, not personal or confidential spiritual journal entries. Use generic sample text for notes and prayers.
- No tester should share passwords, payment-card details, phone numbers, or children’s personal information in the form.
- Do not complete a Paystack payment as part of this test. A production checkout may process a real contribution.
- Local Bible reading and most personal progress are designed to work without creating an account. Cloud backup/sync and group features are optional and require sign-in.
- Catalog size, individual translation availability, studio-audio availability, and notification behavior can vary by provider, device, browser, permissions, and network. The form asks about the tester’s observed result rather than promising a particular count or universal behavior.

## Form generation

`create-selah-beta-feedback-form.gs` creates a Google Form and a linked Google Sheets response destination in the account that runs it. Google Forms is not directly connected in this Arena conversation, so run the script in the user’s Google Apps Script account to create the live form. See the script’s header comments for steps.
