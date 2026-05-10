import pdfplumber
import json
import os
import re
from pathlib import Path

def extract_courses(pdf_path):
    courses = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if not text: continue
            # Look for qualification names + APS + requirements
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if any(word in line.upper() for word in ['DIPLOMA', 'BACHELOR', 'ADVANCED DIPLOMA', 'DEGREE']):
                    if 'APS' in line or re.search(r'\d{2}\s*with', line):
                        courses.append({
                            "course": line.strip()[:150],
                            "source": os.path.basename(pdf_path),
                            "page": page_num,
                            "raw_text": line.strip()
                        })
    return courses

def extract_fees(pdf_path):
    fees = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if not text: continue
            for line in text.split('\n'):
                if 'R' in line and re.search(r'R\s*\d{1,3}[,\s]?\d{3}', line):
                    fees.append({
                        "item": line.strip()[:120],
                        "source": os.path.basename(pdf_path),
                        "page": page_num
                    })
    return fees

def extract_rules(pdf_path):
    rules = []
    keywords = ['ADMISSION', 'REQUIREMENT', 'APS', 'NSC', 'EXCLUSION', 'PREREQUISITE']
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if not text: continue
            for line in text.split('\n'):
                if any(kw in line.upper() for kw in keywords):
                    rules.append({
                        "rule": line.strip()[:200],
                        "source": os.path.basename(pdf_path),
                        "page": page_num
                    })
    return rules

def main():
    data_dir = Path("data")
    all_courses, all_fees, all_rules = [], [], []
    
    for pdf_file in data_dir.glob("*.pdf"):
        print(f"Reading {pdf_file.name}...")
        all_courses.extend(extract_courses(pdf_file))
        all_fees.extend(extract_fees(pdf_file))
        all_rules.extend(extract_rules(pdf_file))
    
    db = {
        "courses": all_courses,
        "fees": all_fees, 
        "rules": all_rules
    }
    
    os.makedirs("assets", exist_ok=True)
    with open("assets/vut_database.json", "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print("\n=== VUT BRAIN COMPLETE ===")
    print(f"Courses: {len(all_courses)}")
    print(f"Fees: {len(all_fees)}")
    print(f"Rules: {len(all_rules)}")
    print("File saved to assets/vut_database.json")

if __name__ == "__main__":
    main()