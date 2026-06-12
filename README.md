# SmartCash ATM Application

A modern, web-based Automated Teller Machine (ATM) system with dual authentication methods (card and QR code), real-time transaction processing, and comprehensive admin dashboard. Designed for next-generation digital banking experiences with flexible database support and enterprise-grade security.

**Version:** 1.0.0  
**Status:** Active Development  
**License:** MIT

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Architecture & Workflow](#architecture--workflow)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [Features](#features)
6. [Installation & Setup](#installation--setup)
7. [Configuration](#configuration)
8. [Running the Application](#running-the-application)
9. [API Endpoints](#api-endpoints)
10. [Database Schema](#database-schema)
11. [Security Considerations](#security-considerations)
12. [Comparison with Traditional ATM Systems](#comparison-with-traditional-atm-systems)
13. [Troubleshooting](#troubleshooting)

---

## Problem Statement

### Background
Traditional ATM systems are hardware-dependent, expensive to maintain, and lack flexibility for modern digital banking needs. Users often face:
- Limited access to ATM networks
- Complex hardware integration
- Inability to perform transactions outside ATM locations
- No mobile integration
- High infrastructure costs

### Solution
**SmartCash** provides a cloud-based ATM solution that:
- Enables ATM access from any web browser
- Supports multiple authentication methods (Card + PIN, QR codes)
- Integrates with mobile banking applications
- Reduces infrastructure costs
- Offers real-time transaction monitoring and reporting
- Provides admin dashboard for comprehensive system management
- Maintains security through bcrypt hashing and session management

---

## Architecture & Workflow

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Web Browser    │  │  Mobile App      │                │
│  │  (index.html)    │  │  (QR Scanner)    │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           └────────────┬─────────┘                          │
│                        │                                    │
├────────────────────────┼────────────────────────────────────┤
│           APPLICATION LAYER (Flask Backend)                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Routes & API Endpoints                            │    │
│  │  • /api/auth/card    - Card insertion              │    │
│  │  • /api/auth/pin     - PIN verification            │    │
│  │  • /api/withdraw     - Transaction processing      │    │
│  │  • /admin            - Admin dashboard             │    │
│  └────────────────────────────────────────────────────┘    │
│                        │                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Session Management & Authentication               │    │
│  │  • bcrypt PIN hashing                              │    │
│  │  • Session-based card tracking                     │    │
│  │  • QR code credential verification                 │    │
│  └────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────┤
│              DATA ACCESS LAYER (SQLAlchemy ORM)             │
│  ┌─────────────────┐  ┌──────────────────┐                │
│  │  User Model     │  │  Transaction     │                │
│  │  Management     │  │  Logging         │                │
│  └────────┬────────┘  └────────┬─────────┘                │
└───────────┼─────────────────────┼──────────────────────────┘
            │                     │
┌───────────┼─────────────────────┼──────────────────────────┐
│   DATABASE LAYER                                            │
│  ┌────────────────┐           ┌─────────────────┐         │
│  │   MySQL        │    OR     │   SQLite        │         │
│  │   (Primary)    │ ──────→   │  (Fallback)     │         │
│  └────────────────┘           └─────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### Transaction Workflow

#### 1. **Card-Based Authentication**
```
User Inserts Card
         │
         ↓
Card Number Validation (16 digits)
         │
         ↓
User Enters PIN (4 digits)
         │
         ↓
PIN Verification (bcrypt comparison)
         │
         ↓
Session Created (authenticated flag set)
         │
         ↓
Transaction Ready
```

#### 2. **QR Code Authentication**
```
User Scans QR Code (Mobile)
         │
         ↓
Mobile App Sends Card + PIN
         │
         ↓
Backend Validates Credentials
         │
         ↓
Transaction Processed
         │
         ↓
Receipt Generated
```

#### 3. **Withdrawal Processing**
```
User Requests Withdrawal
         │
         ↓
Validate Amount (> 0)
         │
         ↓
Check User Balance
         │
         ↓
Balance >= Amount?
  │              │
 YES             NO
  │              │
  ↓              ↓
Deduct    Decline
Amount    Request
  │
  ↓
Log Transaction (Success/Failed)
  │
  ↓
Update Database
  │
  ↓
Display Receipt
```

---

## Project Structure

```
smartcash/
├── app.py                          # Main Flask application server
│   ├── Flask app initialization
│   ├── Database connection logic (MySQL/SQLite fallback)
│   ├── SQLAlchemy models (User, Transaction)
│   ├── API endpoints (auth, transactions, admin)
│   ├── Session management
│   └── Seed database helpers
│
├── database.sql                    # MySQL schema definition
│   ├── Database creation script
│   ├── Users table schema
│   ├── Transactions table schema
│   └── Indexes and foreign keys
│
├── requirements.txt                # Python dependencies
│   ├── Flask 3.0.0+
│   ├── Flask-SQLAlchemy 3.1.0+
│   ├── PyMySQL 1.1.0+ (MySQL connector)
│   ├── bcrypt 4.0.0+ (password hashing)
│   └── python-dotenv 1.0.0+ (environment variables)
│
├── static/                         # Static assets (CSS, JS)
│   ├── style.css                  # Main stylesheet
│   │   ├── Theme and color scheme
│   │   ├── Card styling (demo cards)
│   │   ├── Responsive design
│   │   ├── ATM machine UI simulation
│   │   └── Admin dashboard styles
│   │
│   └── script.js                  # Client-side JavaScript
│       ├── Card insertion logic
│       ├── PIN input handling
│       ├── API communication (fetch)
│       ├── Session state management
│       ├── Transaction processing UI
│       ├── Audio effects (ATM sounds)
│       └── Form validation
│
├── templates/                      # Jinja2 HTML templates
│   ├── index.html                 # Main ATM interface
│   │   ├── Header with status
│   │   ├── Demo card wallet
│   │   ├── Card reader section
│   │   ├── PIN entry pad
│   │   ├── Transaction interface
│   │   ├── Receipt display
│   │   └── QR code support
│   │
│   └── admin.html                 # Admin dashboard
│       ├── User management
│       ├── Transaction history
│       ├── System analytics
│       ├── Report generation
│       └── Settings/configuration
│
├── .env                            # Environment variables (not in repo)
│   ├── SECRET_KEY
│   ├── MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD
│   └── ADMIN_USERNAME, ADMIN_PASSWORD
│
├── .gitignore                      # Git ignore rules
│   ├── __pycache__/
│   ├── *.db
│   ├── .env
│   ├── venv/
│   └── .DS_Store
│
└── README.md                       # This file
```

### Key Files Usage

| File | Purpose | Technology |
|------|---------|-----------|
| `app.py` | Flask server, API routes, database models | Python 3.7+, Flask, SQLAlchemy, bcrypt |
| `database.sql` | Database schema initialization | MySQL/SQLite |
| `style.css` | UI styling and responsive design | CSS3, Flexbox, Grid |
| `script.js` | Client-side interactivity | Vanilla JavaScript, Fetch API |
| `index.html` | Main ATM interface | HTML5, Jinja2 templates |
| `admin.html` | Admin management dashboard | HTML5, Jinja2 templates |

---

## Tech Stack

### Backend
- **Framework:** Flask 3.0.0+
  - Lightweight, scalable Python web framework
  - RESTful API design
  - Session management built-in
  
- **ORM:** SQLAlchemy 3.1.0+
  - Database abstraction layer
  - Model-driven architecture
  - Relationship management (User ↔ Transactions)
  
- **Database:**
  - **Primary:** MySQL 5.7+ (Production)
  - **Fallback:** SQLite 3.0+ (Development)
  - Dual-database support for flexibility
  
- **Authentication:** bcrypt 4.0.0+
  - Secure PIN hashing with salt
  - Password verification without storing plain text
  - Industry-standard cryptographic library

- **Utilities:** python-dotenv 1.0.0+
  - Environment variable management
  - Configuration without hardcoding secrets

### Frontend
- **Markup:** HTML5
  - Semantic structure
  - Accessibility features
  - Responsive meta tags
  
- **Styling:** CSS3
  - Flexbox and Grid layouts
  - Media queries for responsiveness
  - Modern visual effects (glass-morphism)
  - Dark theme for ATM ambiance
  
- **Scripting:** Vanilla JavaScript (ES6+)
  - No framework dependencies (lightweight)
  - Fetch API for asynchronous requests
  - DOM manipulation and event handling
  - Local storage for session tracking
  
- **Icons:** FontAwesome 6.4.0
  - Professional iconography
  - Status indicators
  - UI enhancement

### Development Stack
- **Language:** Python 3.7+ (3.11+ recommended)
- **Package Manager:** pip
- **Environment:** Virtual environments (venv)
- **Testing:** (Extensible for pytest)

---

## Features

### 🔐 **Authentication & Security**
- ✅ **Card-based Authentication**
  - 16-digit card number validation
  - Secure PIN verification (4 digits)
  - bcrypt hashing for PIN storage
  - Session-based access control
  
- ✅ **QR Code Authentication**
  - Mobile-first access
  - Dynamic credential passing
  - Integration-ready for mobile apps
  
- ✅ **Admin Authentication**
  - Separate admin credentials
  - Admin dashboard access control
  - Environment-based security

### 💰 **Transaction Management**
- ✅ **Withdrawal Processing**
  - Real-time balance validation
  - Amount verification
  - Insufficient balance handling
  - Transaction success/failure logging
  
- ✅ **Dual Method Support**
  - Card-based transactions
  - QR code-based transactions
  - Method flexibility for different scenarios
  
- ✅ **Transaction History**
  - Complete audit trail
  - Timestamp tracking
  - Transaction status recording
  - User-specific transaction queries

### 📊 **Admin Dashboard**
- ✅ **User Management**
  - View all registered users
  - Monitor account balances
  - Account type tracking (Savings/Checking/Credit)
  
- ✅ **Transaction Analytics**
  - Real-time transaction monitoring
  - Success/failure rate tracking
  - Revenue reports
  - Transaction method distribution
  
- ✅ **System Status**
  - Database connection status
  - Active session monitoring
  - System health indicators

### 🎨 **User Interface**
- ✅ **Demo Card Wallet**
  - Pre-loaded demo cards for testing
  - One-click card insertion
  - Custom card input support
  - Card preview cards with balances
  
- ✅ **Realistic ATM Experience**
  - ATM machine visual simulation
  - Authentic button layouts
  - Sound effects (optional)
  - Receipt generation
  
- ✅ **Responsive Design**
  - Mobile-friendly interface
  - Tablet support
  - Desktop optimization
  - Touch-optimized buttons

### ⚙️ **Technical Features**
- ✅ **Database Flexibility**
  - Automatic MySQL/SQLite fallback
  - Connection pooling
  - Automatic schema creation
  - Cascade delete relationships
  
- ✅ **Environment Configuration**
  - Easy credential management via .env
  - No hardcoded secrets
  - Development/production separation
  
- ✅ **Scalability**
  - Stateless architecture (easily load-balanced)
  - Database agnostic
  - RESTful API design
  - Containerization-ready (Docker)

---

## Installation & Setup

### Prerequisites
- Python 3.7+ (3.11+ recommended)
- pip (Python package manager)
- MySQL Server 5.7+ (optional - SQLite is fallback)
- Git (for version control)
- Browser with JavaScript enabled

### Step-by-Step Installation

#### 1. Clone or Download Project
```bash
# Clone from GitHub
git clone https://github.com/yourusername/smartcash-atm.git
cd smartcash-atm/smartcash

# OR extract ZIP file
cd path/to/smartcash
```

#### 2. Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Configure Environment Variables
Create a `.env` file in the project root:
```bash
# .env file content
SECRET_KEY=your-super-secret-key-change-this-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DB=smartcash
```

#### 5. Start Application
```bash
python app.py
```

#### 6. Access Application
- **ATM Interface:** http://localhost:5000
- **Admin Dashboard:** http://localhost:5000/admin

---

## Configuration

### Environment Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `SECRET_KEY` | `smartcash_super_secret_atm_key` | Flask session encryption key |
| `ADMIN_USERNAME` | `admin` | Admin login username |
| `ADMIN_PASSWORD` | `admin123` | Admin login password |
| `MYSQL_HOST` | `localhost` | MySQL server hostname |
| `MYSQL_USER` | `root` | MySQL username |
| `MYSQL_PASSWORD` | `` (empty) | MySQL password |
| `MYSQL_DB` | `smartcash` | MySQL database name |

### Production Configuration

For production deployment:

```bash
# .env (Production)
SECRET_KEY=generate-with-: python -c 'import secrets; print(secrets.token_urlsafe(32))'
ADMIN_USERNAME=prod_admin_unique_username
ADMIN_PASSWORD=use_strong_password_or_env_secrets
MYSQL_HOST=your-rds-endpoint.amazonaws.com
MYSQL_USER=prod_db_user
MYSQL_PASSWORD=secure_database_password
MYSQL_DB=smartcash_production
```

### Database Setup

#### Option 1: Automatic Setup (Recommended)
The application automatically:
1. Connects to MySQL (or falls back to SQLite)
2. Creates the database if it doesn't exist
3. Seeds demo data on first run

#### Option 2: Manual MySQL Setup
```bash
# Connect to MySQL
mysql -u root -p

# Execute schema
mysql> source database.sql;

# Verify tables
mysql> USE smartcash;
mysql> SHOW TABLES;
mysql> DESCRIBE users;
mysql> DESCRIBE transactions;
```

#### Option 3: SQLite Setup (Development)
No setup needed - SQLite automatically creates `smartcash.db` on first run.

---

## Running the Application

### Development Mode
```bash
python app.py
```

**Output:**
```
[Database] Connected to MySQL database 'smartcash'.
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### With Debugger
```bash
python -m flask run --debug
```

### Production Mode (with Gunicorn)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### Docker (Optional)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

```bash
docker build -t smartcash-atm .
docker run -p 5000:5000 smartcash-atm
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Insert Card
```
POST /api/auth/card
Content-Type: application/json

{
  "card_number": "1234567890123456"
}

Response (Success - 200):
{
  "success": true,
  "name": "John Doe",
  "account_type": "Savings",
  "card_number": "1234567890123456"
}

Response (Error - 400/404):
{
  "success": false,
  "message": "Card not recognized by system"
}
```

#### 2. Verify PIN
```
POST /api/auth/pin
Content-Type: application/json

{
  "pin": "1234"
}

Response (Success - 200):
{
  "success": true,
  "message": "PIN verified successfully"
}

Response (Error - 401):
{
  "success": false,
  "message": "Incorrect PIN. Access Denied."
}
```

### Transaction Endpoints

#### 3. Withdraw (Card Method)
```
POST /api/withdraw
Content-Type: application/json

{
  "amount": 100.00,
  "method": "Card",
  "account_type": "Savings"
}

Response (Success - 200):
{
  "success": true,
  "message": "Withdrawal successful",
  "new_balance": 1400.00,
  "transaction_id": 42
}

Response (Error):
{
  "success": false,
  "message": "Insufficient balance"
}
```

#### 4. Withdraw (QR Method)
```
POST /api/withdraw
Content-Type: application/json

{
  "amount": 50.00,
  "method": "QR",
  "account_type": "Checking",
  "card_number": "1234567890123456",
  "pin": "1234"
}
```

### View Routes

#### 5. ATM Interface
```
GET / 
Returns: index.html (ATM main interface)
```

#### 6. Admin Dashboard
```
GET /admin
Returns: admin.html (Admin management panel)
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_number VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    account_type VARCHAR(20) NOT NULL DEFAULT 'Savings',
    FULLTEXT INDEX (name),
    INDEX (card_number)
);
```

**Fields:**
- `id`: Unique user identifier (auto-increment)
- `card_number`: 16-digit card number (indexed for fast lookup)
- `name`: Account holder name
- `pin_hash`: bcrypt-hashed PIN (never stored as plain text)
- `balance`: Current account balance
- `account_type`: Type of account (Savings/Checking/Credit)

### Transactions Table
```sql
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (timestamp)
);
```

**Fields:**
- `id`: Unique transaction identifier
- `user_id`: Foreign key to users table
- `amount`: Transaction amount
- `method`: 'Card' or 'QR'
- `status`: 'Success' or 'Failed'
- `timestamp`: Transaction timestamp

### Sample Data
```sql
INSERT INTO users VALUES 
  (1, '1234567890123456', 'John Doe', '$2b$12$...', 1500.00, 'Savings'),
  (2, '9876543210987654', 'Jane Smith', '$2b$12$...', 500.00, 'Checking'),
  (3, '1111222233334444', 'Alice Cooper', '$2b$12$...', 10000.00, 'Credit');
```

---

## Security Considerations

### 🔐 Current Security Measures
✅ **PIN Hashing**
- bcrypt with automatic salt generation
- Cost factor: 12 iterations
- Resistant to rainbow table attacks

✅ **Session Management**
- Server-side session storage
- Configurable secret key
- Automatic session expiration

✅ **Input Validation**
- Card number format validation (16 digits)
- PIN format validation (4 digits)
- Amount validation (> 0)

✅ **Database Security**
- Foreign key constraints
- Cascade delete for data integrity
- Prepared statements (SQLAlchemy)

### ⚠️ Production Recommendations

| Issue | Recommendation |
|-------|-----------------|
| Secret Key | Use strong, randomly generated keys (NOT default) |
| Admin Credentials | Change defaults; use environment variables |
| HTTPS | Enable SSL/TLS in production (reverse proxy) |
| Database Connection | Use secure connections; enable encryption |
| Rate Limiting | Implement API rate limiting (prevent brute force) |
| CORS | Restrict cross-origin requests appropriately |
| Logging | Log all transactions for audit trail |
| Backups | Regular database backups and disaster recovery |
| Updates | Keep dependencies updated for security patches |

### Implementation Checklist
```
[ ] Change SECRET_KEY to a strong random value
[ ] Update admin credentials
[ ] Enable HTTPS/SSL
[ ] Set up database user with minimal permissions
[ ] Implement rate limiting
[ ] Enable application logging
[ ] Set up automated backups
[ ] Configure database for encrypted connections
[ ] Implement 2FA for admin access
[ ] Regular security audits
```

---

## Comparison with Traditional ATM Systems

### SmartCash vs. Hardware ATMs

| Feature | SmartCash | Traditional ATM |
|---------|-----------|-----------------|
| **Access Method** | Web Browser + Mobile | Physical Machine Only |
| **Authentication** | Card + PIN, QR Code | Card + PIN Only |
| **Setup Cost** | Low (Software) | High (Hardware) |
| **Maintenance** | Cloud-based | On-site Hardware |
| **Scalability** | Infinite (Cloud) | Limited |
| **Transaction Speed** | Real-time | Real-time |
| **Location Flexibility** | Global (Web) | Fixed Location |
| **Mobile Integration** | Native (QR) | Difficult |
| **Analytics** | Real-time Dashboard | Manual Reports |
| **Update Cycles** | Instant | Manual Updates |
| **Downtime** | Minimal | Extended |
| **Transaction Audit** | Complete Log | Limited Log |
| **User Experience** | Modern UI | Basic UI |
| **Expansion** | Instant | Infrastructure Work |

### Advantages of SmartCash
1. **Accessibility** - Access from anywhere with internet
2. **Cost** - No hardware investment
3. **Flexibility** - Easy to update features
4. **Integration** - Mobile app integration ready
5. **Analytics** - Real-time monitoring
6. **Scalability** - Grows with demand

### Use Cases
- **For Banks:** Branch ATM replacement, kiosk network
- **For Fintech:** Mobile banking integration
- **For Development:** Learning platform
- **For Testing:** QA and development environment

---

## Troubleshooting

### Common Issues & Solutions

#### ❌ MySQL Connection Failed
**Error:** `[Database] MySQL connection failed: Connection refused`

**Solutions:**
1. Verify MySQL is running: `mysql -u root -p`
2. Check credentials in `.env` file
3. Verify MySQL host and port
4. Application will auto-fallback to SQLite

#### ❌ Module Not Found
**Error:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```bash
# Activate virtual environment first
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

#### ❌ Port Already in Use
**Error:** `Address already in use: 127.0.0.1:5000`

**Solution:**
```bash
# Use different port
python -m flask run --port 8000

# Or kill process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :5000
kill -9 <PID>
```

#### ❌ Card Not Recognized
**Issue:** Card inserted but not found in database

**Solutions:**
1. Use demo cards provided in UI
2. Insert custom card that exists in database
3. Verify database has seeded demo data
4. Check database connectivity

#### ❌ PIN Verification Failed
**Issue:** Correct PIN shows as incorrect

**Solutions:**
1. Verify PIN is exactly 4 digits
2. Check CAPS LOCK not activated
3. Verify user exists in database
4. Clear browser cache/cookies

#### ❌ Admin Dashboard Access Denied
**Issue:** Cannot log into admin panel

**Solutions:**
1. Verify username/password in `.env`
2. Check for typos in credentials
3. Clear browser cookies
4. Check environment variables are loaded

### Debug Mode

#### Enable Verbose Logging
```python
# In app.py, add:
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Check Database Connection
```python
# In Python shell
from app import db, app
with app.app_context():
    print(db.engine.url)
    db.session.execute('SELECT 1')
    print("Database connected!")
```

#### Monitor Requests
```python
@app.before_request
def log_request():
    print(f"Request: {request.method} {request.path}")
    
@app.after_request
def log_response(response):
    print(f"Response: {response.status_code}")
    return response
```

---

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Standards
- Follow PEP 8 for Python
- Use meaningful variable names
- Add comments for complex logic
- Write docstrings for functions
- Test thoroughly before submitting PR

---

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] Multi-currency support
- [ ] Mobile app (React Native/Flutter)
- [ ] Advanced analytics and reporting
- [ ] Blockchain transaction recording
- [ ] Machine learning fraud detection
- [ ] Integration with major payment gateways
- [ ] Scheduled transfers
- [ ] Bill payment functionality
- [ ] Multi-language support

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

```
MIT License
Copyright (c) 2024 SmartCash ATM

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

## Support & Contact

- **Issues:** [GitHub Issues](https://github.com/yourusername/smartcash-atm/issues)
- **Email:** support@smartcash-atm.dev
- **Documentation:** [Full Docs](https://smartcash-atm.readthedocs.io)
- **Discord:** [Join Community](https://discord.gg/smartcash)

---

## Acknowledgments

- Flask and SQLAlchemy communities
- FontAwesome for icons
- All contributors and testers
- Inspired by modern banking solutions

---

**Last Updated:** June 2024  
**Version:** 1.0.0  
**Status:** Active Maintenance  

⭐ If you find this project useful, please consider giving it a star on GitHub!

