import pandas as pd
import json
import re
from pathlib import Path

INPUT_FOLDER = "dbe_downloads"
OUTPUT_FOLDER = "public/data/schools"

def slugify(name):
    s = str(name).lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    s = re.sub(r'_+', '_', s)
    return s.strip('_')

def map_type(sector, phase):
    sector = str(sector).lower()
    phase = str(phase).lower()
    if 'independent' in sector:
        return "Independent School"
    if 'public' in sector:
        if 'primary' in phase or 'prim' in phase:
            return "Public Primary School"
        if 'secondary' in phase or 'sec' in phase:
            return "Public High School"
        return "Public School"
    return "School"

def process_file(filepath):
    province = Path(filepath).stem.replace('_', ' ')
    if province == "Special Needs Education Centre":
        print("Skipping Special_Needs_Education_Centre.xlsx")
        return None, 0

    print(f"\nProcessing {province}...")

    df = pd.read_excel(filepath, engine='openpyxl')

    # DBE column names from your file
    col_name = 'Official_Institution_Name'
    col_prov = 'Province'
    col_dist = 'EIDistrict'
    col_addr = 'StreetAddress'
    col_lat = 'GIS_Latitude'
    col_lng = 'GIS_Longitude'
    col_tel = 'Telephone'
    col_sector = 'Sector'
    col_phase = 'Phase_PED'

    if col_name not in df.columns:
        print(f"ERROR: Column '{col_name}' not found. Available: {list(df.columns)[:10]}...")
        return province, 0

    schools = []
    for _, row in df.iterrows():
        name = row.get(col_name)
        if pd.isna(name) or str(name).strip() == '':
            continue

        lat = row.get(col_lat)
        lng = row.get(col_lng)

        schools.append({
            "id": slugify(name),
            "name": str(name).strip(),
            "shortName": str(name).strip(),
            "level": "School",
            "type": map_type(row.get(col_sector, ''), row.get(col_phase, '')),
            "sub_level": str(row.get(col_phase, 'Unknown')),
            "province": str(row.get(col_prov, province)),
            "district": str(row.get(col_dist, '')),
            "city": str(row.get(col_dist, '')),
            "address": str(row.get(col_addr, '')),
            "primaryColor": "#0066CC",
            "coords": {
                "lat": float(lat) if pd.notna(lat) and lat!= 0 else 0,
                "lng": float(lng) if pd.notna(lng) and lng!= 0 else 0
            },
            "contact": str(row.get(col_tel, '')) if pd.notna(row.get(col_tel)) else "",
            "email": "",
            "fees": "Contact school",
            "emergency": {"security": "", "medical": "", "national": {}},
            "offices": {}
        })

    out_path = Path(OUTPUT_FOLDER) / f"schools_{province.lower().replace(' ', '_')}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(schools, f, ensure_ascii=False, indent=2)

    print(f" -> {len(schools)} schools -> {out_path}")
    return province, len(schools)

def main():
    Path(OUTPUT_FOLDER).mkdir(parents=True, exist_ok=True)

    files = list(Path(INPUT_FOLDER).glob("*.xlsx"))
    if not files:
        print(f"No.xlsx files found in {INPUT_FOLDER}")
        return

    index = {}
    for file in files:
        result = process_file(file)
        if result[0]:
            province, count = result
            index[province] = {
                "file": f"/public/data/schools/schools_{province.lower().replace(' ', '_')}.json",
                "count": count
            }

    with open(Path(OUTPUT_FOLDER) / "index.json", 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2)

    print(f"\nDone. Processed {len(index)} provinces.")
    print("Check public/data/schools/index.json")

if __name__ == "__main__":
    main()