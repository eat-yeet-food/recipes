---
name: prose-authoring
description: Plan and collaboratively draft educational articles, guides, and lessons through outline approval and section-by-section review. Use for new instructional prose or substantial structural rewrites; skip this workflow for isolated copy edits unless the user asks for it.
---

# Prose Authoring

Build practical instructional prose collaboratively. Align on the reader's learning need, decision path or task, section hierarchy, and content format before drafting.

## Workflow

1. Establish the intended reader, the problem they are trying to solve, and what they should understand or be able to do after reading. Infer these from context when they are already clear.
2. Propose an outline before writing article prose. For each section, state the question it answers, its heading level, and the form that best serves it: overview prose, comparison, procedure, example, visual, or TODO.
3. Ask the user to approve or revise the outline. Do not draft the article until the outline is approved.
4. After approval, create the document skeleton with the agreed headings and any known asset TODOs. Preserve the approved order.
5. Draft one section at a time. Ask for feedback after each section and wait for sign-off before drafting the next one.
6. Within a section, revise only the paragraph or idea under discussion unless a related transition must change. Do not churn prose the user has already approved.
7. After all sections are approved, make two focused passes. First check teaching logic, evidence, transitions, terminology, and whether conclusions follow from the explanation. Then check directness, headings, formatting, repetition, and voice. Keep approved substance intact unless a correction is necessary.

If the user explicitly requests a complete draft in one pass, follow that instruction instead of imposing review gates.

## Article Architecture

Choose the article's teaching mode before imposing an architecture:

- Explanatory articles should organize mechanisms, relationships, observable effects, and limitations into a coherent account. Include practical tips where they clarify an implication, but do not force the article into a planning-and-control frame.
- Procedural articles should organize the inputs, sequence, checkpoints, and completion evidence around the task the reader will perform.
- Decision guides should establish the relevant criteria before presenting alternatives and tradeoffs.

For a procedural article, a useful default sequence is:

1. The outcome and plan the reader needs before starting.
2. The inputs, constraints, and tools that affect that plan.
3. The progression the reader can observe, feel, or measure.
4. The available methods and their practical tradeoffs.
5. Exceptions, adjustments, and technical terms once the default case is clear.
6. The next useful lesson or action.

Change this sequence when the subject demands it, but make every section earn its place in the reader's progression.

Let the article title establish the subject. Open with a short, inviting lead unless another heading introduces a real decision or topic boundary. Avoid academic inventory headings and generic setup sections that merely restate the title. In procedural work, give the reader the relevant plan before presenting examples; examples should illustrate that plan rather than serve as specimens the reader must decode first.

Use headings for real topic boundaries. A parent topic is an H2; alternatives within it are H3 subsections with short distinguishing names. Prefer concise, literal subject labels over question scaffolding that begins with “What,” “How,” or “Why” when the surrounding article already supplies that context. Prefer a direct positive statement over a slogan, wordplay, or a contrarian construction such as “X Is Not Y” or “X Is More Than Y” when the same idea can be named directly. Reserve prescriptive headings for actions that are actually required.

## Choose the Right Content Form

- Use connected paragraphs for explanation and progression.
- Use comparisons only when the reader's task is genuinely to look across repeated dimensions. If a table or compact comparison becomes dense, replace it with a brief overview followed by separate method sections.
- Use numbered steps for procedures the reader performs in sequence. Do not flatten a useful procedure into paragraphs to work around a layout or heading limitation.
- Place each alternative method in its own subsection under the shared parent topic. Make the names parallel and easy to distinguish.
- Treat a numbered step's label as a bold lead-in within the instruction paragraph, not as another heading. Split it from the paragraph only when the step contains multiple paragraphs or subordinate ideas.
- Use an insight or takeaway callout only when it helps the reader scan a substantive section. Place it immediately after the section heading, give it a specific conclusion-driven title rather than a generic label such as “Takeaway,” and make its body useful beyond repeating the heading.
- Keep a parent section's overview as ordinary prose when it introduces the subsections. Do not invent a titled callout merely to format an introductory paragraph.
- Present a final “Key Takeaways” summary as an ordinary heading and list unless the user or template requests a callout.
- When insight callouts are meant to stand out visually, use the document or site's semantic accent treatment rather than a neutral gray default. Preserve the existing design-token system.
- If the content system cannot express the intended hierarchy, adjust the representation or implementation instead of assigning content a false semantic role for visual styling.

