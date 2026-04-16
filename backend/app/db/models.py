from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Interaction(Base):
    __tablename__ = "hcp_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hcp_id: Mapped[str] = mapped_column(String(64), index=True)
    hcp_name: Mapped[str] = mapped_column(String(255), index=True)
    interaction_type: Mapped[str] = mapped_column(String(128))
    interaction_date: Mapped[str] = mapped_column(String(32))
    interaction_time: Mapped[str] = mapped_column(String(32))
    attendees: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(String(64))
    topics_discussed: Mapped[str] = mapped_column(Text)
    materials_shared: Mapped[str] = mapped_column(Text)
    samples_distributed: Mapped[str] = mapped_column(Text)
    sentiment: Mapped[str] = mapped_column(String(32))
    outcomes: Mapped[str] = mapped_column(Text)
    follow_up_actions: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
