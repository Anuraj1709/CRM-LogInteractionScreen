from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import END, StateGraph

from app.core.config import settings
from app.schemas.interaction import AgentChatResponse, InteractionBase, InteractionCreate
from app.services.hcp_directory import find_hcp_by_name, list_hcps
from app.services.interaction_store import store

try:
    from langchain_groq import ChatGroq
except ImportError:  # pragma: no cover
    ChatGroq = None


class AgentState(TypedDict):
    message: str
    draft: dict[str, Any]
    tool_outputs: dict[str, Any]
    response: AgentChatResponse | None


@tool
def search_hcp_profile(hcp_name: str) -> dict[str, Any]:
    """Return specialty, territory, and preferred channel for a known HCP."""
    profile = find_hcp_by_name(hcp_name)
    if not profile:
        return {"found": False, "reason": "No exact HCP match in territory directory."}
    return {"found": True, "profile": profile.model_dump()}


@tool
def log_interaction(interaction_payload: dict[str, Any]) -> dict[str, Any]:
    """Capture a structured HCP interaction record after summarization and extraction."""
    payload = InteractionCreate.model_validate(interaction_payload)
    summary = payload.summary or (
        f"{payload.interaction_type} with {payload.hcp_name} covering {payload.topics_discussed[:120]}"
    ).strip()
    saved = store.create(payload, summary=summary)
    return saved.model_dump()


@tool
def edit_interaction(interaction_id: int, field_name: str, new_value: Any) -> dict[str, Any]:
    """Update a previously logged interaction field with an audit-friendly edit request."""
    updated = store.update(interaction_id, field_name, new_value)
    return {"status": "updated", "record": updated}


@tool
def recommend_next_best_action(specialty: str, sentiment: str, open_questions: str) -> dict[str, Any]:
    """Suggest next best action for the field representative after the HCP meeting."""
    recommendation = "Schedule a follow-up detailing session in 2 weeks."
    if specialty == "Oncology" and sentiment.lower() == "positive":
        recommendation = "Share congress survival data and propose a deeper clinical review."
    elif "access" in open_questions.lower():
        recommendation = "Route market access concern to account lead and return with reimbursement guidance."
    return {"recommendation": recommendation}


@tool
def check_content_compliance(topics_discussed: str, materials_shared: list[str]) -> dict[str, Any]:
    """Highlight possible medical-legal-regulatory review concerns before final save."""
    flagged_words = ["off-label", "unapproved", "guaranteed outcome"]
    flags = [word for word in flagged_words if word in topics_discussed.lower()]
    restricted_materials = [item for item in materials_shared if "draft" in item.lower()]
    return {
        "approved": not (flags or restricted_materials),
        "flags": flags,
        "restricted_materials": restricted_materials,
    }


@tool
def summarize_interaction_notes(notes: str) -> dict[str, Any]:
    """Summarize free-text notes into CRM-ready bullets for the interaction draft."""
    summary = notes.strip()
    if len(summary) > 220:
        summary = f"{summary[:217]}..."
    return {"summary": summary}


def _get_llm():
    api_key = settings.groq_api_key.strip()
    if (
        not api_key
        or api_key.startswith("replace-with")
        or ChatGroq is None
    ):
        return None

    return ChatGroq(
        api_key=api_key,
        model=settings.groq_model,
        temperature=0.2,
    )


def _extract_hcp(message: str) -> dict[str, str]:
    lower = message.lower()

    for hcp in list_hcps():
        full_name = hcp.name.lower()
        normalized_name = full_name.replace("dr. ", "")
        name_parts = normalized_name.split()

        aliases = {
            full_name,
            normalized_name,
            f"dr {normalized_name}",
            f"dr. {normalized_name}",
            f"dr {name_parts[0]}",
            f"dr. {name_parts[0]}",
            name_parts[0],
        }

        if len(name_parts) > 1:
            aliases.add(" ".join(name_parts))
            aliases.add(name_parts[-1])

        if any(alias in lower for alias in aliases):
            return {"hcpName": hcp.name, "hcpId": hcp.id}

    free_text_match = re.search(r"\bdr\.?\s+([a-z]+(?:\s+[a-z]+)?)\b", lower)
    if free_text_match:
        stop_words = {
            "and",
            "at",
            "for",
            "from",
            "in",
            "met",
            "of",
            "on",
            "regarding",
            "regards",
            "the",
            "to",
            "was",
            "with",
            "discussed",
            "discussing",
            "shared",
        }
        name_parts = [
            part for part in free_text_match.group(1).split()
            if part not in stop_words
        ]
        if name_parts:
            formatted_name = " ".join(part.capitalize() for part in name_parts)
            return {"hcpName": f"Dr. {formatted_name}", "hcpId": ""}

    return {}


def _extract_date(message: str) -> str | None:
    lower = message.lower()
    today = date.today()
    current_year = today.year

    relative_days = {
        "today": 0,
        "yesterday": -1,
        "tomorrow": 1,
    }

    for keyword, offset in relative_days.items():
        if re.search(rf"\b{keyword}\b", lower):
            return (today + timedelta(days=offset)).isoformat()

    months = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }

    month_pattern = "|".join(months.keys())
    named_match = re.search(
        rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({month_pattern})(?:\s+(\d{{4}}))?\b",
        lower,
    )
    if named_match:
        day = int(named_match.group(1))
        month = months[named_match.group(2)]
        year = int(named_match.group(3) or current_year)
        return f"{year:04d}-{month:02d}-{day:02d}"

    slash_match = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", lower)
    if slash_match:
        day = int(slash_match.group(1))
        month = int(slash_match.group(2))
        year_token = slash_match.group(3)
        year = current_year
        if year_token:
            year = int(year_token)
            if year < 100:
                year += 2000
        return f"{year:04d}-{month:02d}-{day:02d}"

    return None


