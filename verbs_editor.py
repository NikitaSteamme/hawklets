import json
import os

VERBS_PATH = os.path.join(os.path.dirname(__file__), 'irregular_verbs.json')

def load_verbs():
    with open(VERBS_PATH, encoding='utf-8') as f:
        return json.load(f)

def save_verbs(verbs):
    with open(VERBS_PATH, 'w', encoding='utf-8') as f:
        json.dump(verbs, f, ensure_ascii=False, indent=4)

def list_verbs():
    verbs = load_verbs()
    print('Список глаголов:')
    for verb in verbs:
        print(f'- {verb}')

def add_verb():
    verbs = load_verbs()
    verb = input('Введите инфинитив нового глагола: ').strip()
    if verb in verbs:
        print('Глагол уже существует!')
        return
    data = {}
    data['infinitive'] = verb
    tenses = ['presente_do_indicativo', 'preterito_perfeito', 'preterito_imperfeito', 'preterito_mais_que_perfeito', 'futuro_simples_do_indicativo']
    pronouns = ['eu', 'tu', 'ele', 'nós', 'eles']
    for tense in tenses:
        data[tense] = {}
        print(f'Ввод форм для времени: {tense}')
        for pronoun in pronouns:
            form = input(f'  {pronoun}: ').strip()
            data[tense][pronoun] = form
    verbs[verb] = data
    save_verbs(verbs)
    print('Глагол добавлен!')

def edit_verb():
    verbs = load_verbs()
    verb = input('Введите инфинитив редактируемого глагола: ').strip()
    if verb not in verbs:
        print('Глагол не найден!')
        return
    data = verbs[verb]
    tenses = ['presente_do_indicativo', 'preterito_perfeito', 'preterito_imperfeito', 'preterito_mais_que_perfeito', 'futuro_simples_do_indicativo']
    pronouns = ['eu', 'tu', 'ele', 'nós', 'eles']
    for tense in tenses:
        print(f'Редактирование времени: {tense}')
        for pronoun in pronouns:
            old = data.get(tense, {}).get(pronoun, '')
            form = input(f'  {pronoun} (текущее: {old}): ').strip()
            if form:
                data.setdefault(tense, {})[pronoun] = form
    verbs[verb] = data
    save_verbs(verbs)
    print('Глагол обновлен!')

def main():
    print('Утилита для редактирования irregular_verbs.json')
    print('1. Список глаголов')
    print('2. Добавить глагол')
    print('3. Редактировать глагол')
    choice = input('Выберите действие (1/2/3): ').strip()
    if choice == '1':
        list_verbs()
    elif choice == '2':
        add_verb()
    elif choice == '3':
        edit_verb()
    else:
        print('Неизвестная команда!')

if __name__ == '__main__':
    main()
