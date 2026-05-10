import json
import requests
from bs4 import BeautifulSoup
import re
import urllib3
from time import sleep

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

INPUT_FILE = "public/data/knowledge.json"
OUTPUT_FILE = "public/data/knowledge.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-ZA,en;q=0.9",
    "Referer": "https://www.google.com/"
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

def fetch_text(url):
    if not url:
        return None
    try:
        # Use verify=False for SA sites with bad SSL, and allow redirects
        r = SESSION.get(url, timeout=20, verify=False, allow_redirects=True)
        if r.status_code == 403 or r.status_code == 404:
            return None
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"Failed {url}: {e}")
        return None

def extract_deadline(html):
    if not html: return None
    patterns = [
        r'(close[s]?|deadline|closing date)[^0-9]{0,30}(\d{1,2}\s+\w+\s+\d{4})',
        r'(\d{1,2}\s+\w+\s+\d{4}).*?(close|deadline)',
    ]
    for p in patterns:
        m = re.search(p, html, re.I)
        if m:
            return m.group(2) if m.lastindex >= 2 else m.group(1)
    return None

def extract_fees(html):
    if not html: return None
    m = re.search(r'R\s?\d{1,3}(?:\s?\d{3})*(?:\.\d{2})?', html)
    return m.group(0) if m else None

def extract_faculties(html):
    if not html: return []
    soup = BeautifulSoup(html, "html.parser")
    faculties = []
    for tag in soup.find_all(["h2", "h3", "li", "a"], string=re.compile(r"Faculty|College|School|Faculty of", re.I)):
        text = tag.get_text(strip=True)
        if 5 < len(text) < 80 and "Faculty" in text:
            faculties.append(text)
    return list(dict.fromkeys(faculties))[:8]

def enrich_institution(inst):
    print(f"Enriching {inst['short']}")

    # Try apply_link first, then try common alternatives
    urls_to_try = [inst.get("apply_link")]
    if "apply" not in inst.get("apply_link", ""):
        urls_to_try.append(inst["apply_link"].rstrip("/") + "/apply")
        urls_to_try.append(inst["apply_link"].rstrip("/") + "/admissions")

    html = None
    for url in urls_to_try:
        html = fetch_text(url)
        if html and len(html) > 500:
            break
        sleep(1)

    inst["application_deadline_2026"] = extract_deadline(html)
    inst["estimated_fees"] = extract_fees(html)
    inst["faculties"] = extract_faculties(html)
    inst["nsfas_contact"] = "08000 67327"

    if not inst.get("popular_courses"):
        inst["popular_courses"] = []

    return inst

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Add 2 more with virtual tours
    extra_institutions = [
        {
            "id": "nwu_mahikeng",
            "name": "North-West University Mahikeng Campus",
            "short": "NWU Mahikeng",
            "province": "North West",
            "latitude": -25.7890,
            "longitude": 25.6247,
            "geo_url": "geo:-25.7890,25.6247",
            "primaryColor": "#4B0082",
            "apply_link": "https://studies.nwu.ac.za/studies/apply",
            "student_portal": {"type": "Portal link", "url": "https://my.nwu.ac.za"},
            "virtual_tour_url": "https://virtualcampus.nwu.ac.za/mahikeng",
            "security_phone": "0183891111",
            "medical_phone": "0183891112"
        },
        {
            "id": "uct_gsb",
            "name": "UCT Graduate School of Business",
            "short": "UCT GSB",
            "province": "Western Cape",
            "latitude": -33.9778,
            "longitude": 18.4241,
            "geo_url": "geo:-33.9778,18.4241",
            "primaryColor": "#007FA4",
            "apply_link": "https://www.gsb.uct.ac.za/apply",
            "student_portal": {"type": "GSB Portal", "url": "https://gsb.uct.ac.za"},
            "virtual_tour_url": "https://www.gsb.uct.ac.za/virtual-tour",
            "security_phone": "0214061911",
            "medical_phone": "0214061912"
        }
    ]

    data["institutions"].extend(extra_institutions)

    for inst in data["institutions"]:
        inst = enrich_institution(inst)

    # TVETs and privates - skip scraping, they usually block everything
    for tvet in data["tvet_colleges"]:
        tvet.setdefault("application_deadline_2026", None)
        tvet.setdefault("estimated_fees", None)
        tvet.setdefault("faculties", [])
        tvet.setdefault("nsfas_contact", "08000 67327")

    for priv in data["private_institutions"]:
        priv.setdefault("application_deadline_2026", None)
        priv.setdefault("estimated_fees", None)
        priv.setdefault("faculties", [])
        priv.setdefault("nsfas_contact", "08000 67327")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nDone. Saved to {OUTPUT_FILE}")
    print(f"Total institutions: {len(data['institutions'])}")
    print(f"Total TVETs: {len(data['tvet_colleges'])}")
    print(f"Total private: {len(data['private_institutions'])}")

if __name__ == "__main__":
    main()