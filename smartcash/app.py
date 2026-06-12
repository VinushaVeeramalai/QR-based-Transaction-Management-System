import os
import datetime
from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
import bcrypt

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'smartcash_super_secret_atm_key')

# Admin Credentials
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Setup Database connection with MySQL -> SQLite fallback
mysql_host = os.environ.get('MYSQL_HOST', 'localhost')
mysql_user = os.environ.get('MYSQL_USER', 'root')
mysql_password = os.environ.get('MYSQL_PASSWORD', '')
mysql_db = os.environ.get('MYSQL_DB', 'smartcash')

db_uri = None

# Attempt to connect to MySQL to create schema, otherwise fall back to SQLite
try:
    import pymysql
    # Connect without DB selected to create it if it doesn't exist
    conn = pymysql.connect(
        host=mysql_host,
        user=mysql_user,
        password=mysql_password,
        connect_timeout=2
    )
    with conn.cursor() as cursor:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {mysql_db}")
    conn.commit()
    conn.close()
    
    # Connect again to check DB access
    conn = pymysql.connect(
        host=mysql_host,
        user=mysql_user,
        password=mysql_password,
        database=mysql_db,
        connect_timeout=2
    )
    conn.close()
    db_uri = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}/{mysql_db}"
    print(f"[Database] Connected to MySQL database '{mysql_db}'.")
except Exception as e:
    print(f"[Database] MySQL connection failed: {e}. Falling back to SQLite.")
    db_uri = 'sqlite:///smartcash.db'

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    card_number = db.Column(db.String(16), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    pin_hash = db.Column(db.String(255), nullable=False)
    balance = db.Column(db.Float, nullable=False, default=0.00)
    account_type = db.Column(db.String(20), nullable=False, default='Savings')
    
    # Cascade delete transactions if user is deleted
    transactions = db.relationship('Transaction', backref='user', lazy=True, cascade="all, delete-orphan")

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(20), nullable=False) # 'Card' or 'QR'
    status = db.Column(db.String(20), nullable=False) # 'Success' or 'Failed'
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# Seed Database Helper
def seed_database():
    if User.query.count() == 0:
        print("[Database] Seeding database with demo users...")
        # Create seed users
        users_data = [
            ("1234567890123456", "John Doe", "1234", 1500.00, "Savings"),
            ("9876543210987654", "Jane Smith", "4321", 500.00, "Checking"),
            ("1111222233334444", "Alice Cooper", "1111", 10000.00, "Credit")
        ]
        
        for card, name, pin, bal, acct in users_data:
            # Hash PIN using bcrypt
            salt = bcrypt.gensalt()
            hashed_pin = bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')
            u = User(
                card_number=card,
                name=name,
                pin_hash=hashed_pin,
                balance=bal,
                account_type=acct
            )
            db.session.add(u)
        db.session.commit()
        print("[Database] Seed data successfully committed.")

# HTML Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# ATM API Endpoints
@app.route('/api/auth/card', methods=['POST'])
def auth_card():
    data = request.json or {}
    card_number = data.get('card_number')
    if not card_number:
        return jsonify({"success": False, "message": "Card number is required"}), 400
    
    # Remove spaces/hyphens
    card_number = card_number.replace(' ', '').replace('-', '')
    if not card_number.isdigit() or len(card_number) != 16:
        return jsonify({"success": False, "message": "Card number must be exactly 16 digits"}), 400
        
    user = User.query.filter_by(card_number=card_number).first()
    if not user:
        return jsonify({"success": False, "message": "Card not recognized by system"}), 404
        
    session['card_number'] = card_number
    session['authenticated'] = False # PIN verification pending
    
    return jsonify({
        "success": True, 
        "name": user.name, 
        "account_type": user.account_type,
        "card_number": card_number
    })

@app.route('/api/auth/pin', methods=['POST'])
def auth_pin():
    data = request.json or {}
    pin = data.get('pin')
    card_number = session.get('card_number')
    
    if not card_number:
        return jsonify({"success": False, "message": "No active card session. Please insert card first."}), 400
        
    if not pin or not pin.isdigit() or len(pin) != 4:
        return jsonify({"success": False, "message": "PIN must be exactly 4 digits"}), 400
        
    user = User.query.filter_by(card_number=card_number).first()
    if not user or not bcrypt.checkpw(pin.encode('utf-8'), user.pin_hash.encode('utf-8')):
        return jsonify({"success": False, "message": "Incorrect PIN. Access Denied."}), 401
        
    session['authenticated'] = True
    return jsonify({"success": True, "message": "PIN verified successfully"})

