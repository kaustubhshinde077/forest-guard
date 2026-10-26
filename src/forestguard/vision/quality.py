from typing import Tuple, List, Optional
import cv2
import numpy as np

class QualityAndMaskEngine:
    """
    Image quality verification, Reinhard color-transfer normalization,
    and cloud/shadow masking using classical color spaces (CIE Lab & HSV).
    """

    @staticmethod
    def assess_quality(img: np.ndarray) -> List[str]:
        """Check for blur, extreme underexposure/overexposure, or high noise."""
        warnings = []
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mean_val = float(np.mean(gray))
        std_val = float(np.std(gray))

        if mean_val < 15.0:
            warnings.append("Severe underexposure: scene is extremely dark.")
        elif mean_val > 235.0:
            warnings.append("Severe overexposure: scene is blown out.")

        if std_val < 8.0:
            warnings.append("Low scene dynamic range or thick cloud cover / water surface.")

        # Focus / blur check via Laplacian variance
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if lap_var < 15.0:
            warnings.append("High scene blur or lack of high-frequency structural detail.")

        return warnings

    @staticmethod
    def reinhard_color_transfer(source: np.ndarray, target: np.ndarray, mask: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Transfers the color characteristics (mean & standard deviation in CIE Lab)
        from target (before) to source (after) to normalize atmospheric/seasonal shifts.
        When mask is provided (e.g. terrestrial land mask), statistics are computed
        exclusively over valid unmasked pixels to prevent ocean/cloud bias.
        """
        src_lab = cv2.cvtColor(source, cv2.COLOR_BGR2Lab).astype(np.float32)
        tgt_lab = cv2.cvtColor(target, cv2.COLOR_BGR2Lab).astype(np.float32)

        if mask is not None and np.count_nonzero(mask) > 100:
            valid_idx = (mask > 0)
            src_pixels = src_lab[valid_idx]
            tgt_pixels = tgt_lab[valid_idx]
            src_mean, src_std = np.mean(src_pixels, axis=0), np.std(src_pixels, axis=0)
            tgt_mean, tgt_std = np.mean(tgt_pixels, axis=0), np.std(tgt_pixels, axis=0)
        else:
            src_mean, src_std = np.mean(src_lab, axis=(0, 1)), np.std(src_lab, axis=(0, 1))
            tgt_mean, tgt_std = np.mean(tgt_lab, axis=(0, 1)), np.std(tgt_lab, axis=(0, 1))

        # Avoid zero division
        src_std = np.where(src_std == 0, 1e-5, src_std)

        # Scale channels
        res_lab = np.zeros_like(src_lab)
        for i in range(3):
            res_lab[:, :, i] = ((src_lab[:, :, i] - src_mean[i]) * (tgt_std[i] / src_std[i])) + tgt_mean[i]

        res_lab = np.clip(res_lab, 0, 255).astype(np.uint8)
        return cv2.cvtColor(res_lab, cv2.COLOR_Lab2BGR)

    @staticmethod
    def segment_clouds_and_shadows(img: np.ndarray) -> np.ndarray:
        """
        Segments high-luminance low-saturation clouds and deep topographic/cloud shadows
        without spectral band indices.
        Returns binary mask (255 = cloud/shadow to exclude, 0 = clear canopy/land).
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2Lab)

        v_channel = hsv[:, :, 2]
        s_channel = hsv[:, :, 1]
        l_channel = lab[:, :, 0]

        # Cloud mask: High brightness (L > 210) AND low saturation (S < 45)
        cloud_mask = (l_channel > 210) & (s_channel < 45)

        # Deep shadow mask: Extremely low brightness in both V and L (L < 35 and V < 35)
        shadow_mask = (l_channel < 35) & (v_channel < 35)

        combined = np.zeros(img.shape[:2], dtype=np.uint8)
        combined[cloud_mask | shadow_mask] = 255

        # Morphological dilation to cover cloud/shadow boundaries
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined = cv2.dilate(combined, kernel, iterations=2)
        return combined
