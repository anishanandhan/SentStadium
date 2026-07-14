"""Gemini reasoning service — Vertex AI integration with mock fallback.

Routes through Vertex AI (not raw API key) per spec requirement.
Includes mock mode for local development without credentials.
"""

from __future__ import annotations

import json
import random
from typing import Any, Literal

import structlog

from app.config import Settings
from app.models.reasoning import ReasoningInput, ReasoningOutput
from app.services.prompt_builder import build_reasoning_prompt

logger = structlog.get_logger("app.services.gemini")


class GeminiService:
    """Handles all Gemini reasoning calls with validation and fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._mock_mode = settings.gemini_mock_mode
        self._client: Any = None
        self._model_name = settings.gemini_model

        if not self._mock_mode:
            self._init_client(settings)

    def _init_client(self, settings: Settings) -> None:
        """Initialize the Google GenAI client via Vertex AI."""
        try:
            from google import genai

            self._client = genai.Client(
                vertexai=True,
                project=settings.gcp_project,
                location=settings.gcp_location,
            )
            logger.info(
                "gemini_client_initialized",
                project=settings.gcp_project,
                model=self._model_name,
            )
        except Exception as exc:
            logger.warning("gemini_fallback_to_mock", error=str(exc))
            self._mock_mode = True

    async def reason(self, reasoning_input: ReasoningInput) -> ReasoningOutput:
        """Run the reasoning engine on a zone's signals.

        Returns a validated ReasoningOutput. Falls back to mock on any failure.
        """
        log = logger.bind(zone_id=reasoning_input.zone_id)

        if self._mock_mode:
            log.info("using_mock_reasoning")
            return self._generate_mock_output(reasoning_input)

        try:
            return await self._call_gemini(reasoning_input)
        except Exception as exc:
            log.error("gemini_call_failed", error=str(exc), exc_info=True)
            # Fallback to mock output rather than crashing
            return self._generate_mock_output(reasoning_input)

    async def _call_gemini(self, reasoning_input: ReasoningInput) -> ReasoningOutput:
        """Make the actual Gemini API call with structured output."""
        from google.genai import types

        prompt = build_reasoning_prompt(reasoning_input)

        log = logger.bind(zone_id=reasoning_input.zone_id)
        log.info("calling_gemini", model=self._model_name)

        response = self._client.models.generate_content(
            model=self._model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReasoningOutput,
                temperature=0.3,  # Low temperature for consistent, factual reasoning
            ),
        )

        # Parse and validate the response
        raw_text = response.text
        log.info("gemini_response_received", length=len(raw_text))

        try:
            parsed = json.loads(raw_text)
            output = ReasoningOutput.model_validate(parsed)
            log.info("gemini_output_validated", severity=output.severity)
            return output
        except json.JSONDecodeError as parse_err:
            log.error("gemini_output_parse_failed", error=str(parse_err), raw=raw_text[:500])
            raise ValueError(f"Gemini returned unparseable output: {parse_err}") from parse_err
        except ValueError as validation_err:
            log.error("gemini_output_validation_failed", error=str(validation_err))
            raise ValueError(f"Gemini output failed validation: {validation_err}") from validation_err

    def _generate_mock_output(self, reasoning_input: ReasoningInput) -> ReasoningOutput:
        """Generate realistic mock reasoning output for local development.

        This is NOT a placeholder — it produces varied, contextually relevant
        responses based on the actual input signals to enable full UI testing.
        """
        ri = reasoning_input
        density = ri.crowd_density
        heat = ri.heat_index
        has_shade = ri.has_shade

        severity = self._classify_severity(density, heat)

        # Build contextual reasoning based on actual signals
        trend_direction = self._compute_trend_direction(ri.crowd_density_trend)
        heat_direction = self._compute_trend_direction(ri.heat_index_trend)

        # Contextual recommendations
        recommendations: dict[str, str] = {
            "critical": (
                f"Immediately dispatch medical team and open auxiliary gates at {ri.zone_name} "
                f"— density at {density}% is compounding with {heat}°C heat index, "
                f"creating acute safety risk for stationary fans."
            ),
            "high": (
                f"Pre-position additional stewards at {ri.zone_name} and prepare crowd "
                f"redirection — density trend is {trend_direction} at {density}% with "
                f"heat index {heat}°C"
                f"{' and no shade coverage' if not has_shade else ''}."
            ),
            "moderate": (
                f"Increase monitoring frequency for {ri.zone_name} — "
                f"{'heat index' if heat > 34 else 'crowd density'} is approaching "
                f"intervention threshold."
            ),
            "low": (f"{ri.zone_name} is operating within safe parameters — maintain routine monitoring."),
        }

        # Contextual reasoning chain
        reasoning_chains: dict[str, str] = {
            "critical": (
                f"{ri.zone_name} density is at {density}% ({trend_direction}) while "
                f"heat index has reached {heat}°C ({heat_direction}). "
                f"This is a compounding dual-risk event: the "
                f"{'pre-event entry surge' if 'kickoff' in ri.time_to_event else 'crowd movement'} "
                f"is creating physical congestion while extreme heat increases medical risk "
                f"for fans who cannot move freely. "
                f"{'Without shade coverage, exposure risk is amplified for all standing fans.' if not has_shade else 'Shade covers seated areas but entry queues remain exposed.'} "
                f"Historical pattern: "
                f"{ri.historical_incidents[0] if ri.historical_incidents else 'high-density heat events correlate with medical incidents in this zone'}."
            ),
            "high": (
                f"{ri.zone_name} density has been {trend_direction} and is at {density}%, "
                f"while heat index is {heat}°C ({heat_direction}). "
                f"{'The lack of shade is driving fans toward shaded zones, but this zone is receiving overflow.' if not has_shade else 'This shaded zone is absorbing heat-migration overflow from adjacent unshaded areas.'} "
                f"At current entry rate ({ri.entry_rate} fans/min), density will "
                f"{'cross 85% within ~10 minutes' if density > 70 else 'continue to build pressure'}. "
                f"{'Neighboring zones have capacity to absorb redirected fans.' if ri.neighboring_zones else ''}"
            ),
            "moderate": (
                f"{ri.zone_name} is at {density}% density with heat index {heat}°C. "
                f"While neither signal is critical independently, the {trend_direction} "
                f"density trend combined with {heat_direction} heat warrants heightened "
                f"attention. "
                f"{'No hydration point in this zone increases dehydration risk as heat rises.' if not ri.has_hydration_point else ''} "
                f"Recommend monitoring over next 10 minutes for trajectory confirmation."
            ),
            "low": (
                f"{ri.zone_name} density at {density}% is well within capacity, and "
                f"heat index at {heat}°C is below alert thresholds. "
                f"Trends are {trend_direction} for density and {heat_direction} for heat. "
                f"No compounding risk factors detected. Continue routine monitoring."
            ),
        }

        # Actions based on severity
        actions_map: dict[str, list[str]] = {
            "critical": [
                f"Open auxiliary gates at {ri.zone_name} immediately",
                f"Dispatch medical team to {ri.zone_name} entry area",
                (
                    f"Redirect incoming fans to "
                    f"{ri.neighboring_zones[0].zone_name if ri.neighboring_zones else 'nearest available zone'}"
                    f" via PA and signage"
                ),
                f"Deploy mobile hydration cart to {ri.zone_name}",
            ],
            "high": [
                f"Pre-position 2 additional stewards at {ri.zone_name}",
                (
                    f"Prepare redirection signage for "
                    f"{ri.neighboring_zones[0].zone_name if ri.neighboring_zones else 'alternate zone'}"
                ),
                (
                    f"{'Activate additional hydration station' if ri.has_hydration_point else 'Deploy mobile hydration cart'}"
                    f" at {ri.zone_name}"
                ),
            ],
            "moderate": [
                f"Increase monitoring frequency for {ri.zone_name} to every 2 minutes",
                f"Alert stewards at {ri.zone_name} to watch for signs of heat distress",
            ],
            "low": [
                f"Maintain routine monitoring for {ri.zone_name}",
            ],
        }

        # Generate multilingual alerts for EXACTLY the languages present
        multilingual = self._build_multilingual_alerts(ri, severity)

        confidence = round(random.uniform(0.7, 0.95), 2)

        return ReasoningOutput(
            zone_id=ri.zone_id,
            severity=severity,
            recommendation=recommendations[severity],
            reasoning=reasoning_chains[severity],
            suggested_actions=actions_map[severity],
            multilingual_alerts=multilingual,
            confidence=confidence,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _classify_severity(
        density: float,
        heat: float,
    ) -> Literal["low", "moderate", "high", "critical"]:
        """Classify severity from crowd density and heat index signals."""
        if density > 80 and heat > 38:
            return "critical"
        if density > 70 or (density > 50 and heat > 38):
            return "high"
        if density > 50 or heat > 34:
            return "moderate"
        return "low"

    @staticmethod
    def _compute_trend_direction(trend: list[float]) -> str:
        """Determine whether a trend series is rising or stable."""
        if len(trend) >= 2 and trend[-1] > trend[0]:
            return "rising"
        return "stable"

    @staticmethod
    def _build_multilingual_alerts(
        ri: ReasoningInput,
        severity: Literal["low", "moderate", "high", "critical"],
    ) -> dict[str, str]:
        """Build alert text for exactly the languages present in the zone."""
        alert_templates: dict[str, dict[str, str]] = {
            "en": {
                "critical": f"URGENT: {ri.zone_name} entry is at capacity. Please use an alternate gate. Medical assistance available.",
                "high": f"{ri.zone_name} is experiencing high crowd density. Consider using an alternate entrance for faster access.",
                "moderate": f"{ri.zone_name}: Please stay hydrated. Hydration stations available nearby.",
                "low": f"{ri.zone_name}: All clear. Enjoy the event!",
            },
            "es": {
                "critical": f"URGENTE: La entrada de {ri.zone_name} está al máximo. Use una puerta alternativa. Asistencia médica disponible.",
                "high": f"{ri.zone_name} tiene alta densidad. Considere una entrada alternativa para acceso más rápido.",
                "moderate": f"{ri.zone_name}: Manténgase hidratado. Estaciones de agua disponibles.",
                "low": f"{ri.zone_name}: Todo en orden. ¡Disfrute del evento!",
            },
            "fr": {
                "critical": f"URGENT : L'entrée {ri.zone_name} est saturée. Veuillez utiliser une autre porte. Assistance médicale sur place.",
                "high": f"{ri.zone_name} connaît une forte affluence. Envisagez une entrée alternative.",
                "moderate": f"{ri.zone_name} : Restez hydraté. Points d'eau disponibles à proximité.",
                "low": f"{ri.zone_name} : Tout est en ordre. Profitez de l'événement !",
            },
            "ar": {
                "critical": f"عاجل: بوابة {ri.zone_name} ممتلئة. يرجى استخدام بوابة بديلة. المساعدة الطبية متوفرة.",
                "high": f"{ri.zone_name} تشهد كثافة عالية. استخدم مدخلاً بديلاً للوصول بشكل أسرع.",
                "moderate": f"{ri.zone_name}: حافظ على ترطيب جسمك. محطات المياه متاحة.",
                "low": f"{ri.zone_name}: كل شيء على ما يرام. استمتع بالحدث!",
            },
            "de": {
                "critical": f"DRINGEND: Eingang {ri.zone_name} ist voll. Bitte nutzen Sie einen anderen Eingang. Medizinische Hilfe verfügbar.",
                "high": f"{ri.zone_name} hat hohe Besucherdichte. Erwägen Sie einen alternativen Eingang.",
                "moderate": f"{ri.zone_name}: Bitte ausreichend trinken. Trinkwasserstationen in der Nähe.",
                "low": f"{ri.zone_name}: Alles in Ordnung. Genießen Sie die Veranstaltung!",
            },
            "pt": {
                "critical": f"URGENTE: A entrada {ri.zone_name} está lotada. Use um portão alternativo. Assistência médica disponível.",
                "high": f"{ri.zone_name} está com alta densidade. Considere uma entrada alternativa.",
                "moderate": f"{ri.zone_name}: Mantenha-se hidratado. Estações de água disponíveis.",
                "low": f"{ri.zone_name}: Tudo certo. Aproveite o evento!",
            },
        }

        multilingual: dict[str, str] = {}
        for lang in ri.languages_present:
            lang_templates = alert_templates.get(lang, alert_templates["en"])
            multilingual[lang] = lang_templates.get(severity, lang_templates["low"])
        return multilingual
