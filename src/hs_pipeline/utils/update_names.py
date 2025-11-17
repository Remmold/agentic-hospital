import os
import json
import random
from hs_pipeline.utils.constants import INPUT_DIR, OUTPUT_DIR, FEMALE_NAMES_FILE, MALE_NAMES_FILE

def load_names_from_file(filepath):
    """Loads a list of names, one per line, from a text file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            # Strip whitespace and filter out empty lines
            names = [line.strip() for line in f if line.strip()]
        return names
    except FileNotFoundError:
        print(f"Error: Required name file '{filepath}' not found. Please create it.")
        return []
    except Exception as e:
        print(f"Error reading name file '{filepath}': {e}")
        return []

def get_used_names(output_dir):
    """Scans the output directory to compile a set of already used full names."""
    used_names = set()
    if not os.path.exists(output_dir):
        return used_names
    
    for filename in os.listdir(output_dir):
        if filename.lower().endswith('.json'):
            # Filename format is FirstLastName.json
            # Remove .json and try to reconstruct the original full name format
            name_part_raw = filename[:-5]
            
            # Simple heuristic: try to split based on capital letters (assuming standard naming)
            # This is robust for FirstLastName.json but less so for names with hyphens/spaces in the original JSON
            # However, for uniqueness check, the filename is the best source of truth.
            
            # Since the new filename will be clean (FirstNameLastName), we'll track the *clean* version used.
            # Example: AliceSmith.json -> Alicesmith
            used_names.add(name_part_raw.lower())
            
    return used_names

def find_unused_name(gender, used_names, all_names_pool):
    """
    Picks a unique name from the available pool based on gender and tracks usage.
    all_names_pool: list of "First Last" strings
    """
    
    # 1. Filter out names that are already used (by their clean filename version)
    available_names = []
    for full_name in all_names_pool:
        # Create the cleaned version used for the filename check
        clean_name_key = full_name.replace(' ', '').replace('-', '').lower()
        if clean_name_key not in used_names:
            available_names.append(full_name)

    if not available_names:
        raise Exception(f"Error: All {len(all_names_pool)} unique {gender} names have been used!")
        
    # 2. Pick a random unused name
    new_name = random.choice(available_names)
    return new_name

def process_files():
    """Main function to orchestrate the loading, processing, and saving."""
    
    # Load name pools
    female_names_pool = load_names_from_file(FEMALE_NAMES_FILE)
    male_names_pool = load_names_from_file(MALE_NAMES_FILE)

    if not female_names_pool or not male_names_pool:
        print("Cannot proceed without valid name lists.")
        return
        
    # Initialize directories
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if not os.path.exists(INPUT_DIR):
        print(f"Error: Input directory '{INPUT_DIR}' not found. Please create it and place your JSON files inside.")
        return
        
    # Get currently used names (based on output filenames)
    used_names_keys = get_used_names(OUTPUT_DIR)
    print(f"Found {len(used_names_keys)} names already used in the output folder (checking uniqueness).")

    # Iterate through input JSON files
    for filename in os.listdir(INPUT_DIR):
        if not filename.lower().endswith('.json'):
            continue
            
        input_path = os.path.join(INPUT_DIR, filename)
        
        try:
            with open(input_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error reading or parsing JSON file {filename}: {e}. Skipping.")
            continue
            
        # Extract required patient data
        try:
            patient_gender = data['patient']['gender'] # Using 'patient' from uploaded JSON structure
            patient_name_key = data['patient']['name']
        except KeyError as e:
            print(f"Error: JSON file {filename} is missing patient data field: {e}. Skipping.")
            continue
            
        gender_lower = patient_gender.lower()

        # Find a unique name
        try:
            if gender_lower == 'female':
                new_full_name = find_unused_name('Female', used_names_keys, female_names_pool)
            elif gender_lower == 'male':
                new_full_name = find_unused_name('Male', used_names_keys, male_names_pool)
            else:
                print(f"Warning: Unknown gender '{patient_gender}' in {filename}. Skipping name replacement.")
                continue 
        except Exception as e:
            print(f"Process halted: {e}")
            return

        first_name, last_name = new_full_name.split(' ', 1)
        
        # 3. Update JSON content with the new name
        # We update the original name field and add first/last for completeness
        data['patient']['name'] = new_full_name
        data['patient']['firstName'] = first_name
        data['patient']['lastName'] = last_name
        
        # 4. Prepare new filename and path
        new_filename_base = f"{first_name}{last_name}".replace(' ', '').replace('-', '')
        new_filename = f"{new_filename_base}.json"
        output_path = os.path.join(OUTPUT_DIR, new_filename)
        
        # 5. Write the new JSON file and track the name
        try:
            # Overwrite the patient name in the entire JSON string to catch references in timeline/etc.
            # Convert back to JSON string, replace old name, then write.
            data_str = json.dumps(data, indent=2)
            # This replacement is dangerous but necessary if the name appears elsewhere.
            # Using the original patient name key ensures we only replace the placeholder name.
            data_str = data_str.replace(patient_name_key, new_full_name) 
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(data_str)
                
            # Add the new name's key to the used set
            used_names_keys.add(new_filename_base.lower())
            print(f"Processed '{filename}': Replaced '{patient_name_key}' with '{new_full_name}'. Saved as '{new_filename}'.")
            
        except Exception as e:
            print(f"Error writing to output file {new_filename}: {e}. Skipping.")
            
    print("\n--- Processing Complete ---")
    print(f"Total unique names used in output: {len(used_names_keys)}")


if __name__ == "__main__":
    process_files()