/**
 * Creates a shareable Selah Bible beta-feedback Google Form and a linked
 * response spreadsheet in the Google account that runs this script.
 *
 * How to run (one time only):
 * 1. Sign in to the Google account that should own the form and responses.
 * 2. Open https://script.new and replace the starter code with this file's contents.
 * 3. Run createSelahBetaFeedbackForm and approve the Google Forms/Sheets prompts.
 * 4. In the execution log, open the RESPOND_URL to copy the tester link and
 *    EDIT_URL to manage the form. The RESPONSES_SHEET_URL is the linked results sheet.
 * 5. In the Form's Settings, ensure external responders are allowed if testers
 *    are outside your Google Workspace. Email collection is disabled by default.
 *
 * Run only once: each run creates a new form and spreadsheet.
 */
function createSelahBetaFeedbackForm() {
  const form = FormApp.create("Selah Bible — Beta Tester Feedback");
  form.setDescription(
    "Thank you for helping test Selah. This anonymous feedback form takes about 7–10 minutes. " +
    "Try the features you can; skip anything you did not test. Please do not enter passwords, " +
    "payment details, private prayer/journal content, or identifying information about children.\n\n" +
    "Important: do not complete a support donation during testing. The production Paystack checkout " +
    "may be live. If you open it, stop before paying and return to Selah."
  );
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setShuffleQuestions(false);
  form.setConfirmationMessage(
    "Thank you for helping us make Selah more peaceful, clear, and dependable. Your feedback has been recorded."
  );

  form.addSectionHeaderItem()
    .setTitle("1. Your device and testing setup")
    .setHelpText("This helps us understand differences between browsers, installed PWAs, and devices.");
  addChoice(form, "What kind of device did you use?", [
    "Android phone", "Android tablet", "iPhone", "iPad", "Windows computer", "Mac", "Other"
  ], true);
  addChoice(form, "How did you open Selah?", [
    "Installed app from Chrome using Install app", "Home-screen shortcut added from a browser",
    "Chrome browser tab on Android", "Safari browser tab on iPhone/iPad",
    "Installed web app on iPhone/iPad", "Native Android app build", "Native iOS app build",
    "Desktop browser", "Other / not sure"
  ], true, "Please distinguish a true installed app from a browser tab or home-screen shortcut if you can.");
  addChoice(form, "How was your internet connection during testing?", [
    "Reliable", "Occasionally slow or interrupted", "Mostly offline", "I did not notice"
  ], false);
  addCheckboxes(form, "Which areas did you try? Select all that apply.", [
    "Home and navigation", "Bible reader and version switching", "Version Vault / downloads",
    "Bible search or study notebook", "Reading plans", "Daily reflection or Prayer Sanctuary",
    "Selah Bible Companion", "Audio read-along", "Kids Storybook", "Reminders",
    "Cloud backup or shared reading groups", "About / Paystack support", "Other"
  ], false);

  addPage(form, "2. Finding your way and reading Scripture", "Try opening a passage, moving between sections, and changing a reader setting.");
  addChoice(form, "Could you find the section you wanted using the bottom navigation?", [
    "Yes, easily", "Yes, but I had to look around", "No", "I did not try"
  ], true);
  addChoice(form, "On your screen, did the bottom navigation stay centered, readable, and easy to tap?", [
    "Yes", "Mostly", "No — it clipped, shifted, or was hard to use", "I did not try / not applicable"
  ], true);
  addChoice(form, "Could you open a Bible book/chapter and switch to another version?", [
    "Yes, both were easy", "I could open a passage but not switch versions", "I could switch versions but not find a passage", "No", "I did not try"
  ], true);
  addRating(form, "How comfortable was the Scripture reading experience (text size, spacing, and controls)?", "1 = Not comfortable", "5 = Very comfortable");
  addChoice(form, "Did the reader fit your screen without unwanted horizontal scrolling?", [
    "Yes", "Mostly", "No", "I did not try / not applicable"
  ], false);
  addChoice(form, "Which reading tools did you successfully use? Select all that apply.", [
    "Change font size or appearance", "Compare versions side by side", "Compare a verse across versions",
    "Highlight a verse", "Bookmark a verse", "Save a study note", "Open a translator footnote",
    "None of these", "I did not try these"
  ], false);
  addParagraph(form, "What, if anything, was confusing or difficult while reading? Please describe what you tapped and what you expected.", false);

  addPage(form, "3. Version Vault, offline reading, and search", "Version catalogs and availability may vary by provider, network, and license.");
  addChoice(form, "How easy was it to find a Bible version in the Vault?", [
    "Easy", "I found it, but it took some searching", "I could not find the version I wanted", "I did not try"
  ], false);
  addChoice(form, "If you downloaded a version, what happened?", [
    "It finished and I could read it offline", "It finished, but I could not read it offline", "It was still downloading", "It failed or got stuck", "I did not download a version"
  ], false);
  addChoice(form, "If you tried Bible search, how well did the results match what you searched for?", [
    "Very well", "Somewhat", "Poorly / no useful results", "I did not try search"
  ], false);
  addChoice(form, "Could you find a saved note, bookmark, or highlight again?", [
    "Yes", "Partly", "No", "I did not save anything"
  ], false);
  addChoice(form, "If you tried importing or exporting a Bible file, what happened?", [
    "It worked as expected", "It worked, but the steps were unclear", "It failed", "I did not try"
  ], false);

  addPage(form, "4. Plans, reflection, study, and family features", "Skip questions about features you did not try. Use only generic test text in journals or prayers.");
  addChoice(form, "Could you find a reading plan, start it, and understand how to mark a day complete?", [
    "Yes, all three", "I found/started a plan but progress was unclear", "I could not find or start a plan", "I did not try"
  ], false);
  addRating(form, "If you tried a daily reflection or Prayer Sanctuary, how clear and supportive did it feel?", "1 = Not clear/supportive", "5 = Very clear/supportive");
  addChoice(form, "If you tried Selah Bible Companion, were its explanations and next steps useful?", [
    "Yes", "Somewhat", "No", "I did not try"
  ], false);
  addChoice(form, "If you tried the Companion, were Scripture references relevant and its role as a study aid clear?", [
    "Yes to both", "References were relevant, but its limits were unclear", "References were not relevant", "I did not try"
  ], false);
  addChoice(form, "If you tried the Kids Storybook, could you find a story and understand its question/activity?", [
    "Yes", "Partly", "No", "I did not try"
  ], false);
  addChoice(form, "If you tried audio read-along, did playback and its controls work as expected?", [
    "Yes", "Partly", "No / audio would not start", "I did not try"
  ], false);

  addPage(form, "5. Reminders, saved data, and support", "Reminder, sync, audio, and support behavior can depend on permissions, browser, and device.");
  addChoice(form, "If you tried a daily reminder, could you set or change the time and understand the permission request?", [
    "Yes", "Partly", "No", "I did not try / reminders were unavailable"
  ], false);
  addChoice(form, "Did it feel clear which information stays on your device and which features need optional sign-in/sync?", [
    "Yes", "Mostly", "No", "I did not use saved data or sync"
  ], false);
  addChoice(form, "Did you notice the Support Selah section on About, and did its message feel clear and non-pressuring?", [
    "Yes, clear and comfortable", "I noticed it, but the message could be clearer", "It felt pressuring", "I did not notice / did not open About"
  ], false);
  addChoice(form, "If you opened Paystack checkout, what happened? Do not submit a payment.", [
    "I did not open checkout", "Paystack opened; I stopped before paying", "An error appeared before checkout", "Other (describe below)"
  ], false, "Production checkout may be live. Never enter payment details or complete a donation for this test.");

  addPage(form, "6. Overall feedback", "Specific steps and expected-versus-actual results help us fix issues fastest.");
  addRating(form, "Overall, how satisfied are you with Selah so far?", "1 = Not satisfied", "5 = Very satisfied");
  form.addScaleItem()
    .setTitle("How likely are you to recommend Selah to someone who wants a Bible reading/study app?")
    .setBounds(0, 10)
    .setLabels("Not at all likely", "Extremely likely")
    .setRequired(false);
  addParagraph(form, "What is the most important problem you encountered? Include the screen, steps to reproduce, and what you expected versus what happened. Do not include passwords, private prayer content, or payment details.", false);
  addParagraph(form, "What is your favorite or most useful part of Selah, and why?", false);
  addParagraph(form, "If we changed one thing before wider release, what should it be?", false);
  const responseSheet = SpreadsheetApp.create("Selah Beta Feedback — Responses");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSheet.getId());

  Logger.log("FORM_EDIT_URL: " + form.getEditUrl());
  Logger.log("FORM_RESPOND_URL: " + form.getPublishedUrl());
  Logger.log("RESPONSES_SHEET_URL: " + responseSheet.getUrl());
}

