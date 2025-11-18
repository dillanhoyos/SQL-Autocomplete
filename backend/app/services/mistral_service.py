import json
from typing import List, Dict, Any, AsyncGenerator
from mistralai import Mistral
from app.config import settings
import logging

logger = logging.getLogger("sql_autocomplete.services.mistral")

class MistralService:
    """A simplified service for interacting with the Mistral AI API using the chat endpoint."""
    
    def __init__(self):
        self.client = Mistral(api_key=settings.mistral_api_key)
        self.model = "codestral-latest"
        
    async def generate_sql_suggestions(
        self,
        user_input: str,
        schema_description: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> List[Dict[str, str]]:
        """
        Generates SQL suggestions using a simple prompt and JSON output format.
        """
        
        # Optimized system prompt for speed and conciseness
        system_prompt = f"""Your critically important task is to generate a JSON object with 2 to 3 DIFFERENT SQL query suggestions.
- The first suggestion should be the most direct and likely completion.
- The second suggestion should be a creative alternative (e.g., using a different aggregation or filter).
- The third suggestion (if applicable) should be a more complex variation.

The JSON must have a "suggestions" key, containing an array of 2 to 3 objects. Never provide only one suggestion in the array.
Each object must have "prompt" and "sqlQuery" keys.
Keep the "prompt" value concise and the "sqlQuery" valid.

Schema:
---
{schema_description}
---
"""
        
        # Add conversation history to the prompt if available
        history_context = ""
        if conversation_history:
            history_context = "Conversation history (for context):\n"
            for msg in conversation_history[-2:]: # last 2 messages
                history_context += f"{msg['role']}: {msg['content']}\n"

        user_prompt = f"User input: \"{user_input}\"\n{history_context}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            logger.info(f"Requesting suggestions for input: '{user_input}'")
            response = await self.client.chat.complete_async(
                model=self.model,
                messages=messages,
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            logger.debug(f"Received from Mistral API: {content}")
            
            data = json.loads(content)
            
            suggestions = data.get("suggestions", [])
            
            valid_suggestions = [
                s for s in suggestions 
                if isinstance(s, dict) and "prompt" in s and "sqlQuery" in s
            ]
            
            logger.info(f"Successfully parsed {len(valid_suggestions)} suggestions.")
            return valid_suggestions[:3]
            
        except Exception as e:
            logger.error(f"Mistral API error or parsing failed: {e}", exc_info=True)
            return [
                {
                    "prompt": f"{user_input} (error)",
                    "sqlQuery": f"-- Error generating suggestion: Review logs."
                }
            ]

    async def generate_sql_suggestions_stream(
        self,
        user_input: str,
        schema_description: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, str], None]:
        
        system_prompt = f"""Your critically important task is to generate 2 to 3 DIFFERENT SQL query suggestions. You MUST provide at least two. Never provide only one.
- The first suggestion should be the most direct and likely completion.
- The second suggestion should be a creative alternative (e.g., using a different aggregation or filter).
- The third suggestion (if applicable) should be a more complex variation.

Each suggestion must be a valid JSON object on its own line.
Each JSON object must have "prompt" and "sqlQuery" keys.
Do not write any other text.

Schema:
---
{schema_description}
---
"""
        history_context = ""
        if conversation_history:
            history_context = "Conversation history (for context):\n"
            for msg in conversation_history[-2:]:
                history_context += f"{msg['role']}: {msg['content']}\n"

        user_prompt = f"User input: \"{user_input}\"\n{history_context}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            logger.info(f"Requesting streaming suggestions for input: '{user_input}'")
            
            buffer = ""
            suggestion_count = 0
            async for chunk in await self.client.chat.stream_async(
                model=self.model,
                messages=messages,
                temperature=0.2
            ):
                if suggestion_count >= 3:
                    break

                content = chunk.data.choices[0].delta.content
                if content:
                    buffer += content
                    while '\n' in buffer:
                        if suggestion_count >= 3:
                            break
                        line, buffer = buffer.split('\n', 1)
                        
                        # Clean up markdown formatting
                        clean_line = line.strip()
                        if clean_line.startswith("```"):
                            continue
                        if not clean_line:
                            continue
                            
                        if clean_line:
                            try:
                                suggestion = json.loads(clean_line)
                                if isinstance(suggestion, dict) and "prompt" in suggestion and "sqlQuery" in suggestion:
                                    yield suggestion
                                    suggestion_count += 1
                            except json.JSONDecodeError:
                                # Only log if it looks like data but failed (ignore simple braces)
                                if len(clean_line) > 5 and clean_line not in ["{", "}", "[", "]"]:
                                    logger.warning(f"Failed to decode streaming JSON line: {clean_line}")
        except Exception as e:
            logger.error(f"Mistral API streaming error: {e}", exc_info=True)
            yield {
                "prompt": f"{user_input} (error)",
                "sqlQuery": f"-- Error during streaming. Review logs."
            }


# Global instance
mistral_service = MistralService()
