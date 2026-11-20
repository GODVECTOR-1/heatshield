# HeatShield — Future Health Challenge 07

Plan index: `PLAN.md` → current rules per work area in `docs/spec/` (00–13), review history in `docs/review/`. Frontend is generated with v0; the backend is built in Google Antigravity. `lib/types.ts` is the shared contract. When changing a rule, edit the matching `docs/spec/` file, not `docs/review/`.
Secrets live in `.env.local` (gitignored). Never print or commit them.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
