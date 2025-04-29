from flask_wtf import CSRFProtect

csrf = CSRFProtect()

def init_csrf(app):
    csrf.init_app(app)
