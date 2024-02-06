from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
import spacy
from flask_cors import CORS

app = Flask(__name__)
# Allow all origins for all routes and enable support for credentials
CORS(app, supports_credentials=True)
nlp = spacy.load("en_core_web_sm")  # Load the English model

@app.route('/scrape-names', methods=['POST'])
def scrape_names():
    app.log("Received request for /scrape-names");
    json_data = request.json
    url = json_data['url']
    names = []

    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        text = soup.get_text()
        doc = nlp(text)

        # Adjust criteria to include 'PERSON', 'ORG', and 'GPE'
        names = [ent.text for ent in doc.ents if ent.label_ in ["PERSON", "ORG", "GPE"]]
    except Exception as e:
        print(f"Error: {str(e)}")  # Add logging to help debug
        return jsonify({"error": str(e)}), 500

    return jsonify({"names": names})

if __name__ == '__main__':
    app.run(debug=True, port=8080)