import json

infile = "africa_schools.geojson"
outfile = "schools_africa.json"

schools = []
with open(infile, "r", encoding="utf-8") as f:
    data = json.load(f)

for feature in data["features"]:
    props = feature.get("properties", {})
    geom = feature.get("geometry", {})

    if geom.get("type")!= "Point":
        continue

    schools.append({
        "id": feature.get("id"),
        "name": props.get("name", "Unnamed School"),
        "lat": geom["coordinates"][1],
        "lon": geom["coordinates"][0],
        "type": props.get("amenity", "school")
    })

with open(outfile, "w", encoding="utf-8") as f:
    json.dump(schools, f, separators=(",", ":"))

print(f"Done. Wrote {len(schools)} schools to {outfile}")