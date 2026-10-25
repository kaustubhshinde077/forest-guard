#!/usr/bin/env python3
"""
Forest Guard — Live Research Verification Script
Tests genuine integration with Google Gemini and Tavily Search APIs when keys are configured.
Keeps credentials strictly isolated in .env (never committed to version control).
"""
import os
import sys
# Load local .env if present
env_file = os.path.join(os.path.dirname(__file__), "../.env")
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from forestguard.agent.llm import GeminiProvider
from forestguard.agent.tools import TavilySearchProvider
from forestguard.agent.investigator import AutonomousInvestigator

def test_live_research():
    print("=" * 65)
    print("Forest Guard: Live Research Integration Health Check")
    print("=" * 65)

    gemini_key = os.getenv("GEMINI_API_KEY")
    tavily_key = os.getenv("TAVILY_API_KEY")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    print(f"1. Environment Configuration:")
    print(f"   GEMINI_API_KEY: {'[CONFIGURED]' if gemini_key and gemini_key != 'your_gemini_api_key_here' else '[MISSING / UNCONFIGURED]'}")
    print(f"   GEMINI_MODEL:   {gemini_model}")
    print(f"   TAVILY_API_KEY: {'[CONFIGURED]' if tavily_key and tavily_key != 'your_tavily_api_key_here' else '[MISSING / UNCONFIGURED]'}")
    print("-" * 65)

    gemini = GeminiProvider(api_key=gemini_key, model=gemini_model)
    tavily = TavilySearchProvider(api_key=tavily_key)
    investigator = AutonomousInvestigator(llm_provider=gemini, search_provider=tavily)

    exec_mode = investigator.get_execution_mode()
    print(f"2. Active Investigation Engine Mode: {exec_mode.upper()}")

    if exec_mode == "offline_simulated":
        print("\n[NOTICE] Operating in OFFLINE SIMULATION mode.")
        print("Reason: Live API keys are not configured in your environment or .env file.")
        print("To enable genuine live research before the competition demonstration:")
        print("  1. Copy .env.example to .env:  cp .env.example .env")
        print("  2. Add your Google Gemini API key:   GEMINI_API_KEY=\"AIza...\"")
        print("  3. Add your Tavily Search API key:    TAVILY_API_KEY=\"tvly-...\"")
        print("  4. Re-run this verification script:")
        print("     PYTHONPATH=./src .venv/bin/python3 scripts/verify_live_research.py\n")
        return 0

    print("\n3. Testing Live Search Provider (Tavily)...")
    try:
        search_results = tavily.search("Western Ghats deforestation forest clearance notification 2023", max_results=2)
        print(f"   Success! Retrieved {len(search_results)} live search records.")
        for i, res in enumerate(search_results, 1):
            print(f"   Result #{i}: {res.get('title')} ({res.get('url')})")
    except Exception as e:
        print(f"   Live search query failed: {e}")
        return 1

    print("\n4. Testing Live LLM Provider (Google Gemini)...")
    try:
        response = gemini.generate(
            prompt="Summarize the importance of canopy cover in Maharashtra's Western Ghats.",
            system_instruction="You are an autonomous conservation research agent. Output a concise 2-sentence summary."
        )
        print(f"   Success! Live Gemini response received:\n   '{response.strip()}'")
    except Exception as e:
        print(f"   Live Gemini invocation failed: {e}")
        return 1

    print("\n" + "=" * 65)
    print("HEALTH CHECK PASSED: Live Gemini & Tavily research engine is verified!")
    print("=" * 65)
    return 0

if __name__ == "__main__":
    sys.exit(test_live_research())
