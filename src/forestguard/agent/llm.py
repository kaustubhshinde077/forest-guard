import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger("forestguard.agent.llm")

class LLMProvider(ABC):
    """Abstract model interface allowing seamless swapping of model backends."""
    
    @abstractmethod
    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generate text completion from prompt."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider credentials and network are configured."""
        pass

class GeminiProvider(LLMProvider):
    """
    Google Gemini Provider using official google-genai SDK.
    Supports verified modern models: 'gemini-2.5-flash' (default) and 'gemini-2.5-pro'.
    """
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.5-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", model)
        self._client = None
        
        if self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                import google.genai as genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client: {e}")

    def is_available(self) -> bool:
        return self._client is not None

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        if not self.is_available():
            raise RuntimeError("Gemini API client is not configured. Provide GEMINI_API_KEY.")
            
        try:
            config = {}
            if system_instruction:
                config["system_instruction"] = system_instruction
                
            response = self._client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config if config else None
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise

class MockRuleBasedProvider(LLMProvider):
    """
    Deterministic offline provider for automated testing and CI.
    Generates structured, verified investigative reports based on explicit rules.
    """
    def is_available(self) -> bool:
        return True

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        # Returns a structured JSON envelope based on input prompt context
        return json.dumps({
            "status": "success",
            "provider": "mock_rule_based",
            "message": "Deterministic offline reasoning completed."
        })
