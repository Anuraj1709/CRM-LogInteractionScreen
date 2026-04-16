from fastapi import APIRouter, HTTPException

from app.agents.hcp_interaction_agent import edit_interaction, log_interaction, run_hcp_interaction_agent
from app.schemas.interaction import (
    AgentChatRequest,
    AgentChatResponse,
    HcpProfile,
    InteractionCreate,
    InteractionResponse,
    InteractionUpdate,
)
from app.services.hcp_directory import list_hcps

router = APIRouter()


@router.get("/hcps", response_model=list[HcpProfile])
def get_hcps() -> list[HcpProfile]:
    return list_hcps()


@router.post("/interactions", response_model=InteractionResponse)
def create_interaction(payload: InteractionCreate) -> InteractionResponse:
    return InteractionResponse.model_validate(
        log_interaction.invoke({"interaction_payload": payload.model_dump(by_alias=True)})
    )


@router.put("/interactions/{interaction_id}")
def update_interaction(interaction_id: int, payload: InteractionUpdate) -> dict:
    if interaction_id != payload.interaction_id:
        raise HTTPException(status_code=400, detail="Path id does not match payload id.")
    return edit_interaction.invoke(
        {
            "interaction_id": payload.interaction_id,
            "field_name": payload.field_name,
            "new_value": payload.new_value,
        }
    )


@router.post("/agent/chat", response_model=AgentChatResponse)
def agent_chat(payload: AgentChatRequest) -> AgentChatResponse:
    return run_hcp_interaction_agent(payload.message, payload.draft)
