#!/usr/bin/env python3
"""
Validate the discovery prompt specification (prompts/discovery.json).

Needs no API key and makes no network call, so the contract can be checked
independently of model availability and any reviewer can reproduce the result:

    pip install -r prompts/requirements.txt
    python prompts/validate_prompt.py

Four steps, each printing PASS/FAIL lines. Exits 1 on any unexpected result.

  1. Assemble the system prompt and check that every layer still carries its
     load-bearing guardrail text.
  2. Validate the fixtures against the output and refusal schemas.
  3. Run the post-schema validators against the known-good roadmap.
  4. Break the known-good roadmap one thing at a time and check that the right
     validator, or the schema itself, rejects each break.
"""

from __future__ import annotations

import copy
import json
import re
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator
    from jsonschema.exceptions import best_match
except ImportError:
    print("jsonschema is not installed. Run: pip install -r prompts/requirements.txt")
    sys.exit(2)

# Windows consoles default to a legacy code page; never crash on a character.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parent
SPEC_PATH = HERE / "discovery.json"
FIXTURES = HERE / "fixtures"
SCHEMA_SQL = HERE.parent / "schema.sql"

# Literal strings each layer must keep. They live here, in code, rather than in
# discovery.json, so a careless edit to the JSON cannot delete a guardrail and
# its check in the same stroke.
REQUIRED_LITERALS = {
    "layer_1_identity": ["surface_bridge_consultants", "not name"],
    "layer_2_african_context": ["informal", "Never emit a URL"],
    "layer_3_output_contract": ["exactly one JSON object", "never optional"],
    "layer_4_guardrails": ["No guaranteed outcomes", "wellbeing_referral", "out_of_scope"],
}
EXPECTED_LAYERS = list(REQUIRED_LITERALS)
VECTOR_DIMENSION = 5  # must match real[5] in schema.sql


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------

class Report:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0

    def check(self, ok: bool, label: str, detail: str = "") -> bool:
        if ok:
            self.passed += 1
            print(f"  PASS  {label}")
        else:
            self.failed += 1
            print(f"  FAIL  {label}")
        if detail:
            print(f"        {detail}")
        return ok

    @staticmethod
    def info(label: str) -> None:
        print(f"  INFO  {label}")


def heading(text: str) -> None:
    print(f"\n{text}")


# --------------------------------------------------------------------------
# Inputs
# --------------------------------------------------------------------------

def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_catalogue() -> set[str]:
    """Resource names from the verified_resources seed in schema.sql.

    Reading the seed directly means the prompt allow-list and the database
    allow-list cannot drift apart.
    """
    sql = SCHEMA_SQL.read_text(encoding="utf-8")
    block = re.search(
        r"-- BEGIN verified_resources seed(.*?)-- END verified_resources seed", sql, re.S
    )
    if not block:
        raise SystemExit("Could not find the verified_resources seed markers in schema.sql")
    names = re.findall(r"^\s*\('((?:[^']|'')+)'", block.group(1), re.M)
    return {n.replace("''", "'") for n in names}


def assemble_system_prompt(spec: dict) -> str:
    assembly = spec["assembly"]
    layers = spec["system_prompt"]
    return assembly["layer_separator"].join(
        assembly["line_separator"].join(layers[name]) for name in assembly["layer_order"]
    )


# --------------------------------------------------------------------------
# Post-schema validators. Each returns a list of problems; empty means pass.
# --------------------------------------------------------------------------

URL_RE = re.compile(
    r"https?://"
    r"|\bwww\."
    r"|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*"
    r"\.(?:com|org|net|io|co|ng|ke|za|gh|rw|ug|tz|africa|dev|app|gov|edu)\b",
    re.IGNORECASE,
)

# Advisory only: a role word or contact phrase followed by a capitalised name,
# or an honorific followed by a name.
NAME_RE = re.compile(
    r"(?i:\b(?:consultant|mentor|recruiter|hiring manager|speak (?:to|with)|"
    r"talk (?:to|with)|reach out to|contact))\s+"
    r"(?:(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z'-]+)?"
    r"|\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+"
)