def _extract_time(message: str) -> str | None:
    lower = message.lower()
    time_match = re.search(r"\b(\d{1,2}):(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b", lower)
    if not time_match:
        return None

    if time_match.group(1):
        hour = int(time_match.group(1))
        minute = int(time_match.group(2))
        meridiem = time_match.group(3)
    else:
        hour = int(time_match.group(4))
        minute = 0
        meridiem = time_match.group(5)

    if meridiem == "pm" and hour != 12:
        hour += 12
    if meridiem == "am" and hour == 12:
        hour = 0

    if hour > 23 or minute > 59:
        return None

    return f"{hour:02d}:{minute:02d}"


def _extract_draft_updates(message: str, draft: dict[str, Any]) -> dict[str, Any]:
    lower = message.lower()
    updates: dict[str, Any] = {}

    updates.update(_extract_hcp(message))

    extracted_date = _extract_date(message)
    if extracted_date:
        updates["interactionDate"] = extracted_date

    extracted_time = _extract_time(message)
    if extracted_time:
        updates["interactionTime"] = extracted_time

    if "positive" in lower:
        updates["sentiment"] = "Positive"
    elif "negative" in lower:
        updates["sentiment"] = "Negative"
    elif "neutral" in lower:
        updates["sentiment"] = "Neutral"

    if "brochure" in lower:
        updates["materialsShared"] = sorted(set(draft.get("materialsShared", []) + ["Clinical brochure"]))

    if "sample" in lower:
        updates["samplesDistributed"] = sorted(set(draft.get("samplesDistributed", []) + ["Starter pack"]))

    updates["topicsDiscussed"] = message
    updates["summary"] = message[:240]

    if "follow-up" in lower or "follow up" in lower:
        updates["followUpActions"] = message

    return updates


def _assistant_reply(message: str, draft: dict[str, Any], tool_outputs: dict[str, Any]) -> AgentChatResponse:
    llm = _get_llm()
    profile_context = tool_outputs.get("profile")
    compliance = tool_outputs.get("compliance", {})
    action = tool_outputs.get("next_best_action", {})
    summary = tool_outputs.get("summary", {})
    draft_updates = _extract_draft_updates(message, draft)

    if llm is None:
        compliance_note = (
            "No immediate compliance concerns detected."
            if compliance.get("approved", True)
            else f"Compliance review needed for: {', '.join(compliance.get('flags', []))}."
        )
        reply = (
            f"I captured the interaction and updated the draft fields. {compliance_note} "
            f"Suggested next step: {action.get('recommendation', 'Schedule a scientific follow-up.')} "
            f"Summary: {summary.get('summary', draft_updates.get('summary', 'Interaction noted.'))}"
        )
        if profile_context:
            reply = f"{reply} HCP profile confirmed for {profile_context['profile']['specialty']}."
        return AgentChatResponse(message=reply, draftUpdates=draft_updates)

    system_prompt = (
        "You are an AI-first CRM assistant for life science field representatives. "
        "Turn user notes into a compliant HCP interaction draft, stay concise, and mention only clinically appropriate follow-ups."
    )
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(
            content=(
                f"User message: {message}\n"
                f"Current draft: {draft}\n"
                f"Tool outputs: {tool_outputs}\n"
                "Return a short assistant message only."
            )
        ),
    ]
    try:
        llm_response = llm.invoke(messages)
        text = llm_response.content if isinstance(llm_response, AIMessage) else str(llm_response.content)
        return AgentChatResponse(message=text, draftUpdates=draft_updates)
    except Exception:
        fallback_reply = (
            f"I captured the interaction and updated the draft fields. "
            f"Suggested next step: {action.get('recommendation', 'Schedule a scientific follow-up.')} "
            f"Summary: {summary.get('summary', draft_updates.get('summary', 'Interaction noted.'))}"
        )
        return AgentChatResponse(message=fallback_reply, draftUpdates=draft_updates)


def _tooling_node(state: AgentState) -> AgentState:
    draft = state["draft"]
    notes = state["message"]
    profile = search_hcp_profile.invoke({"hcp_name": draft.get("hcpName", "")}) if draft.get("hcpName") else {}
    compliance = check_content_compliance.invoke(
        {
            "topics_discussed": draft.get("topicsDiscussed") or notes,
            "materials_shared": draft.get("materialsShared", []),
        }
    )
    next_best_action = recommend_next_best_action.invoke(
        {
            "specialty": profile.get("profile", {}).get("specialty", "General Medicine"),
            "sentiment": draft.get("sentiment", "Neutral"),
            "open_questions": notes,
        }
    )
    summary = summarize_interaction_notes.invoke({"notes": notes})

    state["tool_outputs"] = {
        "profile": profile,
        "compliance": compliance,
        "next_best_action": next_best_action,
        "summary": summary,
    }
    return state


def _response_node(state: AgentState) -> AgentState:
    state["response"] = _assistant_reply(
        state["message"], state["draft"], state["tool_outputs"]
    )
    return state


def build_agent_graph():
    graph = StateGraph(AgentState)
    graph.add_node("tooling", _tooling_node)
    graph.add_node("respond", _response_node)
    graph.set_entry_point("tooling")
    graph.add_edge("tooling", "respond")
    graph.add_edge("respond", END)
    return graph.compile()


agent_graph = build_agent_graph()


def run_hcp_interaction_agent(message: str, draft: InteractionBase) -> AgentChatResponse:
    result = agent_graph.invoke(
        {
            "message": message,
            "draft": draft.model_dump(by_alias=True),
            "tool_outputs": {},
            "response": None,
        }
    )
    return result["response"]
