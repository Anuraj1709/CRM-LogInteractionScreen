from collections.abc import Iterable

from app.schemas.interaction import InteractionCreate, InteractionResponse


class InMemoryInteractionStore:
    def __init__(self) -> None:
        self._records: list[dict] = []
        self._counter = 1

    def create(self, payload: InteractionCreate, summary: str = "") -> InteractionResponse:
        record = payload.model_dump(by_alias=False)
        record["id"] = self._counter
        record["summary"] = summary or payload.summary
        self._records.append(record)
        self._counter += 1
        return InteractionResponse(
            id=record["id"],
            hcp_name=record["hcp_name"],
            sentiment=record["sentiment"],
            summary=record["summary"],
        )

    def update(self, interaction_id: int, field_name: str, new_value: object) -> dict:
        for record in self._records:
            if record["id"] == interaction_id:
                record[field_name] = new_value
                return record
        raise ValueError(f"Interaction {interaction_id} was not found.")

    def list_all(self) -> Iterable[dict]:
        return self._records


store = InMemoryInteractionStore()
