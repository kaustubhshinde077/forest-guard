import os
import json
import logging
from typing import Dict, Any, Tuple, Optional
import cv2
import numpy as np

logger = logging.getLogger("forestguard.data.fixtures")

class OfflineFixtureLoader:
    """
    Loads deterministic, georeferenced satellite scene pairs for repeatable
    testing, detector evaluation, and offline development.
    """
    def __init__(self, fixtures_base_dir: str):
        self.fixtures_base_dir = fixtures_base_dir
        if not os.path.exists(fixtures_base_dir):
            raise FileNotFoundError(f"Fixtures directory does not exist: {fixtures_base_dir}")

    def list_fixtures(self) -> Dict[str, Dict[str, Any]]:
        """List all available benchmark test pairs and their metadata."""
        fixtures = {}
        for entry in os.listdir(self.fixtures_base_dir):
            pair_dir = os.path.join(self.fixtures_base_dir, entry)
            meta_path = os.path.join(pair_dir, "metadata.json")
            if os.path.isdir(pair_dir) and os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    fixtures[entry] = json.load(f)
        return fixtures

    def load_pair(self, fixture_name: str) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Load before and after imagery (as BGR NumPy arrays) along with metadata.
        """
        pair_dir = os.path.join(self.fixtures_base_dir, fixture_name)
        before_path = os.path.join(pair_dir, "before.png")
        after_path = os.path.join(pair_dir, "after.png")
        meta_path = os.path.join(pair_dir, "metadata.json")

        if not (os.path.exists(before_path) and os.path.exists(after_path) and os.path.exists(meta_path)):
            raise FileNotFoundError(f"Incomplete fixture: {pair_dir}")

        img_before = cv2.imread(before_path)
        img_after = cv2.imread(after_path)

        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        return img_before, img_after, metadata
