from app.schemas.interaction import HcpProfile


HCP_DIRECTORY = [
    HcpProfile(
        id="hcp-001",
        name="Dr. Asha Menon",
        specialty="Cardiology",
        territory="South Mumbai",
        preferred_channel="In-person",
    ),
    HcpProfile(
        id="hcp-002",
        name="Dr. Rahul Sharma",
        specialty="Endocrinology",
        territory="Delhi Central",
        preferred_channel="Virtual",
    ),
    HcpProfile(
        id="hcp-003",
        name="Dr. Nisha Kapoor",
        specialty="Oncology",
        territory="Bengaluru East",
        preferred_channel="Phone",
    ),
]


def list_hcps() -> list[HcpProfile]:
    return HCP_DIRECTORY


def find_hcp_by_name(name: str) -> HcpProfile | None:
    normalized = name.strip().lower()
    return next((hcp for hcp in HCP_DIRECTORY if hcp.name.lower() == normalized), None)
