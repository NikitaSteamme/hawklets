from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Common Portuguese verbs with their conjugations
IRREGULAR_VERBS = {
    'ser': {
        'infinitive': 'ser',
        'presente': {
            'eu': 'sou',
            'tu': 'és',
            'ele': 'é',
            'nós': 'somos',
            'eles': 'são'
        },
        'preterito_perfeito': {
            'eu': 'fui',
            'tu': 'foste',
            'ele': 'foi',
            'nós': 'fomos',
            'eles': 'foram'
        }
    },
    'estar': {
        'infinitive': 'estar',
        'presente': {
            'eu': 'estou',
            'tu': 'estás',
            'ele': 'está',
            'nós': 'estamos',
            'eles': 'estão'
        },
        'preterito_perfeito': {
            'eu': 'estive',
            'tu': 'estiveste',
            'ele': 'esteve',
            'nós': 'estivemos',
            'eles': 'estiveram'
        }
    },
    'ter': {
        'infinitive': 'ter',
        'presente': {
            'eu': 'tenho',
            'tu': 'tens',
            'ele': 'tem',
            'nós': 'temos',
            'eles': 'têm'
        },
        'preterito_perfeito': {
            'eu': 'tive',
            'tu': 'tiveste',
            'ele': 'teve',
            'nós': 'tivemos',
            'eles': 'tiveram'
        }
    },
    'fazer': {
        'infinitive': 'fazer',
        'presente': {
            'eu': 'faço',
            'tu': 'fazes',
            'ele': 'faz',
            'nós': 'fazemos',
            'eles': 'fazem'
        },
        'preterito_perfeito': {
            'eu': 'fiz',
            'tu': 'fizeste',
            'ele': 'fez',
            'nós': 'fizemos',
            'eles': 'fizeram'
        }
    },
    'ir': {
        'infinitive': 'ir',
        'presente': {
            'eu': 'vou',
            'tu': 'vais',
            'ele': 'vai',
            'nós': 'vamos',
            'eles': 'vão'
        },
        'preterito_perfeito': {
            'eu': 'fui',
            'tu': 'foste',
            'ele': 'foi',
            'nós': 'fomos',
            'eles': 'foram'
        }
    },
    'poder': {
        'infinitive': 'poder',
        'presente': {
            'eu': 'posso',
            'tu': 'podes',
            'ele': 'pode',
            'nós': 'podemos',
            'eles': 'podem'
        },
        'preterito_perfeito': {
            'eu': 'pude',
            'tu': 'pudeste',
            'ele': 'pôde',
            'nós': 'pudemos',
            'eles': 'puderam'
        }
    },
    'dizer': {
        'infinitive': 'dizer',
        'presente': {
            'eu': 'digo',
            'tu': 'dizes',
            'ele': 'diz',
            'nós': 'dizemos',
            'eles': 'dizem'
        },
        'preterito_perfeito': {
            'eu': 'disse',
            'tu': 'disseste',
            'ele': 'disse',
            'nós': 'dissemos',
            'eles': 'disseram'
        }
    },
    'ver': {
        'infinitive': 'ver',
        'presente': {
            'eu': 'vejo',
            'tu': 'vês',
            'ele': 'vê',
            'nós': 'vemos',
            'eles': 'veem'
        },
        'preterito_perfeito': {
            'eu': 'vi',
            'tu': 'viste',
            'ele': 'viu',
            'nós': 'vimos',
            'eles': 'viram'
        }
    },
    'saber': {
        'infinitive': 'saber',
        'presente': {
            'eu': 'sei',
            'tu': 'sabes',
            'ele': 'sabe',
            'nós': 'sabemos',
            'eles': 'sabem'
        },
        'preterito_perfeito': {
            'eu': 'soube',
            'tu': 'soubeste',
            'ele': 'soube',
            'nós': 'soubemos',
            'eles': 'souberam'
        }
    },
    'querer': {
        'infinitive': 'querer',
        'presente': {
            'eu': 'quero',
            'tu': 'queres',
            'ele': 'quer',
            'nós': 'queremos',
            'eles': 'querem'
        },
        'preterito_perfeito': {
            'eu': 'quis',
            'tu': 'quiseste',
            'ele': 'quis',
            'nós': 'quisemos',
            'eles': 'quiseram'
        }
    }
}

REGULAR_VERBS = {
    'falar': {  # -ar example
        'infinitive': 'falar',
        'presente': {
            'eu': 'falo',
            'tu': 'falas',
            'ele': 'fala',
            'nós': 'falamos',
            'eles': 'falam'
        },
        'preterito_perfeito': {
            'eu': 'falei',
            'tu': 'falaste',
            'ele': 'falou',
            'nós': 'falamos',
            'eles': 'falaram'
        }
    },
    'comer': {  # -er example
        'infinitive': 'comer',
        'presente': {
            'eu': 'como',
            'tu': 'comes',
            'ele': 'come',
            'nós': 'comemos',
            'eles': 'comem'
        },
        'preterito_perfeito': {
            'eu': 'comi',
            'tu': 'comeste',
            'ele': 'comeu',
            'nós': 'comemos',
            'eles': 'comeram'
        }
    },
    'partir': {  # -ir example
        'infinitive': 'partir',
        'presente': {
            'eu': 'parto',
            'tu': 'partes',
            'ele': 'parte',
            'nós': 'partimos',
            'eles': 'partem'
        },
        'preterito_perfeito': {
            'eu': 'parti',
            'tu': 'partiste',
            'ele': 'partiu',
            'nós': 'partimos',
            'eles': 'partiram'
        }
    }
}

@app.route('/')
def index():
    return render_template('index.html', verbs=IRREGULAR_VERBS, verb_type='irregular')

@app.route('/regular')
def regular():
    return render_template('index.html', verbs=REGULAR_VERBS, verb_type='regular')

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
