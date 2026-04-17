from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

from app.core.config import settings
from app.schemas.interaction import InteractionCreate, InteractionResponse


class PersistentInteractionStore:
    def __init__(self, storage_path: str) -> None:
        self._path = Path(storage_path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._records: list[dict] = []
        self._counter = 1
        self._load()

    def _load(self) -> None:
        if not self._path.exists():
            self._write()
            return

        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            raw = {}

        records = raw.get("records", []) if isinstance(raw, dict) else []
        self._records = records if isinstance(records, list) else []

        counter = raw.get("counter") if isinstance(raw, dict) else None
        if isinstance(counter, int) and counter > 0:
            self._counter = counter
            return

        self._counter = max((record.get("id", 0) for record in self._records), default=0) + 1

    def _write(self) -> None:
        payload = {
            "counter": self._counter,
            "records": self._records,
        }
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def create(self, payload: InteractionCreate, summary: str = "") -> InteractionResponse:
        record = payload.model_dump(by_alias=False)
        record["id"] = self._counter
        record["summary"] = summary or payload.summary
        self._records.append(record)
        self._counter += 1
        self._write()
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
                self._write()
                return record
        raise ValueError(f"Interaction {interaction_id} was not found.")

    def list_all(self) -> Iterable[dict]:
        return list(self._records)


store = PersistentInteractionStore(settings.interaction_store_path)
