import requests
from datetime import datetime
import json
import re
import time

OUTPUT_FILE = "./public/data/funding.json"
TODAY = datetime.now().strftime("%Y-%m-%d")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CampusCompassBot/1.0; +https://campuscompass.co.za)"
}

def normalize_bursary(raw, source):
    """Convert WP API post to your funding.json schema"""
    title = raw.get("title", {}).get("rendered", "Untitled")
    # Strip HTML from title
    title = re.sub(r'<[^>]+>', '', title).strip()
    
    link = raw.get("link", "")
    content = raw.get("content", {}).get("rendered", "")
    excerpt = raw.get("excerpt", {}).get("rendered", "")
    snippet = re.sub(r'<[^>]+>', ' ', excerpt + " + content)
    
    # Extract deadline
    deadline = "TBA"
    match = re.search(r"(Closing|Deadline|Closes|Due)[:\s]+([0-9]{1,2}\s+\w+\s+202[6-7])", snippet, re.I)
    if match:
        deadline = match.group(2)
    
    # Extract provider from title if possible
    provider = "Multiple"
    prov_match = re.search(r"^([A-Za-z0-9\s&\-]+)\s+(Bursary|Scholarship|Funding)", title, re.I)
    if prov_match:
        provider = prov_match.group(1).strip()
    
    # Determine status
    status = "Not yet open"
    if any(w in snippet.lower() for w in ["open now", "apply now", "applications open", "closing"]):
        status = "Open now"
    
    # Create stable ID
    raw_id = f"{provider}{title}2027"
    safe_id = re.sub(r'[^a-z0-9]', '', raw_id.lower())[:64]
    
    return {
        "id": safe_id,
        "name": title,
        "provider": provider,
        "type": "Bursary",
        "level": ["Undergraduate", "Postgraduate"],
        "institutions": ["SA universities", "TVET colleges"],
        "fields": ["All fields"],
        "income_threshold": "Not specified",
        "covers": ["Tuition", "Books"],
        "deadline": deadline,
        "status": status,
        "verified": False,
        "last_verified": TODAY,
        "source_url": link,
        "apply_link": link,
        "requirements": "Check official site",
        "notes": f"Scraped from {source}. Verify on official site."
    }

def fetch_wp_posts(base_url, source_name, per_page=50):
    """Fetch posts from WordPress REST API"""
    posts = []
    page = 1
    
    while page <= 3:
        url = f"{base_url}/wp-json/wp/v2/posts"
        params = {
            "per_page": per_page,
            "page": page,
            "orderby": "date",
            "order": "desc",
            "search": "bursary scholarship funding"
        }
        
        try:
            r = requests.get(url, headers=HEADERS, params=params, timeout=30)
            r.raise_for_status()
            data = r.json()
            
            if not data:
                break
            
            posts.extend(data)
            print(f"{source_name}: Page {page} - Got {len(data)} posts")
            
            if len(data) < per_page:
                break
            
            page += 1
            time.sleep(1)
            
        except Exception as e:
            print(f"{source_name} error on page {page}: {e}")
            break
    
    return posts

def merge_with_manual(manual_list, scraped_list):
    seen = {b["id"] for b in manual_list}
    merged = manual_list.copy()
    added = 0
    
    for b in scraped_list:
        norm = normalize_bursary(b, b.get("_source", "Unknown"))
        if len(norm["name"]) < 10:
            continue
        if norm["id"] not in seen:
            merged.append(norm)
            seen.add(norm["id"])
            added += 1
    
    print(f"Added {added} new bursaries from scraping")
    return merged

def main():
    print("Loading existing funding.json...")
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            manual = json.load(f)
        print(f"Loaded {len(manual)} existing bursaries")
    except FileNotFoundError:
        manual = []
        print("No existing funding.json found. Starting fresh.")
    
    all_scraped = []
    
    print("\nFetching BursariesPortal API...")
    bp_posts = fetch_wp_posts("https://bursariesportal.co.za", "BursariesPortal")
    for p in bp_posts:
        p["_source"] = "BursariesPortal"
    all_scraped.extend(bp_posts)
    
    print("\nFetching ZABursaries API...")
    za_posts = fetch_wp_posts("https://zabursaries.co.za", "ZABursaries")
    for p in za_posts:
        p["_source"] = "ZABursaries"
    all_scraped.extend(za_posts)
    
    print(f"\nScraped {len(all_scraped)} posts total")
    
    bursary_posts = [
        p for p in all_scraped 
        if re.search(r'bursary|scholarship|funding', 
                     p.get("title", {}).get("rendered", ""), re.I)
    ]
    print(f"Filtered to {len(bursary_posts)} bursary posts")
    
    merged = merge_with_manual(manual, bursary_posts)
    merged.sort(key=lambda x: (0 if x["status"] == "Open now" else 1, x["deadline"]))
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved {len(merged)} bursaries to {OUTPUT_FILE}")
    print("Run: git add public/data/funding.json && git commit -m 'update bursaries' && git push")

if __name__ == "__main__":
    main()