from fastapi import Depends

from app.api.deps import require_customer
from app.services import radar_service


def latest_results(customer: dict = Depends(require_customer)):
    workspace_id = int(customer.get("workspace_id") or customer["id"])
    return radar_service.latest_results(user_id=workspace_id)
