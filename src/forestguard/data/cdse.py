import os
import time
import logging
from typing import Dict, Any, Optional, List
import requests

logger = logging.getLogger("forestguard.data.cdse")

class CopernicusClient:
    """
    Client for Copernicus Data Space Ecosystem (CDSE).
    Supports token acquisition and OData catalog product searches for Sentinel-2 MSI L2A.
    """
    TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    ODATA_BASE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1"

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id or os.getenv("CDSE_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("CDSE_CLIENT_SECRET")
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    def is_configured(self) -> bool:
        """Check if CDSE credentials are provided."""
        return bool(self.client_id and self.client_secret and self.client_id != "your_cdse_client_id_here")

    def authenticate(self, timeout: int = 15) -> str:
        """
        Authenticate with CDSE OAuth2 service and cache bearer token.
        """
        if not self.is_configured():
            raise ValueError("Copernicus CDSE credentials not configured. Provide CDSE_CLIENT_ID and CDSE_CLIENT_SECRET.")

        if self._access_token and time.time() < self._token_expires_at - 60:
            return self._access_token

        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials"
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        response = requests.post(self.TOKEN_URL, data=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
        data = response.json()

        self._access_token = data["access_token"]
        expires_in = data.get("expires_in", 3600)
        self._token_expires_at = time.time() + expires_in
        logger.info("Successfully authenticated with Copernicus CDSE")
        return self._access_token

    def search_sentinel2_products(
        self,
        bbox: List[float],
        start_date: str,
        end_date: str,
        max_cloud_cover: float = 20.0,
        top: int = 10,
        timeout: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Query CDSE OData catalog for Sentinel-2 Level-2A products overlapping a bounding box.
        bbox: [min_lon, min_lat, max_lon, max_lat]
        """
        min_lon, min_lat, max_lon, max_lat = bbox
        poly_wkt = f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"

        # OData filter construction
        filter_expr = (
            f"Collection/Name eq 'SENTINEL-2' and "
            f"ContentDate/Start ge {start_date}T00:00:00.000Z and "
            f"ContentDate/Start le {end_date}T23:59:59.999Z and "
            f"OData.CSC.Intersects(area=geography'SRID=4326;{poly_wkt}')"
        )

        params = {
            "$filter": filter_expr,
            "$top": top,
            "$orderby": "ContentDate/Start desc"
        }

        url = f"{self.ODATA_BASE_URL}/Products"
        resp = requests.get(url, params=params, timeout=timeout)
        resp.raise_for_status()

        data = resp.json()
        return data.get("value", [])