@app.route('/api/withdraw', methods=['POST'])
def withdraw():
    data = request.json or {}
    amount = data.get('amount')
    method = data.get('method')  # 'Card' or 'QR'
    account_type = data.get('account_type')
    
    if not amount or not method or not account_type:
        return jsonify({"success": False, "message": "Missing transaction details."}), 400
        
    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({"success": False, "message": "Invalid amount. Must be greater than 0."}), 400
    except ValueError:
        return jsonify({"success": False, "message": "Invalid amount format."}), 400

    # Retrieve user depending on access method
    if method == 'Card':
        card_number = session.get('card_number')
        authenticated = session.get('authenticated')
        if not card_number or not authenticated:
            return jsonify({"success": False, "message": "Session expired or unauthorized. Please re-insert card."}), 401
            
        user = User.query.filter_by(card_number=card_number).first()
    elif method == 'QR':
        # Dynamic QR authentication: receives user credentials simulated from app
        card_number = data.get('card_number')
        pin = data.get('pin')
        if not card_number or not pin:
            return jsonify({"success": False, "message": "QR scan authorization details missing."}), 400
            
        user = User.query.filter_by(card_number=card_number).first()
        if not user or not bcrypt.checkpw(pin.encode('utf-8'), user.pin_hash.encode('utf-8')):
            return jsonify({"success": False, "message": "Invalid credentials provided by Mobile QR App."}), 401
    else:
        return jsonify({"success": False, "message": "Unsupported access method."}), 400

    if not user:
        return jsonify({"success": False, "message": "User account not found."}), 404
        
    # Check balance
    if user.balance < amount:
        # Log failed transaction
        tx = Transaction(user_id=user.id, amount=amount, method=method, status='Failed')
        db.session.add(tx)
        db.session.commit()
        return jsonify({
            "success": False, 
            "message": f"Insufficient funds. Available balance is ${user.balance:,.2f}"
        }), 400
        
    # Deduct balance
    user.balance -= amount
    
    # Log successful transaction
    tx = Transaction(user_id=user.id, amount=amount, method=method, status='Success')
    db.session.add(tx)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Withdrawal processed successfully.",
        "transaction": {
            "amount": amount,
            "method": method,
            "timestamp": tx.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            "new_balance": float(user.balance),
            "account_type": account_type,
            "user_name": user.name
        }
    })

@app.route('/api/cancel', methods=['POST'])
def cancel():
    session.pop('card_number', None)
    session.pop('authenticated', None)
    return jsonify({"success": True, "message": "Session cancelled."})

# Admin Dashboard Endpoints
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        return jsonify({"success": True, "message": "Admin login successful."})
    return jsonify({"success": False, "message": "Invalid username or password."}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_logged_in', None)
    return jsonify({"success": True, "message": "Admin logout successful."})

@app.route('/api/admin/data', methods=['GET'])
def admin_data():
    if not session.get('admin_logged_in'):
        return jsonify({"success": False, "message": "Unauthorized access."}), 401
        
    users = User.query.all()
    txs = Transaction.query.order_by(Transaction.timestamp.desc()).all()
    
    users_list = [{
        "id": u.id,
        "card_number": u.card_number,
        "name": u.name,
        "balance": u.balance,
        "account_type": u.account_type
    } for u in users]
    
    txs_list = [{
        "id": t.id,
        "user_id": t.user_id,
        "user_name": t.user.name if t.user else "Deleted User",
        "card_number": t.user.card_number if t.user else "N/A",
        "amount": t.amount,
        "method": t.method,
        "status": t.status,
        "timestamp": t.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    } for t in txs]
    
    return jsonify({
        "success": True,
        "users": users_list,
        "transactions": txs_list
    })

# Initialize application database
with app.app_context():
    db.create_all()
    seed_database()

if __name__ == '__main__':
    app.run(debug=True)
