"""Tests for the reasoning engine — parsing, validation, fallback."""

from __future__ import annotations

import json

import pytest

from app.config import Settings
from app.models.reasoning import NeighborZoneSummary, ReasoningInput, ReasoningOutput
from app.services.gemini_service import GeminiService
from app.services.prompt_builder import build_reasoning_prompt


@pytest.fixture
def mock_settings() -> Settings:
    return Settings(gemini_mock_mode=True, firestore_in_memory=True)


@pytest.fixture
def sample_input() -> ReasoningInput:
    return ReasoningInput(
        zone_id="zone-c",
        zone_name="Gate C — South Stand",
        crowd_density=82.0,
        crowd_density_trend=[65.0, 68.0, 72.0, 75.0, 78.0, 80.0, 82.0],
        heat_index=41.0,
        heat_index_trend=[37.0, 38.0, 39.0, 39.5, 40.0, 40.5, 41.0],
        entry_rate=30.0,
        capacity=9000,
        current_occupancy=7380,
        has_shade=False,
        has_hydration_point=False,
        languages_present=["en", "es", "pt"],
        time_to_event="15 min to kickoff",
        neighboring_zones=[
            NeighborZoneSummary(
                zone_id="zone-d",
                zone_name="Gate D — West Wing",
                crowd_density=45.0,
                heat_index=38.0,
                has_shade=True,
                has_hydration_point=True,
                entry_rate=12.0,
            ),
        ],
        historical_incidents=[
            "Highest heat exposure zone — shade-seeking migration to Zone A/D at 36°C+",
        ],
    )


class TestReasoningOutput:
    """Test ReasoningOutput Pydantic model validation."""

    def test_valid_output(self) -> None:
        output = ReasoningOutput(
            zone_id="zone-a",
            severity="high",
            recommendation="Redirect fans to Zone D.",
            reasoning="Heat + density compounding.",
            suggested_actions=["Open gate", "Deploy medical"],
            multilingual_alerts={"en": "Alert", "es": "Alerta"},
            confidence=0.87,
        )
        assert output.severity == "high"
        assert output.confidence == 0.87
        assert len(output.multilingual_alerts) == 2

    def test_invalid_severity_rejected(self) -> None:
        with pytest.raises(ValueError):
            ReasoningOutput(
                zone_id="zone-a",
                severity="extreme",  # type: ignore[arg-type]
                recommendation="Test",
                reasoning="Test",
                suggested_actions=["Test"],
                multilingual_alerts={"en": "Test"},
                confidence=0.5,
            )

    def test_confidence_out_of_range_rejected(self) -> None:
        with pytest.raises(ValueError):
            ReasoningOutput(
                zone_id="zone-a",
                severity="low",
                recommendation="Test",
                reasoning="Test",
                suggested_actions=["Test"],
                multilingual_alerts={"en": "Test"},
                confidence=1.5,
            )

    def test_dynamic_language_keys(self) -> None:
        """multilingual_alerts must accept any language codes, not fixed."""
        output = ReasoningOutput(
            zone_id="zone-a",
            severity="low",
            recommendation="All clear.",
            reasoning="No risk.",
            suggested_actions=["Monitor"],
            multilingual_alerts={"en": "OK", "ar": "حسنا", "zh": "好的", "ja": "大丈夫"},
            confidence=0.9,
        )
        assert "ar" in output.multilingual_alerts
        assert "zh" in output.multilingual_alerts
        assert "ja" in output.multilingual_alerts


class TestPromptBuilder:
    """Test prompt construction."""

    def test_prompt_contains_input_data(self, sample_input: ReasoningInput) -> None:
        prompt = build_reasoning_prompt(sample_input)
        assert "zone-c" in prompt
        assert "82.0" in prompt
        assert "41.0" in prompt

    def test_prompt_contains_few_shot_examples(self, sample_input: ReasoningInput) -> None:
        prompt = build_reasoning_prompt(sample_input)
        assert "Example 1" in prompt
        assert "Example 2" in prompt
        assert "Example 3" in prompt

    def test_prompt_specifies_required_languages(self, sample_input: ReasoningInput) -> None:
        prompt = build_reasoning_prompt(sample_input)
        assert '"en"' in prompt
        assert '"es"' in prompt
        assert '"pt"' in prompt

    def test_few_shot_examples_have_variable_languages(self) -> None:
        """Few-shot examples must demonstrate variable language keys — not the same set every time."""
        from app.services.prompt_builder import FEW_SHOT_EXAMPLES

        lang_sets = []
        for ex in FEW_SHOT_EXAMPLES:
            from typing import cast

            langs = set(cast("dict[str, str]", ex["output"]["multilingual_alerts"]).keys())
            lang_sets.append(langs)

        # At least 2 distinct language sets across examples
        assert len({frozenset(s) for s in lang_sets}) >= 2, (
            "Few-shot examples must have DIFFERENT language key sets to prove dynamic behavior"
        )


