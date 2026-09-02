# Latika Residence PMS — Deployment Guide
# Follow these steps EXACTLY in order

---

## PART 1 — Setup on your computer (one time only)

### Step 1 — Open Terminal
- **Mac**: Press Cmd+Space, type "Terminal", press Enter
- **Windows**: Press Windows key, type "cmd", press Enter

### Step 2 — Go to your Downloads folder
```
cd Downloads
```

### Step 3 — Go into the project folder
```
cd latika-pms-online
```

### Step 4 — Install dependencies
```
npm install
```
Wait for it to finish (1-2 minutes). You'll see a lot of text — that's normal.

### Step 5 — Initialize Git and push to GitHub
Copy and paste these commands ONE BY ONE:

```
git init
git add .
git commit -m "Initial Latika PMS deployment"
git branch -M main
git remote add origin https://github.com/latikaresidence-cmd/latika-pms.git
git push -u origin main
```

When asked for username: type your GitHub username
When asked for password: use your GitHub Personal Access Token
(GitHub Settings → Developer Settings → Personal Access Tokens → Generate new token → check "repo")

---

## PART 2 — Setup on Railway

### Step 6 — Create new project on Railway
1. Go to railway.app and log in
2. Click "New Project"
3. Click "Deploy from GitHub repo"
4. Select "latikaresidence-cmd/latika-pms"
5. Click "Deploy Now"

### Step 7 — Add PostgreSQL database
1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Wait 30 seconds for it to provision

### Step 8 — Connect database to your app
1. Click on your app service (not the database)
2. Go to "Variables" tab
3. Click "Add Variable Reference"
4. Select DATABASE_URL from the PostgreSQL service
5. Click "Add"

### Step 9 — Add environment variables
In the same "Variables" tab, add these one by one:

| Variable | Value |
|---|---|
| SESSION_SECRET | latika-pms-2024-secret-siem-reap |
| ADMIN_USERNAME | admin |
| ADMIN_PASSWORD | (choose a strong password!) |
| NODE_ENV | production |
| PROPERTY_NAME | Latika Residence |
| PROPERTY_ADDRESS | 3 Monkeys Road 17252 Siem Reap |
| PROPERTY_PHONE | +855 972 304 710 |
| PROPERTY_TIN | E116-2600001351 |
| PROPERTY_CURRENCY | $ |

### Step 10 — Run database setup
1. In Railway, click on your PostgreSQL service
2. Click "Query" tab
3. Copy the ENTIRE contents of src/schema.sql
4. Paste it into the query box
5. Click "Run Query"

You should see: "INSERT 0 7" and other success messages.

### Step 11 — Get your URL
1. Click on your app service
2. Go to "Settings" tab
3. Under "Domains", click "Generate Domain"
4. Your PMS is now live at: https://latika-pms-XXXX.up.railway.app

---

## PART 3 — Import your existing data

### Step 12 — Export from offline PMS
1. Open your offline PMS file
2. Go to Settings
3. Click "Export Backup"
4. Save the .json file

### Step 13 — Import to online PMS
1. Open your online PMS URL
2. Log in with your admin credentials
3. Go to Settings
4. Click "Import Backup"
5. Select your .json file

All your reservations, guests, invoices will be imported automatically.

---

## LOGIN CREDENTIALS
- URL: Your Railway domain
- Username: admin (or what you set in ADMIN_PASSWORD variable)
- Password: What you set in ADMIN_PASSWORD variable

**IMPORTANT: Change ADMIN_PASSWORD to something strong and secret!**

---

## TROUBLESHOOTING

**"Application failed to start"**
→ Check Variables tab — make sure DATABASE_URL is set

**"Cannot connect to database"**
→ Make sure you ran schema.sql in Step 10

**"Login not working"**
→ Check ADMIN_USERNAME and ADMIN_PASSWORD variables exactly

**Need help?** Share this file with Claude and describe the error message.
