import logging
from typing import Tuple, List, Optional
import cv2
import numpy as np

logger = logging.getLogger("forestguard.vision.alignment")

class ImageAligner:
    """
    Sub-pixel and feature-based coregistration using OpenCV 5.
    Combines ORB feature matching with Enhanced Correlation Coefficient (ECC)
    maximization to ensure before and after imagery are geometrically aligned.
    """
    def __init__(self, max_orb_features: int = 1000, ecc_iterations: int = 50, ecc_eps: float = 1e-4):
        self.max_orb_features = max_orb_features
        self.ecc_iterations = ecc_iterations
        self.ecc_eps = ecc_eps

    def align(
        self,
        img_before: np.ndarray,
        img_after: np.ndarray,
        mask: Optional[np.ndarray] = None
    ) -> Tuple[np.ndarray, str, float]:
        """
        Warp img_after to align with img_before.
        When mask is provided (e.g. terrestrial land mask), feature detection
        is constrained to valid pixels (mask > 0) to avoid false matches on water/clouds.
        Returns:
            aligned_after (np.ndarray): Geometrically warped image.
            method_used (str): 'orb_homography', 'ecc_euclidean', or 'identity_fallback'.
            alignment_metric (float): Transformation residual or feature match score.
        """
        if img_before.shape != img_after.shape:
            # Resize after to match before if shapes differ
            img_after = cv2.resize(img_after, (img_before.shape[1], img_before.shape[0]))

        gray_before = cv2.cvtColor(img_before, cv2.COLOR_BGR2GRAY)
        gray_after = cv2.cvtColor(img_after, cv2.COLOR_BGR2GRAY)

        # 1. Feature-based matching (ORB)
        try:
            orb = cv2.ORB_create(self.max_orb_features)
            kp1, des1 = orb.detectAndCompute(gray_before, mask)
            kp2, des2 = orb.detectAndCompute(gray_after, mask)

            if des1 is not None and des2 is not None and len(kp1) >= 8 and len(kp2) >= 8:
                matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
                matches = matcher.match(des1, des2)
                matches = sorted(matches, key=lambda x: x.distance)

                # Keep top 25% matches
                good_matches = matches[:max(8, int(len(matches) * 0.25))]

                if len(good_matches) >= 6:
                    src_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                    dst_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)

                    homography, inliers = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 4.0)
                    if homography is not None:
                        h, w = gray_before.shape
                        aligned_after = cv2.warpPerspective(img_after, homography, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                        residual = float(np.mean([m.distance for m in good_matches]))
                        return aligned_after, "orb_homography", residual
        except Exception as e:
            logger.debug(f"ORB homography alignment skipped: {e}")

        # 2. Sub-pixel ECC alignment as fallback or fine pass
        try:
            warp_matrix = np.eye(2, 3, dtype=np.float32)
            criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, self.ecc_iterations, self.ecc_eps)
            (cc, warp_matrix) = cv2.findTransformECC(
                gray_before, gray_after, warp_matrix, cv2.MOTION_EUCLIDEAN, criteria, mask, 5
            )
            h, w = gray_before.shape
            aligned_after = cv2.warpAffine(img_after, warp_matrix, (w, h), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
            return aligned_after, "ecc_euclidean", float(cc)
        except Exception as e:
            logger.debug(f"ECC alignment skipped: {e}")

        # 3. Identity fallback if images are already aligned (or identical coordinates)
        return img_after.copy(), "identity_fallback", 0.0
