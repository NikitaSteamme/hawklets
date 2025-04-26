from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
import json
import os
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
import uuid
from datetime import datetime, timedelta

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

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

@app.route('/')
@app.route('/practice')
def index():
    if 'user_id' not in session:
        return redirect(url_for('landing'))
    verb_type = request.args.get('verb_type', 'irregular')
    tense = request.args.get('tense', 'presente_do_indicativo')
    selected_section = request.args.get('section', None)
    user = None
    users = []
    if 'user_id' in session:
        users = load_users()
        user = next((u for u in users if u['id'] == session['user_id']), None)
    # Pass all users to template if admin
    return render_template(
        'index.html',
        irregular_verbs=IRREGULAR_VERBS,
        regular_verbs=REGULAR_VERBS,
        selected_verb_type=verb_type,
        selected_tense=tense,
        selected_section=selected_section,
        user=user,
        all_users=users if user and user.get('role') == 'admin' else None
    )

@app.route('/update_role', methods=['POST'])
def update_role():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    users = load_users()
    current_user = next((u for u in users if u['id'] == session['user_id']), None)
    if not current_user or current_user.get('role') != 'admin':
        flash('Acesso negado.', 'danger')
        return redirect(url_for('index'))
    email = request.form.get('email')
    new_role = request.form.get('role')
    target_user = next((u for u in users if u['email'] == email), None)
    if not target_user:
        flash('Usuário não encontrado.', 'danger')
        return redirect(url_for('index'))
    if target_user.get('role') == 'admin':
        flash('Não é possível alterar o papel de outro admin.', 'danger')
        return redirect(url_for('index'))
    if target_user['id'] == current_user['id']:
        flash('Não é possível alterar o seu próprio papel.', 'danger')
        return redirect(url_for('index'))
    if new_role not in ['student', 'teacher']:
        flash('Papel inválido.', 'danger')
        return redirect(url_for('index'))
    target_user['role'] = new_role
    save_users(users)
    flash('Papel do usuário atualizado.', 'success')
    return redirect(url_for('index'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        if find_user_by_email(email):
            flash('Já existe uma conta com este email!', 'danger')
            return redirect(url_for('register'))
        hashed_pw = generate_password_hash(password)
        confirmation_token = str(uuid.uuid4())
        confirmation_sent_at = datetime.utcnow().isoformat()
        user = {
            'id': len(load_users()) + 1,
            'email': email,
            'password': hashed_pw,
            'progress': {},
            'confirmed': False,
            'confirmation_token': confirmation_token,
            'confirmation_sent_at': confirmation_sent_at,
            'role': 'student'
        }
        add_user(user)
        send_confirmation_email(email, confirmation_token)
        flash('Registro realizado com sucesso! Confirme a sua conta pelo link enviado para o seu e-mail.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

# Helper function to send confirmation email

def send_confirmation_email(email, token):
    confirm_url = url_for('confirm_email', token=token, _external=True)
    if email == "admin@admin.com":
        print("[ADMIN CONFIRMATION LINK]", confirm_url)
        return
    sender = app.config.get('MAIL_DEFAULT_SENDER') or app.config.get('MAIL_USERNAME')
    msg = Message('Confirmação de Conta - Verb Master',
                  recipients=[email],
                  sender=sender)
    msg.body = f'''Bem-vindo ao Verb Master!\n\nPara ativar a sua conta, clique no link abaixo (válido por 72 horas):\n{confirm_url}\n\nSe não foi você quem se registou, ignore este email.'''
    mail.send(msg)

# Flask-Mail configuration (set your SMTP credentials here)
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', app.config['MAIL_USERNAME'])
mail = Mail(app)

@app.route('/confirm/<token>')
def confirm_email(token):
    users = load_users()
    user = next((u for u in users if u.get('confirmation_token') == token), None)
    if not user:
        return render_template('link_expired.html')
    sent_at = datetime.fromisoformat(user['confirmation_sent_at'])
    if datetime.utcnow() > sent_at + timedelta(hours=72):
        return render_template('link_expired.html')
    user['confirmed'] = True
    user['confirmation_token'] = ''
    user['confirmation_sent_at'] = ''
    save_users(users)
    session['user_id'] = user['id']
    session['email'] = user['email']
    flash('Conta confirmada com sucesso! Bem-vindo!', 'success')
    return redirect(url_for('index'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        print("LOGIN ATTEMPT:", repr(email), repr(password))  # DEBUG
        user = find_user_by_email(email)
        print("FOUND USER:", user)  # DEBUG
        if user and check_password_hash(user['password'], password):
            if not user.get('confirmed', False):
                flash('Email ou senha incorretos. Se acabou de se registar, confirme a sua conta pelo link enviado para o seu e-mail.', 'danger')
                return render_template('login.html')
            session['user_id'] = user['id']
            session['email'] = user['email']
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Email ou senha incorretos. Se acabou de se registar, confirme a sua conta pelo link enviado para o seu e-mail.', 'danger')
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
        # Email abuse protection
        if not can_send_email(user):
            flash('Limite de envio de e-mails atingido. Tente novamente mais tarde.', 'danger')
            return redirect(url_for('reset_password'))
        # Generate reset token and send email
        reset_token = str(uuid.uuid4())
        reset_sent_at = datetime.utcnow().isoformat()
        user['reset_token'] = reset_token
        user['reset_sent_at'] = reset_sent_at
        log_email_send(user)
        update_user(user)
        send_reset_email(user['email'], reset_token)
        flash('Enviámos um link de redefinição de palavra-passe para o seu e-mail.', 'success')
        return redirect(url_for('login'))
    return render_template('reset.html')

@app.route('/reset_confirm/<token>', methods=['GET', 'POST'])
def reset_confirm(token):
    users = load_users()
    user = next((u for u in users if u.get('reset_token') == token), None)
    if not user:
        return render_template('link_expired.html')
    sent_at = datetime.fromisoformat(user['reset_sent_at'])
    if datetime.utcnow() > sent_at + timedelta(hours=72):
        return render_template('link_expired.html')
    if request.method == 'POST':
        new_password = request.form['password']
        user['password'] = generate_password_hash(new_password)
        user['reset_token'] = ''
        user['reset_sent_at'] = ''
        save_users(users)
        flash('Palavra-passe redefinida com sucesso! Agora pode iniciar sessão.', 'success')
        return redirect(url_for('login'))
    return render_template('reset_confirm.html', token=token)

@app.route('/resend_confirmation', methods=['POST'])
def resend_confirmation():
    email = request.form['email']
    user = find_user_by_email(email)
    if not user:
        flash('Nenhuma conta encontrada com este email.', 'danger')
        return redirect(url_for('login'))
    if user.get('confirmed', False):
        flash('A conta já está confirmada.', 'info')
        return redirect(url_for('login'))
    if not can_send_email(user):
        flash('Limite de envio de e-mails atingido. Tente novamente mais tarde.', 'danger')
        return redirect(url_for('login'))
    # Generate new confirmation token
    confirmation_token = str(uuid.uuid4())
    confirmation_sent_at = datetime.utcnow().isoformat()
    user['confirmation_token'] = confirmation_token
    user['confirmation_sent_at'] = confirmation_sent_at
    log_email_send(user)
    update_user(user)
    send_confirmation_email(email, confirmation_token)
    flash('Novo link de confirmação enviado para o seu e-mail.', 'success')
    return redirect(url_for('login'))

@app.route('/resend_reset', methods=['POST'])
def resend_reset():
    email = request.form['email']
    user = find_user_by_email(email)
    if not user:
        flash('Nenhuma conta encontrada com este email.', 'danger')
        return redirect(url_for('reset_password'))
    if not can_send_email(user):
        flash('Limite de envio de e-mails atingido. Tente novamente mais tarde.', 'danger')
        return redirect(url_for('reset_password'))
    # Generate new reset token
    reset_token = str(uuid.uuid4())
    reset_sent_at = datetime.utcnow().isoformat()
    user['reset_token'] = reset_token
    user['reset_sent_at'] = reset_sent_at
    log_email_send(user)
    update_user(user)
    send_reset_email(email, reset_token)
    flash('Novo link de redefinição de palavra-passe enviado para o seu e-mail.', 'success')
    return redirect(url_for('login'))

# Helper for password reset email

def send_reset_email(email, token):
    reset_url = url_for('reset_confirm', token=token, _external=True)
    if email == "admin@admin.com":
        print("[ADMIN RESET LINK]", reset_url)
        return
    sender = app.config.get('MAIL_DEFAULT_SENDER') or app.config.get('MAIL_USERNAME')
    msg = Message('Redefinir Palavra-passe - Verb Master',
                  recipients=[email],
                  sender=sender)
    msg.body = f'''Você solicitou a redefinição da sua palavra-passe no Verb Master.\n\nPara redefinir, clique no link abaixo (válido por 30 minutos):\n{reset_url}\n\nSe não foi você quem solicitou, ignore este email.'''
    mail.send(msg)

# Email abuse protection helpers

def can_send_email(user):
    now = datetime.utcnow()
    # Clean up old log
    log = user.get('email_send_log', [])
    log = [t for t in log if (now - datetime.fromisoformat(t)).total_seconds() < 24*3600]
    user['email_send_log'] = log
    return len(log) < 5

def log_email_send(user):
    now = datetime.utcnow().isoformat()
    log = user.get('email_send_log', [])
    log.append(now)
    user['email_send_log'] = log

def update_user(user):
    users = load_users()
    for i, u in enumerate(users):
        if u['email'] == user['email']:
            users[i] = user
    save_users(users)


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
