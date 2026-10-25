import os
import json
import hashlib
import cv2

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def inspect_all(base_dir):
    print("=" * 80)
    print("FOREST GUARD — FIXTURE PROVENANCE & AUTHENTICITY AUDIT TOOL")
    print("=" * 80)
    
    for item in sorted(os.listdir(base_dir)):
        p = os.path.join(base_dir, item)
        if not os.path.isdir(p):
            continue
        meta_file = os.path.join(p, "metadata.json")
        before_file = os.path.join(p, "before.png")
        after_file = os.path.join(p, "after.png")
        
        print(f"\n[Fixture: {item}]")
        if os.path.exists(meta_file):
            with open(meta_file, "r") as f:
                meta = json.load(f)
            print(f"  Name: {meta.get('name')}")
            print(f"  BBox: {meta.get('bbox')}")
            print(f"  Dates: {meta.get('acquisition_date_before')} -> {meta.get('acquisition_date_after')}")
            print(f"  Authenticity Label: {meta.get('authenticity_status', 'NOT LABELED')}")
            print(f"  Image Origin: {meta.get('image_origin', 'NOT SPECIFIED')}")
            gt = meta.get('documented_ground_truth', {})
            print(f"  Target Type: {gt.get('event_type')}, Target Ha: {gt.get('expected_area_ha')}")
        
        if os.path.exists(before_file):
            b_img = cv2.imread(before_file)
            print(f"  Before image: {b_img.shape}, SHA256: {sha256_file(before_file)[:16]}...")
        if os.path.exists(after_file):
            a_img = cv2.imread(after_file)
            print(f"  After image:  {a_img.shape}, SHA256: {sha256_file(after_file)[:16]}...")

if __name__ == "__main__":
    fixtures_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/fixtures"))
    inspect_all(fixtures_path)
