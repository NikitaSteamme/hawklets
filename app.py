from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

import json

# Common Portuguese verbs with their conjugations
with open('irregular_verbs.json', encoding='utf-8') as f:
    IRREGULAR_VERBS = json.load(f)
with open('regular_verbs.json', encoding='utf-8') as f:
    REGULAR_VERBS = json.load(f)

from flask import request

@app.route('/')
def index():
    # Get selected section from query parameters
    verb_type = request.args.get('verb_type', 'irregular')
    tense = request.args.get('tense', 'presente_do_indicativo')
    return render_template(
        'index.html',
        irregular_verbs=IRREGULAR_VERBS,
        regular_verbs=REGULAR_VERBS,
        selected_verb_type=verb_type,
        selected_tense=tense
    )


@app.route('/check', methods=['POST'])
def check_conjugation():
    data = request.get_json()
    verb = data['verb']
    tense = data['tense']
    person = data['person']
    answer = data['answer']
    
    # Check in both verb dictionaries
    verb_dict = IRREGULAR_VERBS if verb in IRREGULAR_VERBS else REGULAR_VERBS
    correct_answer = verb_dict[verb][tense][person]
    
    return jsonify({
        'correct': answer.lower().strip() == correct_answer.lower()
    })

if __name__ == '__main__':
    app.run(debug=True)
