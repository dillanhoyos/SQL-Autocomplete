from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import asyncio
import time
from app.services.mistral_service import mistral_service
import logging

router = APIRouter(tags=["autocomplete"])
logger = logging.getLogger("sql_autocomplete.routes.autocomplete")


class Message(BaseModel):
    role: str
    content: str
    

class AutocompleteRequest(BaseModel):
    userInput: str
    conversationHistory: List[Message] = []
    schemaDescription: str
    requestId: str


class QueryOption(BaseModel):
    prompt: str
    sqlQuery: str


class AutocompleteResponse(BaseModel):
    queryOptions: List[QueryOption]
    metadata: Dict[str, Any]


@router.post("/autocomplete")
async def autocomplete(request: AutocompleteRequest):
    """
    Generate SQL autocomplete suggestions using Mistral AI.
    """
    start_time = time.time()
    
    try:
        # Convert conversation history to dict format
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]
        
        # Generate suggestions using Mistral AI
        suggestions = mistral_service.generate_sql_suggestions(
            user_input=request.userInput,
            schema_description=request.schemaDescription,
            conversation_history=conversation_history
        )
        
        # Convert to QueryOption objects
        query_options = [
            QueryOption(prompt=s["prompt"], sqlQuery=s["sqlQuery"])
            for s in suggestions
        ]
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        response = AutocompleteResponse(
            queryOptions=query_options,
            metadata={
                "latency_ms": latency_ms,
                "model": "codestral-latest",
                "requestId": request.requestId
            }
        )
        
        return response
        
    except Exception as e:
        # Log error and return fallback
        print(f"Autocomplete error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate suggestions: {str(e)}"
        )


@router.post("/autocomplete-stream")
async def autocomplete_stream(request: AutocompleteRequest):
    """
    Stream SQL autocomplete suggestions using SSE.
    """
    start_time = time.time()
    
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in request.conversationHistory
    ]

    suggestion_generator = mistral_service.generate_sql_suggestions_stream(
        user_input=request.userInput,
        schema_description=request.schemaDescription,
        conversation_history=conversation_history
    )

    async def event_generator():
        suggestion_count = 0
        time_to_first_suggestion = None
        
        try:
            async for suggestion in suggestion_generator:
                if suggestion_count == 0:
                    time_to_first_suggestion = int((time.time() - start_time) * 1000)
                
                suggestion_count += 1
                data = {
                    "prompt": suggestion.get("prompt"),
                    "sqlQuery": suggestion.get("sqlQuery")
                }
                yield f"data: {json.dumps(data)}\n\n"
        except Exception as e:
            logger.error(f"Streaming generator error: {e}", exc_info=True)
            data = {"error": "An error occurred during streaming."}
            yield f"data: {json.dumps(data)}\n\n"
        finally:
            latency_ms = int((time.time() - start_time) * 1000)
            metadata = {
                "latency_ms": latency_ms,
                "time_to_first_suggestion_ms": time_to_first_suggestion,
                "model": "codestral-latest",
                "requestId": request.requestId,
                "suggestions_count": suggestion_count
            }
            done_data = {"done": True, "metadata": metadata}
            yield f"data: {json.dumps(done_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/cancel")
async def cancel_request(request_id: str):
    """
    Cancel an in-flight autocomplete request.
    TODO: Implement request cancellation logic
    """
    return {"status": "cancelled", "requestId": request_id}

