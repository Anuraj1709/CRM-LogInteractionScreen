from fastapi import APIRouter, HTTPException

from app.agents.hcp_interaction_agent import edit_interaction, log_interaction, run_hcp_interaction_agent
from app.schemas.interaction import (
    AgentChatRequest,
    AgentChatResponse,
    ComplianceRequest,
    HcpProfile,
    InteractionCreate,
    InteractionResponse,
    InteractionUpdate,
    RecommendationRequest,
    SearchHcpProfileRequest,
    SummaryRequest,
)
from app.services.hcp_directory import list_hcps
from app.services.interaction_store import store
from app.agents.hcp_interaction_agent import (
    check_content_compliance,
    recommend_next_best_action,
    search_hcp_profile,
    summarize_interaction_notes,
)

router = APIRouter()


@router.get("/hcps", response_model=list[HcpProfile])
def get_hcps() -> list[HcpProfile]:
    return list_hcps()


@router.post("/interactions", response_model=InteractionResponse)
def create_interaction(payload: InteractionCreate) -> InteractionResponse:
    return InteractionResponse.model_validate(
        log_interaction.invoke({"interaction_payload": payload.model_dump(by_alias=True)})
    )


@router.get("/interactions")
def get_interactions() -> list[dict]:
    return list(store.list_all())


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


@router.post("/tools/search-hcp-profile")
def demo_search_hcp_profile(payload: SearchHcpProfileRequest) -> dict:
    return search_hcp_profile.invoke({"hcp_name": payload.hcp_name})


@router.post("/tools/recommend-next-best-action")
def demo_recommend_next_best_action(payload: RecommendationRequest) -> dict:
    return recommend_next_best_action.invoke(
        {
            "specialty": payload.specialty,
            "sentiment": payload.sentiment,
            "open_questions": payload.open_questions,
        }
    )


@router.post("/tools/check-content-compliance")
def demo_check_content_compliance(payload: ComplianceRequest) -> dict:
    return check_content_compliance.invoke(
        {
            "topics_discussed": payload.topics_discussed,
            "materials_shared": payload.materials_shared,
        }
    )


@router.post("/tools/summarize-interaction-notes")
def demo_summarize_interaction_notes(payload: SummaryRequest) -> dict:
    return summarize_interaction_notes.invoke({"notes": payload.notes})
