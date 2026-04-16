from typing import Any

from pydantic import BaseModel, Field


class InteractionBase(BaseModel):
    hcp_id: str = Field(default="", alias="hcpId")
    hcp_name: str = Field(default="", alias="hcpName")
    interaction_type: str = Field(default="Meeting", alias="interactionType")
    interaction_date: str = Field(default="", alias="interactionDate")
    interaction_time: str = Field(default="", alias="interactionTime")
    attendees: str = ""
    topics_discussed: str = Field(default="", alias="topicsDiscussed")
    materials_shared: list[str] = Field(default_factory=list, alias="materialsShared")
    samples_distributed: list[str] = Field(default_factory=list, alias="samplesDistributed")
    sentiment: str = "Neutral"
    outcomes: str = ""
    follow_up_actions: str = Field(default="", alias="followUpActions")
    ai_suggested_follow_ups: list[str] = Field(default_factory=list, alias="aiSuggestedFollowUps")
    channel: str = "In-person"
    summary: str = ""

    model_config = {
        "populate_by_name": True
    }


class InteractionCreate(InteractionBase):
    pass


class InteractionUpdate(BaseModel):
    interaction_id: int = Field(alias="interactionId")
    field_name: str = Field(alias="fieldName")
    new_value: Any = Field(alias="newValue")

    model_config = {
        "populate_by_name": True
    }


class InteractionResponse(BaseModel):
    id: int
    hcp_name: str
    sentiment: str
    summary: str


class AgentChatRequest(BaseModel):
    message: str
    draft: InteractionBase


class AgentChatResponse(BaseModel):
    message: str
    draft_updates: dict[str, Any] = Field(default_factory=dict, alias="draftUpdates")

    model_config = {
        "populate_by_name": True
    }


class HcpProfile(BaseModel):
    id: str
    name: str
    specialty: str
    territory: str
    preferred_channel: str