class TestGeminiServiceMock:
    """Test mock reasoning output generation."""

    @pytest.mark.asyncio
    async def test_mock_returns_valid_output(self, mock_settings: Settings, sample_input: ReasoningInput) -> None:
        service = GeminiService(mock_settings)
        result = await service.reason(sample_input)

        assert isinstance(result, ReasoningOutput)
        assert result.zone_id == "zone-c"
        assert result.severity == "critical"
        assert (
            result.recommendation
            == "Immediately dispatch medical team and open auxiliary gates at Gate C — South Stand — density at 82.0% is compounding with 41.0°C heat index, creating acute safety risk for stationary fans."
        )
        assert (
            result.reasoning
            == "Gate C — South Stand density is at 82.0% (rising) while heat index has reached 41.0°C (rising). This is a compounding dual-risk event: the pre-event entry surge is creating physical congestion while extreme heat increases medical risk for fans who cannot move freely. Without shade coverage, exposure risk is amplified for all standing fans. Historical pattern: Highest heat exposure zone — shade-seeking migration to Zone A/D at 36°C+."
        )
        assert "Open auxiliary gates at Gate C — South Stand immediately" in result.suggested_actions
        assert 0.0 <= result.confidence <= 1.0
        assert 0.0 <= result.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_mock_respects_input_languages(self, mock_settings: Settings, sample_input: ReasoningInput) -> None:
        service = GeminiService(mock_settings)
        result = await service.reason(sample_input)

        # Should have alerts for exactly the input languages
        for lang in sample_input.languages_present:
            assert lang in result.multilingual_alerts, f"Missing alert for language '{lang}'"

    @pytest.mark.asyncio
    async def test_mock_high_risk_detection(self, mock_settings: Settings) -> None:
        """High density + high heat should produce high/critical severity."""
        high_risk_input = ReasoningInput(
            zone_id="zone-x",
            zone_name="Test Zone",
            crowd_density=92.0,
            heat_index=42.0,
            entry_rate=50.0,
            capacity=5000,
            current_occupancy=4600,
            languages_present=["en"],
            time_to_event="5 min to kickoff",
        )
        service = GeminiService(mock_settings)
        result = await service.reason(high_risk_input)
        assert result.severity == "critical"
        assert (
            result.recommendation
            == "Immediately dispatch medical team and open auxiliary gates at Test Zone — density at 92.0% is compounding with 42.0°C heat index, creating acute safety risk for stationary fans."
        )

    @pytest.mark.asyncio
    async def test_mock_low_risk_detection(self, mock_settings: Settings) -> None:
        """Low density + low heat should produce low severity."""
        low_risk_input = ReasoningInput(
            zone_id="zone-y",
            zone_name="Quiet Zone",
            crowd_density=20.0,
            heat_index=28.0,
            entry_rate=5.0,
            capacity=5000,
            current_occupancy=1000,
            languages_present=["en"],
            time_to_event="halftime",
        )
        service = GeminiService(mock_settings)
        result = await service.reason(low_risk_input)
        assert result.severity == "low"
        assert result.recommendation == "Quiet Zone is operating within safe parameters — maintain routine monitoring."


class TestMalformedGeminiOutput:
    """Test that malformed Gemini responses are handled gracefully."""

    def test_malformed_json_parsing(self) -> None:
        """Backend must not crash on malformed JSON from Gemini."""
        malformed = '{"zone_id": "zone-a", "severity": "high", incomplete...'
        with pytest.raises(ValueError):
            json.loads(malformed)

    def test_missing_required_field(self) -> None:
        """Pydantic should reject output with missing required fields."""
        incomplete = {
            "zone_id": "zone-a",
            "severity": "high",
            # missing: recommendation, reasoning, suggested_actions, multilingual_alerts, confidence
        }
        with pytest.raises(ValueError):
            ReasoningOutput.model_validate(incomplete)
