"""Central non-Radar timeouts (seconds).

Change API_TIMEOUT_SECONDS here only for normal HTTP / email waits.
Radar keeps its own longer settings in config.RADAR_* — do not reuse this.
"""

from __future__ import annotations

# Default for Resend / SMTP / other short outbound calls that must finish
# before the frontend's 60s client timeout.
API_TIMEOUT_SECONDS = 60

# Email providers: stay comfortably under the client timeout.
EMAIL_HTTP_TIMEOUT_SECONDS = min(45, API_TIMEOUT_SECONDS)
SMTP_TIMEOUT_SECONDS = min(30, API_TIMEOUT_SECONDS)
