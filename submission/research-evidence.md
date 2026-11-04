# Evidence for the GroundTruth problem

Verified against primary research and institutional publication records on 5 November 2026. These studies motivate the design; none evaluates GroundTruth or establishes its educational effectiveness.

## The defensible problem

AI-assisted project performance and independent understanding are different outcomes. A finished application can give a teacher useful evidence of product quality while leaving questions about which concepts the learner can apply independently. GroundTruth adds an inspectable learning trail: selected source, guided investigation, a frozen independent attempt and explicit teacher review.

## Three relevant studies

### Programming education: higher exercise scores did not establish greater learning

Bassner et al., *Less stress, better scores, same learning: The dissociation of performance and learning in AI-supported programming education*, Computers and Education: Artificial Intelligence, volume 10, article 100537 (institutional record lists June 2026; DOI contains 2025).

- Three-arm randomized trial with 275 introductory programming students at TUM; a 90-minute concurrency exercise compared a hint-first tutor, unrestricted ChatGPT and no-AI web resources.
- Both AI conditions achieved higher exercise scores. Neither showed greater pre/post knowledge gains or code-comprehension advantages; AI also reduced frustration, and the hint-first tutor increased intrinsic motivation.
- Scope: one course, topic and short intervention. Absence of an observed advantage is not proof that the conditions are equivalent in every setting.

[Institutional publication record and abstract](https://portal.fis.tum.de/en/publications/less-stress-better-scores-same-learning-the-dissociation-of-perfo/) · [Publisher DOI](https://doi.org/10.1016/j.caeai.2025.100537)

### Learning a new coding library: immediate unaided comprehension can lag

Shen and Tamkin, *How AI Impacts Skill Formation* (2026 preprint).

- Randomized main study with 52 Python-experienced participants learning unfamiliar Trio asynchronous-programming concepts; 26 per condition.
- AI-assisted participants scored lower on the immediate post-task skill assessment (reported Cohen's d = 0.738, p = 0.01). Average task-time improvement was not statistically significant.
- Exploratory interaction-pattern analysis associated conceptual engagement with stronger outcomes; those associations do not establish that a particular prompting style caused learning gains.
- Scope: a small, short study of a new library, not longitudinal evidence that AI harms all developers or that every AI-assisted student fails.

[Primary paper](https://arxiv.org/html/2601.20245v1) · [Authors' institutional research explanation](https://www.anthropic.com/research/AI-assistance-coding-skills)

### Guardrail design matters: supporting evidence from mathematics

Bastani et al., *Generative AI without guardrails can harm learning: Evidence from high school mathematics*, PNAS 122(26), e2422633122 (2025).

- Randomized field experiment with nearly 1,000 high-school mathematics students in Turkey.
- Standard GPT-4 assistance improved assisted practice performance, but subsequent unaided exam grades were 17% lower relative to control. Teacher-informed tutoring safeguards largely mitigated that negative effect without demonstrating a positive unaided-exam effect.
- Scope: mathematics, specific tasks and specific tutor designs. Do not transfer the 17% estimate to coding, Meta models or GroundTruth. The studied safeguards included substantial teacher-supplied problem information; a generic hint prompt is not an equivalent intervention.

[Open primary article](https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/) · [Publisher DOI](https://doi.org/10.1073/pnas.2422633122)

## Safe pitch language

“Students can now build impressive software with AI. The assessment question is what they understand well enough to change themselves. Research in programming education shows that better assisted exercise performance does not necessarily mean greater independent understanding. GroundTruth turns the student's own repository into a learning journey, then pauses its assistance for a short independent attempt. Teachers can review the original answer alongside the source and the assistance used within GroundTruth.”

This is a product interpretation of the evidence. GroundTruth's current evidence index is provisional and human-reviewed; it is not a validated grade, authorship detector or measure of AI dependence.

## Claims to exclude

- “All students who use AI fail when AI is removed.”
- “AI causes a rising failure rate,” without representative longitudinal data.
- “GroundTruth detects cheating or proves a student did not use external AI.”
- “GroundTruth improves mastery by 17%,” or any other unmeasured effect.
- “Meta models teach better than competing models.” No comparative educational evaluation has been conducted here.

The next evaluation should compare fresh unaided code reading and transfer tasks, include human review and a suitable comparison workflow, and measure retention after a delay. The deployed MVP currently demonstrates a workflow, not established learning gains.
