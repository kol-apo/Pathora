# prompts/

`discovery.json` is the authoritative specification for roadmap generation. It holds the system prompt, the user message template, the output contract, and the validators applied after generation. `validate_prompt.py` checks all of it offline.

```bash
pip install -r requirements.txt
python3 validate_prompt.py
```

## Why a versioned JSON file, not a string in the code

- **Provenance for the dissertation.** `prompt_version` is written to every row in `roadmaps`, alongside `model_version`. Any roadmap in the dataset can be traced to the exact prompt and model that produced it, and `v_schema_validation` reports output validity per prompt version.
- **Falsifiability.** "Pathora always surfaces a human" is a claim about the system, and a claim in a string literal cannot be tested. Here the bridge is a required field in the output schema, its presence is checked by a validator, and the validator is itself tested against output with the bridge removed. The claim can fail, visibly.
- **Separation of concerns.** The prompt, its output contract and its validators change together and are reviewed together. The application loads the file; it does not own the wording.

Any change to the prompt, schema or validators bumps `prompt_version` and adds a `change_log` entry.

## The four layers

The system prompt is assembled from four layers, in the order declared in `assembly.layer_order`. Each layer is an array of lines, joined with newlines; the layers are joined with a blank line. The questionnaire never enters the system prompt: it goes in the user message, inside `<questionnaire>` tags, so student text is always treated as data.

| Layer | Failure mode it prevents |
| --- | --- |
| `layer_1_identity` | The model chatting, counselling, or choosing which consultant a student should see. It fixes the model's job as producing one roadmap object and nothing else. |
| `layer_2_african_context` | Advice built for other labour markets: plans that assume a visa, a credit card, an unpaid internship, reliable power, or a graduate recruitment pipeline. It also stops invented programmes and URLs. |
| `layer_3_output_contract` | Output the application cannot parse or store: prose around the JSON, missing fields, a vector in the wrong order, or a bridge left empty. |
| `layer_4_guardrails` | Harm: guaranteed outcomes, invented numbers, named individuals, deficit framing, inferences from sensitive traits, and career advice given to a student in crisis. These rules override every other layer. |

## Division of labour: the model proposes, the database matches

The model decides **direction**: a sector, a five-axis interest vector, a phased plan, and the questions the student should bring to a practitioner. It never decides **which person**. The database function `surface_bridge_consultants()` takes the sector and vector and ranks approved consultants in that sector by cosine similarity.

This split makes matching auditable. The same vector always produces the same ranking, so any match can be reproduced and explained from stored data without calling the model again. It also means a model cannot invent a consultant, favour one, or describe one inaccurately, because it never names one.

## The vector

Five axes, each scored from 0 to 1:

| Index | Axis | Description |
| --- | --- | --- |
| 0 | `investigative_technical` | Builds, debugs, reasons about systems |
| 1 | `conventional_analytical` | Structure, numbers, models, compliance |
| 2 | `enterprising_commercial` | Persuades, negotiates, owns commercial risk |
| 3 | `artistic_expressive` | Narrative, visual, sonic or performed work |
| 4 | `social_facilitative` | Teaches, mentors, coordinates, cares |

This is Holland's (1997) RIASEC model with Realistic and Investigative merged into one technical axis. In these labour markets, hands-on and analytical technical work are largely the same roles, so keeping both would add a near-duplicate dimension and inflate the similarity between every pair of technical profiles.

Consultants are scored on the same five axes when they are approved, which is what makes comparing the two vectors meaningful. The dimension must stay 5 to match `real[5]` in `schema.sql`, and the validator checks that it does.

The vector is not normalised to sum to 1. Cosine similarity ignores magnitude anyway, and leaving each axis independent lets the model say a student is strong on two axes at once.

## Two layers of validation

1. **The output schema** (JSON Schema, draft 2020-12, `additionalProperties: false` throughout) checks shape: exactly three phases in a fixed order, a five-number vector, three to five bridge questions, no undeclared fields, no empty prose.
2. **The post-schema validators** check what a schema cannot express: no URLs at any depth, every resource on the verified allow-list, the bridge sector matching the roadmap sector, the bridge present, and a vector with a non-zero norm. A heuristic name check flags possible named individuals for human review, rather than rejecting, because pattern-based name detection produces false positives. If any rejecting check fails, the roadmap is regenerated once with the failed check names appended; a second failure is stored as `schema_valid = false` and shown to the student as a handled error.

The refusal envelope (`wellbeing_referral` or `out_of_scope`) is a separate schema, not a branch of the roadmap schema, so the application dispatches on `status` and validation errors stay readable.

## What the validator proves

`validate_prompt.py` runs four steps:

1. Assembles the prompt and checks each layer still contains its load-bearing text, such as "Never emit a URL" and "wellbeing_referral". Those strings are listed in the script rather than in the JSON, so one careless edit cannot remove a guardrail and its check together.
2. Validates the two fixtures against their schemas, and checks that a roadmap is not accepted as a refusal, or a refusal as a roadmap.
3. Runs every post-schema validator on the known-good roadmap and confirms each one accepts it.
4. Breaks the known-good roadmap **one thing at a time** and confirms the right check rejects each break: five breaks for the validators, and seven that the schema itself must reject.

Step 4 is the one that matters. A validator that never rejects anything would pass steps 1 to 3 as well; only feeding in known-bad output shows that each check catches what it claims to.

## The model

`model.model_id` is `claude-opus-4-0`, the exact ID for Claude Opus 4, at temperature 0.3. That model is deprecated by Anthropic, with no retirement date announced yet.

Newer models (Claude Opus 4.7 onward) do not accept a `temperature` parameter, so moving to one means replacing the temperature-based approach to stable output, not just changing the ID. For a study that runs over months, decide this before data collection starts, and bump `prompt_version` when the model changes.
