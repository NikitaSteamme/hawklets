from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
import json
import os
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
import uuid
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson.objectid import ObjectId

# MongoDB connection
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/verbsdb')
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_default_database()
users_collection = db['users']

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

# CSRF protection
from csrf import init_csrf
init_csrf(app)

# Flask-Mail configuration from environment variables
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 25))
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False') == 'True'
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'False') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

# Base URL configuration
base_url = os.environ.get("BASE_URL", "http://127.0.0.1:5000")

mail = Mail(app)

# Получаем глаголы из MongoDB
IRREGULAR_VERBS_LIST = list(db['irregular_verbs'].find({}, {'_id': 0}))
REGULAR_VERBS_LIST = list(db['regular_verbs'].find({}, {'_id': 0}))
# Для фронта — массивы
# Для backend проверки — словари
IRREGULAR_VERBS_DICT = {v['infinitive']: v for v in IRREGULAR_VERBS_LIST}
REGULAR_VERBS_DICT = {v['infinitive']: v for v in REGULAR_VERBS_LIST}
REGULAR_VERBS = list(db['regular_verbs'].find({}, {'_id': 0}))





def find_user_by_username(username):
    user = users_collection.find_one({'username': username}, {'_id': 0})
    return user

def find_user_by_email(email):
    user = users_collection.find_one({'email': email}, {'_id': 0})
    return user

@app.route('/admin/delete_user/<user_id>', methods=['POST'])
def delete_user(user_id):
    # Only allow admins
    if session.get('role') != 'admin':
        flash('Acesso negado.', 'danger')
        return redirect(url_for('index', section='admin'))
    from bson.objectid import ObjectId
    try:
        result = users_collection.delete_one({'_id': ObjectId(user_id)})
        if result.deleted_count > 0:
            flash('Utilizador eliminado com sucesso.', 'success')
        else:
            flash('Não foi possível eliminar o utilizador.', 'danger')
    except Exception:
        flash('Erro ao eliminar utilizador.', 'danger')
    # Always redirect back to admin section
    return redirect(url_for('index', section='admin'))

    users_collection.insert_one(user_dict)

