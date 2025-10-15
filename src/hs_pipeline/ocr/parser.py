"""Step 2: Raw text parsing"""
import regex as re
import datetime as datetime
from hs_pipeline.ocr.patterns import PATIENT_NAME_PATTERNS,DATE_PATTERNS



def extract_patient_name(text: str) -> str:
    """
    Try multiple patterns to find patient name.
    Returns first match found, or "Unknown" if none found.
    """
    patterns = PATIENT_NAME_PATTERNS
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    # If no pattern matches
    return "Unknown"

def extract_date(text: str) -> str:
    """
    Extract date from text or filename.
    """

    for pattern in DATE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            # Normalize to YYYY-MM-DD format
            normalized = normalize_date(date_str)
            if normalized:
                return normalized
    
    return "Unknown"


# function for extracting patient information
def extract_patient_info(text:str, filename:str )->dict:
    pass

def normalize_date(date_str: str) -> str:
    """
    Convert various date formats to YYYY-MM-DD.
    
    Args:
        date_str: Date in any format
        
    Returns:
        Date in YYYY-MM-DD format, or None if invalid
    """
    
    # Already in YYYY-MM-DD format
    if re.match(r'\d{4}-\d{2}-\d{2}', date_str):
        return date_str
    
    # Try common formats
    formats = [
        '%m/%d/%Y',      # 09/29/2006
        '%d/%m/%Y',      # 29/09/2006
        '%m/%d/%y',      # 09/29/06
        '%d/%m/%y',      # 29/09/06
        '%d.%m.%Y',      # 29.09.2006
        '%m.%d.%Y',      # 09.29.2006
        '%Y%m%d',        # 20060929
        '%y%m%d',        # 060929
        '%B %d, %Y',     # September 29, 2006
        '%b %d, %Y',     # Sep 29, 2006
        '%B %d %Y',      # September 29 2006
        '%d %B %Y',      # 29 September 2006
        '%d %b %Y',      # 29 Sep 2006
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    return None

if __name__ == "__main__":
    pass