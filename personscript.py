from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup, NavigableString
from flask_cors import CORS
import spacy
import re
import fitz

app = Flask(__name__)
CORS(app)

# Load the spaCy NLP model for English
nlp = spacy.load("en_core_web_lg")

def preprocess_text(text):
    text = ' '.join(text.split())
    return text

def extract_names_from_text(text):
    doc = nlp(text)
    names = []
    for ent in doc.ents:
        if ent.label_ == "PERSON" and re.match(r'^[a-zA-Z\s.&]{2,}$', ent.text) and not ent.text.isupper() and not ent.text.islower():
            names.append(ent.text.strip())
    return names

@app.route('/scrape', methods=['POST'])
def scrape_names():
    json_data = request.json
    url = json_data['url']
    tiered_names = {}  # Dictionary to hold names under each tier
    all_names = []  # List to hold all names found
    all_names_with_tiers = []  # Initialize a list to hold all names with tiers

    try:
        all_names_with_tiers = []  # Initialize a list to hold all names with tiers
        response = requests.get(url, stream=True)
        if url.lower().endswith('.pdf'):
            # The URL points to a PDF file
            with fitz.open(stream=response.content, filetype="pdf") as doc:
                pdf_text = ""
                for page in doc:
                    pdf_text += page.get_text()
            doc = nlp(pdf_text)
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    all_names.append(ent.text.strip())
                    
            for name in all_names:
                all_names_with_tiers.append({'name': name, 'tier': ""})
        else:
            all_names_with_tiers = []  # Initialize a list to hold all names with tiers
            response = requests.get(url)
            soup = BeautifulSoup(response.text, 'html.parser')

            def split_text_by_delimiters(text, delimiters):
                # Create a regex pattern to split the text by the specified delimiters
                regex_pattern = '|'.join(map(re.escape, delimiters))
                return re.split(regex_pattern, text)

            # Search through larger blocks of text
            for element in soup.find_all(['p', 'article', 'section', 'div']):
                # Preprocess the text
                cleaned_text = preprocess_text(element.get_text())
                # Check if the cleaned text is longer than 30 characters
                if len(cleaned_text) > 30:
                    # Split the text by delimiters
                    split_names = split_text_by_delimiters(cleaned_text, ['&', ',', '|', '/'])
                    for name in split_names:
                        # Further NLP analysis on each split section of the text
                        doc = nlp(name.strip())
                        for ent in doc.ents:
                            if re.match(r'^[a-zA-Z\s.&]{8,20}$', ent.text) and not ent.text.isupper() and not ent.text.islower() and ent.label_ == "PERSON":
                                all_names.append(ent.text.strip())
                else:
                    # Further NLP analysis on the entire text
                    doc = nlp(cleaned_text)
                    for ent in doc.ents:
                        if re.match(r'^[a-zA-Z\s.&]{8,20}$', ent.text) and not ent.text.isupper() and not ent.text.islower() and ent.label_ == "PERSON":
                            all_names.append(ent.text.strip())

            # Remove duplicates while preserving order
            all_names = list(dict.fromkeys(all_names))

            # Find all elements that might indicate the start of a new tier
            potential_tier_elements = ['h1', 'h2', 'h3', 'h4','div']
            tier_headings = soup.find_all(potential_tier_elements)

            # If no $ symbol found in h1-h6, expand search to span and p
            if not any('$' in heading.text for heading in tier_headings):
                potential_tier_elements.extend(['span', 'p'])
                tier_headings = soup.find_all(potential_tier_elements)

            for heading in tier_headings:
                if '$' in heading.text and len(heading.text) < 50:  # Check for a dollar sign and length < 50
                    tier = heading.text.strip()
                    tiered_names[tier] = []
                    filtered_names = []  # Initialize filtered_names before the while loop

                    # Find the next sibling that is likely to contain names
                    next_element = heading.find_next_sibling()
                    while next_element and not next_element.name in potential_tier_elements:
                        if isinstance(next_element, NavigableString):
                            # Skip navigable string instances
                            next_element = next_element.next_sibling
                            continue
                        # Extract text from the next element, such as <p> or <div>
                        cleaned_text = preprocess_text(next_element.get_text())
                        # Use regex to filter out unwanted text
                        names = re.findall(r'\b[A-Za-z\s.&]{8,20}\b', cleaned_text)
                        # Filter out all uppercase or all lowercase strings and add to the tier
                        filtered_names = [name for name in names if not name.isupper() and not name.islower() and not any(char.isdigit() for char in name)]
                        tiered_names[tier].extend(filtered_names)
                        # all_names.extend(filtered_names)  # Add the same names to the all_names list
                        next_element = next_element.next_sibling

                    # Add names with their tier to the all_names_with_tiers list
                    for name in filtered_names:
                        all_names_with_tiers.append({'name': name, 'tier': tier})

                else:
                    for name in all_names:
                        all_names_with_tiers.append({'name': name, 'tier': ""})

            # Remove duplicates within each tier and in the all_names list while preserving order
            for tier, names in tiered_names.items():
                tiered_names[tier] = list(dict.fromkeys(names))
        # all_names = list(dict.fromkeys(all_names))

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

    # Return the extracted names under each tier and the entire list of names
    return jsonify({"names_with_tiers": all_names_with_tiers, "names": all_names, "tiered_names": tiered_names})
    # return jsonify({"names_with_tiers": all_names_with_tiers, "names": all_names})

if __name__ == '__main__':
    app.run(debug=True, port=8080)