function addPage(form, title, helpText) {
  const page = form.addPageBreakItem().setTitle(title);
  if (helpText) page.setHelpText(helpText);
  return page;
}

function addChoice(form, title, choices, required, helpText) {
  const hasOther = choices.includes("Other");
  const item = form.addMultipleChoiceItem()
    .setTitle(title)
    .setChoiceValues(choices.filter((choice) => choice !== "Other"))
    .setRequired(Boolean(required));
  if (hasOther) item.showOtherOption(true);
  if (helpText) item.setHelpText(helpText);
  return item;
}

function addCheckboxes(form, title, choices, required, helpText) {
  const hasOther = choices.includes("Other");
  const item = form.addCheckboxItem()
    .setTitle(title)
    .setChoiceValues(choices.filter((choice) => choice !== "Other"))
    .setRequired(Boolean(required));
  if (hasOther) item.showOtherOption(true);
  if (helpText) item.setHelpText(helpText);
  return item;
}

function addRating(form, title, lowLabel, highLabel) {
  return form.addScaleItem()
    .setTitle(title)
    .setBounds(1, 5)
    .setLabels(lowLabel, highLabel)
    .setRequired(false);
}

function addParagraph(form, title, required, helpText) {
  const item = form.addParagraphTextItem()
    .setTitle(title)
    .setRequired(Boolean(required));
  if (helpText) item.setHelpText(helpText);
  return item;
}