def update_user(user):
    users_collection.update_one({'id': user['id']}, {'$set': user})

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
    user = None
    users = []
    if 'user_id' in session:
        # Include MongoDB _id and custom id for admin user management
        users = list(users_collection.find({}, {'_id': 1, 'id': 1, 'email': 1, 'role': 1, 'confirmed': 1}))
        # Convert ObjectId to string for template URLs
        for u in users:
            u['_id'] = str(u['_id'])
        user = next((u for u in users if u['id'] == session['user_id']), None)
    # Pass all users to template if admin
    return render_template(
        'index.html',
        irregular_verbs=IRREGULAR_VERBS_LIST,
        regular_verbs=REGULAR_VERBS_LIST,
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
    users = list(users_collection.find({}, {'_id': 0}))
    current_user = next((u for u in users if u['id'] == session['user_id']), None)
    if not current_user or current_user.get('role') != 'admin':
        flash('Acesso negado.', 'danger')
        return redirect(url_for('index'))
    email = request.form.get('email')
    new_role = request.form.get('role')
    target_user = users_collection.find_one({'email': email}, {'_id': 0})
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
    # Update role directly in MongoDB
    users_collection.update_one({'id': target_user['id']}, {'$set': {'role': new_role}})
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
        # Generate a unique id for the user
        user = {
            'id': str(uuid.uuid4()),
            'email': email,
            'password': hashed_pw,
            'progress': {},
            'confirmed': False,
            'confirmation_token': confirmation_token,
            'confirmation_sent_at': confirmation_sent_at,
            'role': 'student'
        }
        users_collection.insert_one(user)
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

@app.route('/confirm/<token>')
def confirm_email(token):
    user = users_collection.find_one({'confirmation_token': token})
    if not user:
        return render_template('link_expired.html')
    sent_at = datetime.fromisoformat(user['confirmation_sent_at'])
    if datetime.utcnow() > sent_at + timedelta(hours=72):
        return render_template('link_expired.html')
    user['confirmed'] = True
    user['confirmation_token'] = ''
    user['confirmation_sent_at'] = ''
    update_user(user)
    session['user_id'] = user['id']
    session['email'] = user['email']
    session['role'] = user.get('role', '')  # store role
    flash('Conta confirmada com sucesso! Bem-vindo!', 'success')
    return redirect(url_for('index'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        # Removed debug prints for production
        user = find_user_by_email(email)
        if user and check_password_hash(user['password'], password):
            if not user.get('confirmed', False):
                flash('Email ou senha incorretos. Se acabou de se registar, confirme a sua conta pelo link enviado para o seu e-mail.', 'danger')
                return render_template('login.html')
            session['user_id'] = user['id']
            session['email'] = user['email']
            session['role'] = user.get('role', '')  # store user role for admin access
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

@app.route('/reset_confirm/<token>', methods=['GET'])
def reset_confirm(token):
    user = users_collection.find_one({'reset_token': token})
    if not user:
        return render_template('link_expired.html')
    sent_at = datetime.fromisoformat(user['reset_sent_at'])
    if datetime.utcnow() > sent_at + timedelta(hours=72):
        return render_template('link_expired.html')
    # Редиректим на отдельную страницу сброса пароля
    return redirect(url_for('reset_password_token', token=token))

# Новый маршрут для сброса пароля по токену
@app.route('/reset_password', methods=['GET'])
def reset_password_token():
    token = request.args.get('token')
    if not token:
        return render_template('link_expired.html')
    user = users_collection.find_one({'reset_token': token})
    if not user:
        return render_template('link_expired.html')
    sent_at = datetime.fromisoformat(user['reset_sent_at'])
    if datetime.utcnow() > sent_at + timedelta(hours=72):
        return render_template('link_expired.html')
    # Показываем форму для ввода нового пароля
    return render_template('reset_password.html', token=token)


from flask import jsonify, request

from csrf import csrf

@app.route('/api/reset_password', methods=['POST'])
@csrf.exempt
def api_reset_password():
    data = request.get_json()
    token = data.get('token')
    password = data.get('password')
    if not token or not password:
        return jsonify({'success': False, 'message': 'Токен и пароль обязательны.'}), 400
    user = users_collection.find_one({'reset_token': token})
    if not user:
        return jsonify({'success': False, 'message': 'Ссылка для сброса пароля недействительна или устарела.'}), 400
    sent_at = datetime.fromisoformat(user['reset_sent_at'])
    if datetime.utcnow() > sent_at + timedelta(hours=72):
        return jsonify({'success': False, 'message': 'Срок действия ссылки истёк.'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Пароль должен быть не менее 6 символов.'}), 400
    # Обновляем пароль, подтверждаем email, очищаем токены
    users_collection.update_one({'_id': user['_id']}, {'$set': {
        'password': generate_password_hash(password),
        'reset_token': '',
        'reset_sent_at': '',
        'confirmed': True
    }})
    # Сохраняем пользователя в сессии (автоматический вход)
    session['user_id'] = user['id']
    session['email'] = user['email']
    session['role'] = user.get('role', '')
    return jsonify({'success': True, 'redirect': url_for('index'), 'message': 'Пароль успешно изменён. Выполнен вход.'})

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
    users_collection.update_one({'email': user['email']}, {'$set': user})


from csrf import csrf

@app.route('/check', methods=['POST'])
@csrf.exempt
def check_conjugation():
    import sys
    data = request.get_json(force=True, silent=True)
    print('DEBUG /check: raw data:', request.data, file=sys.stderr)
    print('DEBUG /check: parsed json:', data, file=sys.stderr)
    if not data:
        return jsonify({'correct': False, 'message': 'Некорректный JSON или пустой запрос.'}), 400
    verb = data.get('verb')
    tense = data.get('tense')
    person = data.get('person')
    answer = data.get('answer')
    # Используем словари для быстрого поиска
    if verb in IRREGULAR_VERBS_DICT:
        verb_obj = IRREGULAR_VERBS_DICT[verb]
    elif verb in REGULAR_VERBS_DICT:
        verb_obj = REGULAR_VERBS_DICT[verb]
    else:
        print('DEBUG /check: verb not found', file=sys.stderr)
        return jsonify({'correct': False, 'message': 'Глагол не найден.'}), 400
    try:
        correct_answer = verb_obj[tense][person]
    except Exception as e:
        print(f'DEBUG /check: exception: {e}', file=sys.stderr)
        return jsonify({'correct': False, 'message': 'Некорректные данные.'}), 400
    result = {'correct': answer.lower().strip() == correct_answer.lower()}
    print('DEBUG /check: result:', result, file=sys.stderr)
    return jsonify(result)



# Production deployment: use a WSGI server like gunicorn
# Example: gunicorn -b 0.0.0.0:5000 app:app
# Do NOT use Flask's built-in server in production!
# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=5000, debug=False)
