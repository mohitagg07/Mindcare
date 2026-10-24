# MindCare Product Expansion Roadmap

**Product promise:** *MindCare remembers your story, not assumptions.*

## UX decision
- Chat is the main space. It invites a user to an optional structured check-in, asks permission, presents one question at a time, shows a qualified result, and offers to return to chat.
- The first public release offers one structured questionnaire: **Mood & interest** (PHQ-9). Canonical instrument IDs, scoring versions, response values, item wording and safety semantics remain internal; public labels never alter validated content or scoring.
- A user-selected saved result can be discussed only after an explicit action. The server verifies ownership and passes only a minimal summary, never raw answers.
- Visual direction: warm cream/sage, reserved lilac/blue accents, generous space, rounded cards, accessible controls, keyboard focus and reduced motion.
- Facial-expression estimation remains separate and optional; it is neither identity recognition nor diagnosis or safety triage.

## Assessment scope
**Public v1 — Mood & interest:** PHQ-9 is the only public-facing structured questionnaire. Preserve exact canonical wording, response values and scoring; a positive item 9 takes a separate safety follow-up path regardless of the total score.

**Legacy compatibility — GAD-7:** backend endpoints, database fields and already-saved results remain for backward compatibility. GAD-7 is not offered as a new public check-in unless the product owner explicitly re-approves it. Keep historical results readable; do not remove endpoints, rows or schema fields as part of a UI-scope change.
**Daily wellbeing / WHO-5:** do not ship standard WHO-5 wording until reuse/translation rights for the intended distribution (including commercial use) have been confirmed. WHO's current publication includes CC BY-NC-SA 3.0 IGO terms and WHO permissions/copyright guidance should be reviewed: https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01 ; https://www.who.int/about/policies/copyright ; https://www.who.int/about/policies/permissions . Until then, do not copy/adapt the items or describe a home-grown score as validated. A separate non-standardized daily reflection is a distinct option.

## Delivery phases
1. **PHQ-9 assessment foundation:** a single public check-in, canonical scoring, one-question flow, result → chat, owner-scoped result-summary retrieval, and assessment-label/privacy tests. Keep legacy GAD-7 contracts covered separately.
2. **Send-state and streaming reliability:** pending/saved/unconfirmed/error states, single turn ID retries, SSE integration, timeouts and failure injection.
3. **Context Builder and conversation modes:** bounded relevant profile/current-thread history/user-approved memories and explicitly selected check-in summary; Just listen / Explore / Next step / Reflect.
4. **Reflection cards, daily self-report and goals:** optional editable summary; clearly non-standardized daily check-in; user-owned goals, timeline and deletion.
5. **Evidence-grounded wellbeing:** licensed corpus, source/page/version metadata, multilingual benchmark, grounded answers and abstention.
6. **Optional expression/voice:** separate privacy, consent, retention, correction and provider-transfer review.
7. **Controlled adult-pilot readiness:** qualified crisis-safety review, staged failure tests, RLS/data deletion evidence, monitoring, rollback and privacy notices.

## Release rule
One slice per feature branch. Inspect diff, pass focused tests and CI on the exact commit, document migration requirements, then verify staging/live behavior before moving on. No simultaneous rewrite of assessment, chat orchestration, RAG and multimodal features.