import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key

from app.models.schemas import SwarmExecuteRequest, SwarmExecuteResponse, SwarmAgentResult
from app.services.llm import create_llm_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/swarm", tags=["swarm"], dependencies=[Depends(verify_api_key)])

SWARM_SYSTEM_PROMPT = """You are an AI agent in a social media marketing swarm. 
Your role is: {role}
Your current action is: {action}

Brand context:
{brand_context}

Respond with a concise, actionable result for your specific role. 
Output JSON with keys: "result" (string describing what you produced), "details" (string with the actual content)."""


@router.post("/execute", response_model=SwarmExecuteResponse)
async def execute_swarm(request: SwarmExecuteRequest):
    try:
        mo = request.model_override
        llm = create_llm_provider(
            api_key=mo.api_key if mo else "",
            api_url=mo.api_url if mo else "",
            model=mo.model if mo else "",
            provider=mo.provider if mo else "",
        )
        brand_context = request.brand_context or ""
        if request.brand_memory:
            brand_context = "\n".join(request.brand_memory[:5])

        agent_results = []
        for agent in request.agents:
            try:
                prompt = SWARM_SYSTEM_PROMPT.format(
                    role=agent.role,
                    action=agent.action,
                    brand_context=brand_context,
                )
                messages = [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Task type: {request.task_type}\nPlatform: {request.platform or 'general'}\nExecute your role and produce output."},
                ]
                result = await llm.chat_json(messages=messages, temperature=0.7)
                agent_results.append(SwarmAgentResult(
                    agent_id=agent.agent_id,
                    role=agent.role,
                    status="completed",
                    result=result.get("result", str(result)),
                    details=result.get("details", ""),
                ))
            except Exception as e:
                logger.warning("Agent %s failed: %s", agent.role, e)
                agent_results.append(SwarmAgentResult(
                    agent_id=agent.agent_id,
                    role=agent.role,
                    status="failed",
                    result=f"Agent execution failed: {e}",
                    details="",
                ))

        return SwarmExecuteResponse(
            task_id=request.task_id,
            task_type=request.task_type,
            agent_count=len(agent_results),
            completed_count=sum(1 for a in agent_results if a.status == "completed"),
            agents=agent_results,
        )
    except Exception as e:
        logger.exception("Swarm execution failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