def walk_strings(node, path: str = "$"):
    """Yield (json_path, string) for every string at any depth."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, dict):
        for key, value in node.items():
            yield from walk_strings(value, f"{path}.{key}")
    elif isinstance(node, list):
        for i, value in enumerate(node):
            yield from walk_strings(value, f"{path}[{i}]")


def v_no_urls(out: dict, catalogue: set[str]) -> list[str]:
    return [
        f"{path}: {m.group(0)!r}"
        for path, text in walk_strings(out)
        for m in [URL_RE.search(text)]
        if m
    ]


def v_resources_in_catalogue(out: dict, catalogue: set[str]) -> list[str]:
    return [
        f"$.resources[{i}].resource_name: {r.get('resource_name')!r} is not in the verified catalogue"
        for i, r in enumerate(out.get("resources") or [])
        if r.get("resource_name") not in catalogue
    ]


def v_bridge_sector_agrees(out: dict, catalogue: set[str]) -> list[str]:
    bridge = out.get("bridge") or {}
    top, inner = out.get("consultant_sector"), bridge.get("consultant_sector")
    return [] if top == inner else [f"bridge sector {inner!r} differs from roadmap sector {top!r}"]


def v_bridge_present(out: dict, catalogue: set[str]) -> list[str]:
    bridge = out.get("bridge")
    if not isinstance(bridge, dict):
        return ["bridge is missing"]
    if not bridge.get("questions"):
        return ["bridge.questions is empty"]
    return []


def v_vector_not_degenerate(out: dict, catalogue: set[str]) -> list[str]:
    vector = out.get("student_vector")
    if not isinstance(vector, list) or len(vector) != VECTOR_DIMENSION:
        return [f"student_vector must have {VECTOR_DIMENSION} elements"]
    if not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in vector):
        return ["student_vector has a non-numeric element"]
    if sum(x * x for x in vector) == 0:
        return ["student_vector is all zeros; cosine similarity is undefined"]
    return []


def v_no_named_individuals(out: dict, catalogue: set[str]) -> list[str]:
    return [
        f"{path}: {m.group(0)!r}"
        for path, text in walk_strings(out)
        for m in [NAME_RE.search(text)]
        if m
    ]


REJECT_VALIDATORS = {
    "no_urls": v_no_urls,
    "resources_in_catalogue": v_resources_in_catalogue,
    "bridge_sector_agrees": v_bridge_sector_agrees,
    "bridge_present": v_bridge_present,
    "vector_not_degenerate": v_vector_not_degenerate,
}
ADVISORY_VALIDATORS = {"no_named_individuals": v_no_named_individuals}


def failing_validators(out: dict, catalogue: set[str]) -> dict[str, list[str]]:
    results = {name: fn(out, catalogue) for name, fn in REJECT_VALIDATORS.items()}
    return {name: problems for name, problems in results.items() if problems}


def schema_error(validator: Draft202012Validator, instance) -> str | None:
    error = best_match(validator.iter_errors(instance))
    if error is None:
        return None
    where = "/".join(str(p) for p in error.absolute_path) or "(root)"
    # Array-size errors otherwise echo the whole array; say what was wrong instead.
    readable = {
        "maxItems": lambda: f"has {len(error.instance)} items, maximum is {error.validator_value}",
        "minItems": lambda: f"has {len(error.instance)} items, minimum is {error.validator_value}",
        "items": lambda: f"has {len(error.instance)} items; no items allowed beyond the 3 declared phases",
    }
    message = readable[error.validator]() if error.validator in readable else error.message
    return f"at {where}: {message[:110]}"


# --------------------------------------------------------------------------
# Steps
# --------------------------------------------------------------------------

def step_1_assembly(spec: dict, report: Report) -> None:
    heading("Step 1  Assemble the system prompt")
    layers = spec.get("system_prompt", {})
    order = spec.get("assembly", {}).get("layer_order", [])

    report.check(
        order == EXPECTED_LAYERS and all(name in layers for name in EXPECTED_LAYERS),
        "all four layers exist, in the declared order",
        "" if order == EXPECTED_LAYERS else f"layer_order is {order}",
    )

    prompt = assemble_system_prompt(spec)
    report.check(len(prompt) > 2000, f"assembled prompt exceeds 2000 characters ({len(prompt)})")

    for name, literals in REQUIRED_LITERALS.items():
        text = "\n".join(layers.get(name, []))
        missing = [lit for lit in literals if lit not in text]
        report.check(
            not missing,
            f"{name} keeps its load-bearing text: {', '.join(repr(l) for l in literals)}",
            f"missing: {missing}" if missing else "",
        )

    words = len(prompt.split())
    Report.info(f"{len(prompt)} characters, {words} words, ~{round(len(prompt) / 4)} tokens "
                "(approximate: characters / 4)")

    space = spec.get("vector_space", {})
    axes = space.get("axes", [])
    report.check(
        space.get("dimension") == VECTOR_DIMENSION
        and len(axes) == VECTOR_DIMENSION
        and [a.get("index") for a in axes] == list(range(VECTOR_DIMENSION)),
        f"vector space has dimension {VECTOR_DIMENSION} with axes indexed 0-{VECTOR_DIMENSION - 1}",
    )
    vector_schema = spec["output_schema"]["properties"]["student_vector"]
    report.check(
        vector_schema.get("minItems") == vector_schema.get("maxItems") == VECTOR_DIMENSION,
        f"output_schema.student_vector requires exactly {VECTOR_DIMENSION} numbers",
    )

    template = spec["user_message_template"]
    declared = set(template["variables"])
    for variable in template["variables"].values():
        declared.update(variable.get("item_fields", []))
    used = {m for m in re.findall(r"{{\s*([a-z_]+)\s*}}", template["template"])}
    used |= {m for m in re.findall(r"{{#each\s+([a-z_]+)\s*}}", template["template"])}
    undeclared = sorted(used - declared)
    report.check(not undeclared, "every placeholder in the user message template is declared",
                 f"undeclared: {undeclared}" if undeclared else "")


def step_2_schemas(spec: dict, roadmap: dict, refusal: dict,
                   roadmap_v: Draft202012Validator, refusal_v: Draft202012Validator,
                   report: Report) -> None:
    heading("Step 2  Validate the fixtures against the schemas")
    for name in ("output_schema", "refusal_schema"):
        try:
            Draft202012Validator.check_schema(spec[name])
            report.check(True, f"{name} is itself a valid draft 2020-12 schema")
        except Exception as exc:  # SchemaError
            report.check(False, f"{name} is itself a valid draft 2020-12 schema", str(exc)[:200])

    err = schema_error(roadmap_v, roadmap)
    report.check(err is None, "valid_roadmap.json conforms to output_schema", err or "")
    err = schema_error(refusal_v, refusal)
    report.check(err is None, "valid_refusal.json conforms to refusal_schema", err or "")
    report.check(not refusal_v.is_valid(roadmap), "a roadmap is NOT accepted as a refusal")
    report.check(not roadmap_v.is_valid(refusal), "a refusal is NOT accepted as a roadmap")


def step_3_validators(spec: dict, roadmap: dict, catalogue: set[str], report: Report) -> None:
    heading("Step 3  Post-schema validators on the known-good roadmap")
    report.check(len(catalogue) == 12, f"catalogue loaded from schema.sql seed ({len(catalogue)} names)")

    declared = {v["id"]: v["on_failure"] for v in spec["post_schema_validation"]}
    report.check(len(declared) == 7, f"discovery.json declares 7 post-schema validators ({len(declared)})")
    rejecting = {name for name, action in declared.items() if action == "reject"}
    report.check(
        rejecting == set(REJECT_VALIDATORS),
        "every 'reject' validator in discovery.json has an implementation here, and vice versa",
        "" if rejecting == set(REJECT_VALIDATORS)
        else f"spec: {sorted(rejecting)} / code: {sorted(REJECT_VALIDATORS)}",
    )

    for name, fn in REJECT_VALIDATORS.items():
        problems = fn(roadmap, catalogue)
        report.check(not problems, f"{name} accepts the known-good roadmap",
                     "; ".join(problems) if problems else "")
    flags = v_no_named_individuals(roadmap, catalogue)
    report.check(not flags, "no_named_individuals raises no flag on the known-good roadmap",
                 "; ".join(flags) if flags else "")


def step_4_mutations(roadmap: dict, catalogue: set[str], roadmap_v: Draft202012Validator,
                     report: Report) -> None:
    # Why this step matters: a validator that never rejects anything would pass
    # steps 1-3 as well. Only by feeding in known-bad output, one defect at a
    # time, can we show each check actually catches what it claims to.
    heading("Step 4a  Break one thing at a time: the right validator must fire")

    def set_path(obj, path, value):
        for key in path[:-1]:
            obj = obj[key]
        obj[path[-1]] = value

    validator_cases = [
        ("bridge.questions emptied", "bridge_present",
         lambda r: set_path(r, ["bridge", "questions"], [])),
        ("URL injected into an action", "no_urls",
         lambda r: set_path(r, ["phases", 1, "actions", 0, "action"],
                            r["phases"][1]["actions"][0]["action"] + " Start at https://example.com/apply.")),
        ("off-catalogue resource name", "resources_in_catalogue",
         lambda r: set_path(r, ["resources", 0, "resource_name"], "Pan-African Fintech Fellowship")),
        ("bridge sector disagrees with roadmap sector", "bridge_sector_agrees",
         lambda r: set_path(r, ["bridge", "consultant_sector"], "Finance")),
        ("all-zero student vector", "vector_not_degenerate",
         lambda r: set_path(r, ["student_vector"], [0, 0, 0, 0, 0])),
    ]
    for label, expected, mutate in validator_cases:
        broken = copy.deepcopy(roadmap)
        mutate(broken)
        fired = failing_validators(broken, catalogue)
        report.check(
            expected in fired,
            f"{label:<45} -> {expected}",
            f"fired: {sorted(fired) or 'none'}" if expected not in fired else "",
        )

    heading("Step 4b  Schema-level breaks: output_schema itself must reject")

    def add_fourth_phase(r):
        r["phases"].append(copy.deepcopy(r["phases"][2]))

    def drop_bridge(r):
        del r["bridge"]

    def add_salary(r):
        r["predicted_salary_usd"] = 1200

    schema_cases = [
        ("4-element student_vector", lambda r: r["student_vector"].pop()),
        ("a 4th phase", add_fourth_phase),
        ("sector outside the enum", lambda r: set_path(r, ["consultant_sector"], "Healthcare")),
        ("bridge removed", drop_bridge),
        ("undeclared field predicted_salary_usd", add_salary),
        ("skill current_level of 7", lambda r: set_path(r, ["skill_gaps", 0, "current_level"], 7)),
        ("only 2 bridge questions", lambda r: set_path(r, ["bridge", "questions"],
                                                       r["bridge"]["questions"][:2])),
    ]
    for label, mutate in schema_cases:
        broken = copy.deepcopy(roadmap)
        mutate(broken)
        err = schema_error(roadmap_v, broken)
        report.check(err is not None, f"{label:<45} -> rejected", err or "accepted, but should not be")

    heading("Step 4c  Advisory check (reported, not asserted)")
    broken = copy.deepcopy(roadmap)
    broken["rationale"] += " Book a session with consultant Amara Okafor, who mentors backend engineers."
    flags = v_no_named_individuals(broken, catalogue)
    if flags:
        Report.info(f"no_named_individuals flagged for review: {flags[0]}")
    else:
        Report.info("no_named_individuals did not flag the injected name (heuristic miss)")


def main() -> int:
    spec = load_json(SPEC_PATH)
    roadmap = load_json(FIXTURES / "valid_roadmap.json")
    refusal = load_json(FIXTURES / "valid_refusal.json")
    catalogue = load_catalogue()
    roadmap_v = Draft202012Validator(spec["output_schema"])
    refusal_v = Draft202012Validator(spec["refusal_schema"])
    report = Report()

    print(f"Validating {spec.get('prompt_id')} {spec.get('prompt_version')} "
          f"(model {spec.get('model', {}).get('model_id')})")

    step_1_assembly(spec, report)
    step_2_schemas(spec, roadmap, refusal, roadmap_v, refusal_v, report)
    step_3_validators(spec, roadmap, catalogue, report)
    step_4_mutations(roadmap, catalogue, roadmap_v, report)

    print(f"\n{report.passed} passed, {report.failed} failed")
    if report.failed:
        print("PROMPT SPECIFICATION INVALID")
        return 1
    print("PROMPT SPECIFICATION VALID")
    return 0


if __name__ == "__main__":
    sys.exit(main())
