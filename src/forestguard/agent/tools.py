import os
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

logger = logging.getLogger("forestguard.agent.tools")

class SearchProvider(ABC):
    """Abstract search interface for public web and records discovery."""
    
    @abstractmethod
    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        pass

class TavilySearchProvider(SearchProvider):
    """Tavily search integration for high-signal web retrieval."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        self._client = None
        if self.api_key and self.api_key != "your_tavily_api_key_here":
            try:
                from tavily import TavilyClient
                self._client = TavilyClient(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Tavily client: {e}")

    def is_available(self) -> bool:
        return self._client is not None

    def get_provider_name(self) -> str:
        return "tavily_live_search"

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        if not self.is_available():
            raise RuntimeError("Tavily search provider not configured. Set TAVILY_API_KEY.")
            
        try:
            res = self._client.search(
                query=query,
                max_results=max_results,
                search_depth="advanced",
                include_answer=False
            )
            results = []
            for item in res.get("results", []):
                results.append({
                    "title": item.get("title", "No Title"),
                    "url": item.get("url", ""),
                    "publisher": item.get("domain", "Web Record"),
                    "publication_date": item.get("published_date"),
                    "evidence_tier": "credible_news_report",
                    "is_live_retrieval": True,
                    "snippet": item.get("content", ""),
                    "score": item.get("score", 0.0)
                })
            return results
        except Exception as e:
            logger.error(f"Tavily search error: {e}")
            return []

class MockSearchProvider(SearchProvider):
    """
    Deterministic offline simulated test database.
    Explicitly labeled as 'simulated_test_record' to prevent offline test cases
    from ever masquerading as genuine real-world discoveries.
    """
    def __init__(self):
        self._records = [
            {
                "keywords": ["koyna", "corridor", "road", "satara", "widening"],
                "results": [
                    {
                        "title": "[SIMULATED TEST RECORD] Koyna Sanctuary Buffer Road Repair & Diversion Scrutiny",
                        "url": "https://forestsclearance.nic.in/proposal_details_simulated_test/KOYNA_BUFFER_ROAD",
                        "publisher": "National Board for Wildlife / MoEFCC Portal (Test Simulation)",
                        "publication_date": "2023-01-15",
                        "evidence_tier": "simulated_test_record",
                        "is_live_retrieval": False,
                        "snippet": "Simulated test fixture: Road repair and black-topping proposal in Koyna Wildlife Sanctuary buffer zone. Note: Genuine statutory clearance identifier requires live Parivesh verification."
                    },
                    {
                        "title": "[SIMULATED TEST RECORD] Regional Reporting on Western Ghats Buffer Infrastructure",
                        "url": "https://sataranews.example.org/simulated_test/koyna-road-discussions",
                        "publisher": "Regional News Archive (Test Simulation)",
                        "publication_date": "2023-03-10",
                        "evidence_tier": "simulated_test_record",
                        "is_live_retrieval": False,
                        "snippet": "Simulated news report: Discussions regarding tree felling permissions and PWD road repairs along the Koyna sanctuary buffer boundary."
                    }
                ]
            },
            {
                "keywords": ["tillari", "afforestation", "recovery", "corridor", "plantation"],
                "results": [
                    {
                        "title": "[SIMULATED TEST RECORD] Maharashtra Government Notification: Tillari Conservation Reserve Declaration",
                        "url": "https://mahaforest.gov.in/notices/tillari-reserve-declaration-2020",
                        "publisher": "Maharashtra Forest Department (Historical Record Context)",
                        "publication_date": "2020-06-23",
                        "evidence_tier": "simulated_test_record",
                        "is_live_retrieval": False,
                        "snippet": "Official notification declaring 29.53 sq km in Tillari as a Conservation Reserve to secure elephant and tiger migratory corridors between Mhadei and Bhimgad."
                    },
                    {
                        "title": "[SIMULATED TEST RECORD] Ecological Assessment: Tillari Wildlife Corridor Connectivity",
                        "url": "https://conservation-science.example.org/simulated_test/tillari-corridor-restoration",
                        "publisher": "Western Ghats Ecological Survey (Test Simulation)",
                        "publication_date": "2023-11-12",
                        "evidence_tier": "simulated_test_record",
                        "is_live_retrieval": False,
                        "snippet": "Simulated field assessment: Localized habitat regeneration and private monoculture land-use transitions in the Tillari conservation belt."
                    }
                ]
            },
            {
                "keywords": ["rondonia", "jamari", "clearcut", "prodes", "amazon"],
                "results": [
                    {
                        "title": "[SIMULATED TEST RECORD] INPE PRODES Amazon Monitoring Alert: Jamari Sector",
                        "url": "http://terrabrasilis.dpi.inpe.br/app/dashboard/alerts/biomes/legal_amazon/jamari_test",
                        "publisher": "National Institute for Space Research (INPE Test Fixture)",
                        "publication_date": "2023-08-15",
                        "evidence_tier": "simulated_test_record",
                        "is_live_retrieval": False,
                        "snippet": "Simulated benchmark alert: 18.4 ha mechanical agricultural clearcut benchmark in Rondônia terra firme forest."
                    }
                ]
            }
        ]

    def is_available(self) -> bool:
        return True

    def get_provider_name(self) -> str:
        return "mock_offline_search"

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        q_lower = query.lower()
        matched = []
        for rec in self._records:
            if any(k in q_lower for k in rec["keywords"]):
                matched.extend(rec["results"])
                
        if not matched:
            matched.append({
                "title": f"[OFFLINE QUERY] No indexed records for: {query}",
                "url": "https://search.forestguard.local/no_matching_records",
                "publisher": "Offline Registry Search Index",
                "publication_date": None,
                "evidence_tier": "unverified_lead",
                "is_live_retrieval": False,
                "snippet": f"No simulated test records indexed matching: '{query}'. Live web research required."
            })
            
        return matched[:max_results]

class RegionalTreeDensityDB:
    """
    Documented canopy and tree density references for Western Ghats and global biomes.
    Derived strictly from verified publications:
    - Forest Survey of India (FSI) State of Forest Report (ISFR) & District Inventory Data (Champion & Seth Class 3B)
    - FAO Forest Resources Assessment & RAINFOR Amazonian Terra Firme Inventory Plots (DBH >= 10 cm)
    """
    
    DENSITY_DATA = {
        "western_ghats_moist_deciduous": {
            "forest_type": "Western Ghats Southern Moist Mixed Deciduous Forest (Champion & Seth Class 3B/C2)",
            "min_trees_per_ha": 240,
            "max_trees_per_ha": 450,
            "source": "Forest Survey of India (FSI) National Forest Inventory & Regional Working Plan Inventories (trees >= 10 cm DBH)",
            "source_url": "https://fsi.nic.in",
            "basis": "Stratified enumeration plots in Maharashtra Western Ghats moist deciduous and teak-mixed strata (typically 240-450 stems/ha with DBH >= 10 cm)."
        },
        "western_ghats_evergreen": {
            "forest_type": "Western Ghats West Coast Semi-Evergreen Forest (Class 2A/C2)",
            "min_trees_per_ha": 400,
            "max_trees_per_ha": 650,
            "source": "FSI Regional Forest Type Mapping & Western Ghats Ecology Inventory Series",
            "source_url": "https://fsi.nic.in",
            "basis": "Multi-canopy stratified enumeration in dense Western Ghats crest line evergreen tracts."
        },
        "tropical_rainforest_amazon": {
            "forest_type": "Amazon Lowland Terra Firme Rainforest (Non-Flooded Moist Tropical Forest)",
            "forest_stratum": "Southwest Amazonian lowland terra firme on oxisols/ultisols",
            "diameter_threshold": "DBH >= 10 cm (stems >= 31.4 cm circumference)",
            "min_trees_per_ha": 500,
            "max_trees_per_ha": 700,
            "source": "Malhi et al. (2004, Glob. Change Biol., RAINFOR network) & ter Steege et al. (2013, Science)",
            "source_url": "https://doi.org/10.1111/j.1529-8817.2003.00778.x",
            "doi": "10.1111/j.1529-8817.2003.00778.x",
            "basis": "Standard 1-ha pan-Amazonian terra firme plot network syntheses measuring 500-700 stems/ha with DBH >= 10 cm in undisturbed stands.",
            "status": "provisional"
        }
    }

    @classmethod
    def lookup(cls, region_name: str) -> Optional[Dict[str, Any]]:
        for k, v in cls.DENSITY_DATA.items():
            if k in region_name.lower():
                return v
        if "koyna" in region_name.lower() or "satara" in region_name.lower() or "tillari" in region_name.lower():
            return cls.DENSITY_DATA["western_ghats_moist_deciduous"]
        elif "rondonia" in region_name.lower() or "amazon" in region_name.lower():
            return cls.DENSITY_DATA["tropical_rainforest_amazon"]
        return None
