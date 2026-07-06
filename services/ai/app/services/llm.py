import json
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    pass


class LLMProvider:
    def __init__(
        self,
        api_key: str = "",
        api_url: str = "",
        model: str = "",
        fallback_model: str = "",
        max_retries: int = 3,
        timeout: int = 60,
    ):
        self.api_key = api_key or settings.llm_api_key
        self.api_url = api_url or settings.llm_api_url
        self.model = model or settings.llm_model
        self.fallback_model = fallback_model or settings.llm_fallback_model
        self.max_retries = max_retries or settings.llm_max_retries
        self.timeout = timeout or settings.llm_timeout

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        response_format: Optional[dict] = None,
    ) -> str:
        use_model = model or self.model
        body: dict = {
            "model": use_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            body["response_format"] = response_format

        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.api_url}/chat/completions",
                        headers=self._headers(),
                        json=body,
                    )
                    if response.status_code == 429:
                        logger.warning("Rate limited on attempt %d/%d", attempt + 1, self.max_retries)
                        continue
                    if response.status_code == 401:
                        raise LLMError("Invalid API key")
                    response.raise_for_status()
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
            except httpx.TimeoutException as e:
                last_error = e
                logger.warning("Timeout on attempt %d/%d", attempt + 1, self.max_retries)
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code in (500, 502, 503):
                    logger.warning("Server error on attempt %d/%d", attempt + 1, self.max_retries)
                    continue
                raise LLMError(f"HTTP {e.response.status_code}: {e.response.text}") from e
            except Exception as e:
                last_error = e
                raise LLMError(str(e)) from e

        if last_error:
            if self.fallback_model and use_model != self.fallback_model:
                logger.info("Falling back to model: %s", self.fallback_model)
                return await self.chat(
                    messages=messages,
                    model=self.fallback_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format,
                )
            raise LLMError(f"All retries exhausted: {last_error}")

        return ""

    async def chat_json(
        self,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
    ) -> dict:
        text = await self.chat(
            messages=messages,
            model=model,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise LLMError(f"Failed to parse JSON response: {e}") from e


class OpenAIProvider(LLMProvider):
    pass


class AnthropicProvider(LLMProvider):
    def __init__(self, **kwargs):
        kwargs.setdefault("api_url", "https://api.anthropic.com/v1")
        super().__init__(**kwargs)

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        response_format: Optional[dict] = None,
    ) -> str:
        use_model = model or self.model
        system_msg = ""
        filtered_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                filtered_messages.append(m)

        body: dict = {
            "model": use_model,
            "messages": filtered_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if system_msg:
            body["system"] = system_msg
        if response_format:
            body["metadata"] = {"user_id": "aismos"}

        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.api_url}/messages",
                        headers=self._headers(),
                        json=body,
                    )
                    if response.status_code == 429:
                        logger.warning("Rate limited on attempt %d/%d", attempt + 1, self.max_retries)
                        continue
                    if response.status_code == 401:
                        raise LLMError("Invalid API key")
                    response.raise_for_status()
                    data = response.json()
                    return data["content"][0]["text"]
            except httpx.TimeoutException as e:
                last_error = e
                logger.warning("Timeout on attempt %d/%d", attempt + 1, self.max_retries)
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code in (500, 502, 503):
                    logger.warning("Server error on attempt %d/%d", attempt + 1, self.max_retries)
                    continue
                raise LLMError(f"HTTP {e.response.status_code}: {e.response.text}") from e
            except Exception as e:
                last_error = e
                raise LLMError(str(e)) from e

        if last_error:
            if self.fallback_model and use_model != self.fallback_model:
                logger.info("Falling back to model: %s", self.fallback_model)
                return await self.chat(
                    messages=messages,
                    model=self.fallback_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format,
                )
            raise LLMError(f"All retries exhausted: {last_error}")

        return ""


class OpenRouterProvider(LLMProvider):
    def __init__(self, **kwargs):
        kwargs.setdefault("api_url", "https://openrouter.ai/api/v1")
        super().__init__(**kwargs)

    def _headers(self) -> dict[str, str]:
        h = super()._headers()
        h["HTTP-Referer"] = "https://github.com/kovixalabs/aismos"
        h["X-Title"] = "AISMOS"
        return h


class GoogleProvider(LLMProvider):
    def __init__(self, **kwargs):
        kwargs.setdefault("api_url", "https://generativelanguage.googleapis.com/v1beta")
        super().__init__(**kwargs)

    def _headers(self) -> dict[str, str]:
        return {"Content-Type": "application/json"}

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        response_format: Optional[dict] = None,
    ) -> str:
        use_model = model or self.model
        contents = []
        for m in messages:
            role = "user" if m["role"] in ("user", "system") else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})

        body: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        last_error: Optional[Exception] = None
        url = f"{self.api_url}/models/{use_model}:generateContent?key={self.api_key}"

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(url, headers=self._headers(), json=body)
                    if response.status_code == 429:
                        logger.warning("Rate limited on attempt %d/%d", attempt + 1, self.max_retries)
                        continue
                    response.raise_for_status()
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        return candidates[0]["content"]["parts"][0]["text"]
                    return ""
            except httpx.TimeoutException as e:
                last_error = e
                logger.warning("Timeout on attempt %d/%d", attempt + 1, self.max_retries)
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code in (500, 502, 503):
                    logger.warning("Server error on attempt %d/%d", attempt + 1, self.max_retries)
                    continue
                raise LLMError(f"HTTP {e.response.status_code}: {e.response.text}") from e
            except Exception as e:
                last_error = e
                raise LLMError(str(e)) from e

        if last_error:
            raise LLMError(f"All retries exhausted: {last_error}")


class CustomProvider(LLMProvider):
    pass


PROVIDER_MAP = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "openrouter": OpenRouterProvider,
    "google": GoogleProvider,
    "local": OpenAIProvider,
    "custom": CustomProvider,
}


def create_llm_provider(
    api_key: str = "",
    api_url: str = "",
    model: str = "",
    provider: str = "",
) -> LLMProvider:
    """Create an LLM provider, optionally overriding the defaults.

    Args:
        api_key: Override API key. Empty string means use env default.
        api_url: Override API base URL. Empty string means use env default.
        model: Override model name. Empty string means use env default.
        provider: Provider type (openai, anthropic, openrouter, google, local, custom).
                 Empty string means use env default.

    Returns:
        An LLMProvider subclass instance configured with the given overrides.
    """
    provider_class = PROVIDER_MAP.get(provider or settings.llm_provider, OpenAIProvider)
    kwargs: dict = {}
    if api_key:
        kwargs["api_key"] = api_key
    if api_url:
        kwargs["api_url"] = api_url
    if model:
        kwargs["model"] = model
    return provider_class(**kwargs)
