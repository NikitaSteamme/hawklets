from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
import json
import os
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Change this in production!

USERS_FILE = 'users.json'

with open('irregular_verbs.json', encoding='utf-8') as f:
    IRREGULAR_VERBS = json.load(f)
with open('regular_verbs.json', encoding='utf-8') as f:
    REGULAR_VERBS = json.load(f)

def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def find_user_by_username(username):
    users = load_users()
    for user in users:
        if user['username'] == username:
            return user
    return None

def find_user_by_email(email):
    users = load_users()
    for user in users:
        if user['email'] == email:
            return user
    return None

def add_user(user_dict):
    users = load_users()
    users.append(user_dict)
    save_users(users)

@app.route('/')
def landing():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('landing.html')

@app.route('/practice')
def index():
    if 'user_id' not in session:
        return redirect(url_for('landing'))
    verb_type = request.args.get('verb_type', 'irregular')
    tense = request.args.get('tense', 'presente_do_indicativo')
    user = None
    if 'user_id' in session:
        users = load_users()
        user = next((u for u in users if u['id'] == session['user_id']), None)
    return render_template(
        'index.html',
        irregular_verbs=IRREGULAR_VERBS,
        regular_verbs=REGULAR_VERBS,
        selected_verb_type=verb_type,
        selected_tense=tense,
        user=user
    )

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        if find_user_by_email(email):
            flash('Já existe uma conta com este email!', 'danger')
            return redirect(url_for('register'))
        hashed_pw = generate_password_hash(password)
        user = {
            'id': len(load_users()) + 1,
            'email': email,
            'password': hashed_pw,
            'progress': {}
        }
        add_user(user)
        flash('Registro realizado com sucesso! Agora faça login.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = find_user_by_email(email)
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['email'] = user['email']
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Email ou senha incorretos.', 'danger')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Você saiu da conta.', 'info')
    return redirect(url_for('login'))

@app.route('/reset', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'POST':
        email = request.form['email']
        user = find_user_by_email(email)
        if not user:
            flash('Nenhuma conta encontrada com este email.', 'danger')
            return redirect(url_for('reset_password'))
        user['password'] = generate_password_hash('novasenha123')
        users = load_users()
        for i, u in enumerate(users):
            if u['email'] == email:
                users[i] = user
        save_users(users)
        flash('Senha redefinida! Nova senha: novasenha123 (altere após o login)', 'success')
        return redirect(url_for('login'))
    return render_template('reset.html')

@app.route('/check', methods=['POST'])
def check_conjugation():
    data = request.get_json()
    verb = data['verb']
    tense = data['tense']
    person = data['person']
    answer = data['answer']
    verb_dict = IRREGULAR_VERBS if verb in IRREGULAR_VERBS else REGULAR_VERBS
    correct_answer = verb_dict[verb][tense][person]
    return jsonify({
        'correct': answer.lower().strip() == correct_answer.lower()
    })

if __name__ == '__main__':
    app.run(debug=True)
