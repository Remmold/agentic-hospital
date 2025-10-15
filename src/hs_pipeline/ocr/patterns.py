# Date extraction patterns - ordered by priority (most specific first)
DATE_PATTERNS = [
    # With "Date:" label (highest priority)
    r'Date:\s*(\d{4}-\d{2}-\d{2})',                    # Date: 2006-09-29
    r'Date:\s*(\d{1,2}/\d{1,2}/\d{4})',                # Date: 09/29/2006
    r'Date:\s*(\d{1,2}\.\d{1,2}\.\d{4})',              # Date: 29.09.2006
    
    # ISO format (YYYY-MM-DD) - very reliable
    r'(\d{4}-\d{2}-\d{2})',                            # 2006-09-29
    
    # Slash formats
    r'(\d{1,2}/\d{1,2}/\d{4})',                        # 09/29/2006 or 9/29/2006
    
    # Dot formats
    r'(\d{1,2}\.\d{1,2}\.\d{4})',                      # 29.09.2006
    
    # Written formats (verbose but clear)
    r'((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})',  # September 29, 2006
    
    r'(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})',      # 29 September 2006
    
    # Compact formats (less reliable, use last)
    r'(\d{8})',                                        # 20060929 (8 digits)
    r'(\d{6})',                                        # 060929 (6 digits)
]

# Patient name patterns
PATIENT_NAME_PATTERNS = [
    r"Player'?s?\s+Name:\s*(.+?)(?:\n|Date:|$)",
    r"Patient'?s?\s+Name:\s*(.+?)(?:\n|Date:|$)",
    r"Patient:\s*(.+?)(?:\n|Date:|$)",
    r"Name:\s*(.+?)(?:\n|Date:|$)",
]