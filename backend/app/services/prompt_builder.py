"""Prompt builder for the Gemini reasoning engine.

Constructs structured prompts with:
- System instructions emphasizing multi-signal correlation reasoning
- Input data as structured JSON
- Output format instructions with schema
- Few-shot examples with VARIABLE language keys (per addendum requirement)
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.reasoning import ReasoningInput

SYSTEM_INSTRUCTIONS = """You are StadiumPulse's AI reasoning engine — a safety-critical system for stadium control rooms during live events.

Your job is NOT to translate data into text. Your job is to REASON across multiple independent signals and infer compounding, time-shifted interactions that no single signal reveals alone.

You receive structured data about a specific stadium zone: crowd density (current + trend), heat index (current + trend), entry rate, shade/hydration availability, neighboring zone states, and historical incident patterns.

Your task:
1. CORRELATE these signals — identify causal chains (e.g., rising heat → shade-seeking migration → density spike in shaded zones within 5-10 minutes)
2. INFER what will happen next based on the trend direction and historical patterns — not just what is happening now
3. OUTPUT a graded severity assessment with a plain-English recommendation and explicit reasoning chain
4. GENERATE multilingual alert text for EXACTLY the languages listed in the input's languages_present field — no more, no fewer

Critical rules:
- Your reasoning must reference at least TWO different signals and explain how they interact
- Do not just restate thresholds ("density is 82%"). Explain WHY it matters in context ("density is 82% AND rising at 3%/min because heat index crossed shade-seeking threshold 6 minutes ago — Zone C has no shade, so fans are migrating to this zone")
- Suggested actions must be specific to the zone (reference zone names, not generic "open more gates")
- Confidence should reflect data quality: lower if trends are short or noisy, higher if pattern is clear and matches historical precedent
- Output ONLY the JSON object, no markdown, no explanation outside the JSON"""


FEW_SHOT_EXAMPLES = [
    # Example 1: Heat-driven migration (en + es)
    {
        "input": {
            "zone_id": "zone-d",
            "zone_name": "Gate D — West Wing",
            "crowd_density": 72.0,
            "crowd_density_trend": [55.0, 58.0, 61.0, 64.0, 67.0, 70.0, 72.0],
            "heat_index": 39.5,
            "heat_index_trend": [37.0, 37.8, 38.5, 39.0, 39.2, 39.4, 39.5],
            "entry_rate": 35.0,
            "capacity": 7000,
            "current_occupancy": 5040,
            "has_shade": True,
            "has_hydration_point": True,
            "languages_present": ["en", "es"],
            "time_to_event": "15 min to kickoff",
            "neighboring_zones": [
                {
                    "zone_id": "zone-c",
                    "zone_name": "Gate C — South Stand",
                    "crowd_density": 45.0,
                    "heat_index": 40.1,
                    "has_shade": False,
                    "has_hydration_point": False,
                    "entry_rate": 12.0,
                },
                {
                    "zone_id": "zone-e",
                    "zone_name": "Gate E — VIP Concourse",
                    "crowd_density": 30.0,
                    "heat_index": 32.0,
                    "has_shade": True,
                    "has_hydration_point": True,
                    "entry_rate": 5.0,
                },
            ],
            "historical_incidents": [
                "Receives overflow from Zone C during heat events",
                "Shade availability makes this a natural refuge — plan for surge capacity",
            ],
        },
        "output": {
            "zone_id": "zone-d",
            "severity": "high",
            "recommendation": "Pre-position 2 additional stewards at Gate D and prepare to redirect incoming fans to Gate E — Zone D density is compounding from heat-driven migration and will exceed 85% within 8 minutes at current rate.",
            "reasoning": "Zone D density has risen from 55% to 72% over the last 15 minutes (+17 points), while Zone C density dropped from 60% to 45% over the same period. This matches Zone D's historical pattern of absorbing overflow from Zone C during heat events — Zone C's heat index is 40.1°C with no shade, driving fans toward Zone D's shaded area. With 15 minutes to kickoff, entry rate will accelerate further. Zone E (30% density, shaded, air-conditioned) has capacity to absorb redirected fans.",
            "suggested_actions": [
                "Redirect incoming fans from Gate C corridor to Gate E via concourse signage",
                "Pre-position 2 additional stewards at Gate D entry",
                "Activate additional hydration station at Gate D overflow area",
            ],
            "multilingual_alerts": {
                "en": "Gate D is experiencing high crowd density due to heat conditions. Please proceed to Gate E for faster entry. Hydration stations available at Gate E.",
                "es": "La Puerta D tiene alta densidad de público debido al calor. Diríjase a la Puerta E para un ingreso más rápido. Estaciones de hidratación disponibles en la Puerta E.",
            },
            "confidence": 0.87,
        },
    },
    # Example 2: Concurrent heat + entry bottleneck (en + ar + fr)
    {
        "input": {
            "zone_id": "zone-a",
            "zone_name": "Gate A — North Stand",
            "crowd_density": 88.0,
            "crowd_density_trend": [70.0, 74.0, 78.0, 82.0, 85.0, 87.0, 88.0],
            "heat_index": 41.0,
            "heat_index_trend": [38.0, 38.5, 39.2, 39.8, 40.3, 40.7, 41.0],
            "entry_rate": 48.0,
            "capacity": 8000,
            "current_occupancy": 7040,
            "has_shade": True,
            "has_hydration_point": True,
            "languages_present": ["en", "ar", "fr"],
            "time_to_event": "5 min to kickoff",
            "neighboring_zones": [
                {
                    "zone_id": "zone-b",
                    "zone_name": "Gate B — East Wing",
                    "crowd_density": 60.0,
                    "heat_index": 41.5,
                    "has_shade": False,
                    "has_hydration_point": True,
                    "entry_rate": 20.0,
                },
                {
                    "zone_id": "zone-f",
                    "zone_name": "Gate F — Family Section",
                    "crowd_density": 55.0,
                    "heat_index": 38.0,
                    "has_shade": True,
                    "has_hydration_point": True,
                    "entry_rate": 15.0,
                },
            ],
            "historical_incidents": [
                "Shade-seeking spike observed when heat index exceeds 35°C",
                "Entry bottleneck during pre-match rush (T-30 min)",
            ],
        },
        "output": {
            "zone_id": "zone-a",
            "severity": "critical",
            "recommendation": "Immediately open auxiliary Gate A-2 and dispatch medical team — density is at 88% with 41°C heat index at kickoff, compounding entry bottleneck with heat-exposure risk for stationary fans.",
            "reasoning": "Zone A density has climbed 18 points in 15 minutes (70% → 88%) while heat index crossed 40°C. This is a dual-risk compounding event: (1) the pre-kickoff entry surge (48 fans/min, highest across all zones) is creating a bottleneck — matching the historical T-30 entry bottleneck pattern, now compressed into T-5; (2) heat at 41°C means fans waiting in the entry queue face dangerous heat exposure even though this zone has shade — the shade covers seated areas, not the entry queue. Gate F (55% density, 38°C, shaded, family section) can absorb redirected fans but at a slower entry rate. Zone B has lower density but no shade and higher heat (41.5°C), making it unsuitable for redirection.",
            "suggested_actions": [
                "Open auxiliary Gate A-2 immediately to double entry throughput",
                "Dispatch medical team to Gate A entry queue — stationary fans in 41°C heat",
                "Redirect late-arriving fans to Gate F via PA announcement and digital signage",
                "Deploy mobile hydration cart to Gate A queue line",
            ],
            "multilingual_alerts": {
                "en": "URGENT: Gate A entry is at capacity. If you are arriving now, please use Gate F for faster entry. Medical assistance available at Gate A.",
                "ar": "عاجل: بوابة A ممتلئة. إذا كنت تصل الآن، يرجى استخدام بوابة F للدخول بشكل أسرع. المساعدة الطبية متوفرة عند بوابة A.",
                "fr": "URGENT : L'entrée Porte A est saturée. Si vous arrivez maintenant, veuillez utiliser la Porte F pour un accès plus rapide. Assistance médicale disponible à la Porte A.",
            },
            "confidence": 0.94,
        },
    },
    # Example 3: Low-risk monitoring state (en + de)
    {
        "input": {
            "zone_id": "zone-f",
            "zone_name": "Gate F — Family Section",
            "crowd_density": 35.0,
            "crowd_density_trend": [30.0, 31.0, 32.0, 33.0, 34.0, 34.5, 35.0],
            "heat_index": 33.0,
            "heat_index_trend": [32.0, 32.2, 32.5, 32.7, 32.8, 33.0, 33.0],
            "entry_rate": 12.0,
            "capacity": 5000,
            "current_occupancy": 1750,
            "has_shade": True,
            "has_hydration_point": True,
            "languages_present": ["en", "de"],
            "time_to_event": "halftime",
            "neighboring_zones": [
                {
                    "zone_id": "zone-e",
                    "zone_name": "Gate E — VIP Concourse",
                    "crowd_density": 28.0,
                    "heat_index": 31.0,
                    "has_shade": True,
                    "has_hydration_point": True,
                    "entry_rate": 3.0,
                },
            ],
            "historical_incidents": [
                "Family section: slower evacuation pace, stroller congestion at gates",
                "Children more vulnerable to heat — lower threshold for medical alerts",
            ],
        },
        "output": {
            "zone_id": "zone-f",
            "severity": "low",
            "recommendation": "Zone F is operating within safe parameters — maintain monitoring with attention to heat trend as afternoon progresses.",
            "reasoning": "Crowd density is at 35% with a gradual upward trend (+5 points over 15 min), well within capacity. Heat index at 33°C is below the 35°C family-section alert threshold but trending upward slowly. This is a halftime period, so density may increase as families move to concessions and restrooms — the historical pattern shows stroller congestion at gates during these transitions. Current conditions do not require intervention but warrant continued monitoring, especially as heat index approaches the 35°C threshold where children become more vulnerable.",
            "suggested_actions": [
                "Monitor heat index — prepare for family-specific alerts if trend continues above 35°C",
                "Ensure stroller-accessible pathways remain clear during halftime transition",
            ],
            "multilingual_alerts": {
                "en": "Gate F — Family Section: All clear. Hydration stations and shaded seating available. Stay hydrated!",
                "de": "Tor F — Familienbereich: Alles in Ordnung. Trinkwasserstationen und schattige Sitzplätze verfügbar. Bleiben Sie hydriert!",
            },
            "confidence": 0.82,
        },
    },
]


def build_reasoning_prompt(reasoning_input: ReasoningInput) -> str:
    """Build the full prompt for the Gemini reasoning call.

    Returns a single string containing system instructions, input data,
    output format, and few-shot examples.
    """
    # Build few-shot section
    examples_text = ""
    for i, ex in enumerate(FEW_SHOT_EXAMPLES, 1):
        examples_text += f"\n--- Example {i} ---\nInput:\n{json.dumps(ex['input'], indent=2)}\n\nOutput:\n{json.dumps(ex['output'], indent=2)}\n"

    # Build the input data section
    input_data = reasoning_input.model_dump(mode="json")

    return f"""{SYSTEM_INSTRUCTIONS}

=== FEW-SHOT EXAMPLES ===
{examples_text}
=== END EXAMPLES ===

=== YOUR INPUT (analyze this) ===
{json.dumps(input_data, indent=2)}
=== END INPUT ===

Produce ONLY the JSON output object. The multilingual_alerts field must contain entries for EXACTLY these languages: {json.dumps(reasoning_input.languages_present)}. No other languages, no missing languages."""



def get_output_schema_dict() -> dict[str, object]:
    """Return the ReasoningOutput schema as a dict for Gemini's response_schema parameter."""
    from app.models.reasoning import ReasoningOutput

    return ReasoningOutput.model_json_schema()