## Evidence, Timing, and Technical Detail

- In an explanatory article, use the first one or two paragraphs to give the reader a compact map of the main mechanisms, the outcomes they create, and the variables that shift the result. Keep it concise enough to orient rather than pre-empt the article.
- Make research earn its space. State the relevant comparison and actual finding, then explain what it changes in the reader's expectations, choices, or troubleshooting. Do not cite a study merely to say that differences were measurable or that a variable matters.
- Translate chemical or technical findings into likely sensory or observable effects when the evidence supports that connection. Distinguish a demonstrated result from a reasonable expectation, and do not invent a specific taste, aroma, or recommendation that the source did not test.
- Explain interacting variables together. When discussing time and temperature, for example, make clear which condition produced which result, what was held comparable, and why the comparison matters. Avoid joining separate findings in a sentence that implies a relationship the study did not establish.
- Preserve detail that conveys magnitude, mechanism, a useful boundary, or the design of a comparison. Remove exact values and compound names when they add cognitive load without changing what the reader understands or does. A plain-language summary can retain nuance without reproducing the study's vocabulary.
- Give useful expectations for named methods or formulas when readers will naturally compare them. Present the common tendency first, describe the likely sensory or practical result, and then name the conditions that can change it. Do not replace guidance with a blanket “results vary” disclaimer.
- When a paragraph is technically accurate but yields no action or clearer expectation, condense it or add the practical implication. Useful implications include what to adjust, what to compare, what to observe, and which tradeoff prevents simply maximizing the variable.
- For procedures, give the reader a plan from information available before starting. Name the material or formula, tools and workspace, temperature, and schedule when they affect the method. Observations during the process confirm progress and completion; they do not replace advance planning.
- Explain the need before introducing a tactic. Show the relevant behavior first, then name and define the technical term when it becomes useful.
- Prefer observable evidence over detached definitions. Describe what changes, what the reader should look for, and what that change means.
- Include a relative time estimate when it helps the reader plan or know when to begin checking. Use a stated context and treat the range as a checkpoint, not a promise.
- Put time beside completion evidence: "Begin checking after X; this often takes X-Y; stop when Z changes." Distinguish active work from resting, cooling, fermenting, or other passive time.
- Separate the target from the method. Equipment settings, repetitions, and elapsed time are ways to reach or check the target; the relevant behavior or result determines completion.
- Present the common target first, then meaningful exceptions and why they differ. Avoid turning one useful variable into a universal classifier. For dough, hydration, flour, enrichment, temperature, fermentation schedule, workspace, and mixing equipment may all change the practical workflow.

## Voice, Editing, and Feedback

- Start sections with the reader's purpose or immediate question. Avoid abstract openings that do not help the reader decide or act.
- Introduce concepts only when the reader needs them. Do not front-load misconceptions, terminology, or side cases.
- Prefer direct, beginner-readable language without flattening meaningful distinctions.
- Explain a mechanism directly when plain language is sufficient. Use an analogy only when it materially improves understanding; do not let a cute comparison become the article's organizing device or substitute for the explanation.
- Remove redundant stages and facts that are accurate but poorly timed. Narrative flow matters more than including every related claim.
- End with a clear next step or adjacent lesson.

Treat feedback as evidence about the teaching logic, structure, and content form, not merely as a request to swap words. Identify the job of the weak passage before revising it. Apply the resulting principle to the affected section, preserve approved voice and scope, and then use the continuity pass to catch any related transitions or terminology that must change.
