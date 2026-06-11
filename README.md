# Suhaib Photo — Full Stack Photography Portfolio

Professional Photography Portfolio + Admin Dashboard  
Stack: Node.js · Express · SQLite · Cloudinary · JWT

---

## Quick Start (Local Development)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm start
```

Open your browser:

| Page | URL |
|------|-----|
| Homepage | http://localhost:3000 |
| Portfolio Gallery | http://localhost:3000/portfolio.html |
| Admin Panel | http://localhost:3000/admin |
| Default Password | P.Sohip.0 |

---

## Cloudinary Setup

1. Create free account at https://cloudinary.com
2. Dashboard → copy Cloud Name, API Key, API Secret
3. Edit backend/.env and fill in the CLOUDINARY_* values

---

## Project Structure

```
suhaib-photo/
├── frontend/
│   ├── index.html        Homepage
│   ├── portfolio.html    Gallery page
│   ├── style.css         Styles
│   └── script.js         Logic
├── backend/
│   ├── server.js         Main server
│   ├── package.json      Dependencies
│   ├── .env.example      → copy to .env
│   ├── db/database.js    SQLite schema
│   ├── middleware/       auth.js, upload.js
│   ├── routes/           auth, portfolio, categories, panels, settings
│   └── public/admin.html Admin UI
├── .gitignore
└── README.md
```

---

## Environment Variables (backend/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Server port (default 3000) |
| NODE_ENV | No | development or production |
| ADMIN_PASSWORD | YES | Admin login password |
| JWT_SECRET | YES | Random string for JWT |
| CLOUDINARY_CLOUD_NAME | YES | Cloudinary cloud name |
| CLOUDINARY_API_KEY | YES | Cloudinary API key |
| CLOUDINARY_API_SECRET | YES | Cloudinary API secret |
| WATERMARK_TEXT | No | Watermark on uploads |
| ALLOWED_ORIGIN | No | Production domain for CORS |

---

## GitHub Push (First Time)

```bash
git init
git add .
git commit -m "Initial commit — Suhaib Photo v2"

# Create repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/suhaib-photo.git
git branch -M main
git push -u origin main
```

.gitignore automatically protects: backend/.env, node_modules/, *.db

---

## Deploy to Production

### Railway (Easiest)
1. https://railway.app → New Project → Deploy from GitHub
2. Root Directory: backend
3. Add env variables in Railway dashboard

### Render
1. https://render.com → New Web Service → GitHub
2. Root Directory: backend
3. Build: npm install | Start: npm start

### VPS (Nginx + PM2)
```bash
cd backend
npm install --production
cp .env.example .env  # fill values
npm install -g pm2
pm2 start server.js --name suhaib-photo
pm2 startup && pm2 save
```

---

## API Reference

POST   /api/auth/login          - Login (returns JWT)
POST   /api/auth/logout         - Logout
GET    /api/auth/verify         - Check session (admin)

GET    /api/portfolio           - List media (?category= &sub=)
POST   /api/portfolio/upload    - Upload file (admin)
GET    /api/portfolio/analytics - View stats (admin)
POST   /api/portfolio/:id/view  - Increment counter
DELETE /api/portfolio/:id       - Delete item (admin)

GET    /api/categories          - List categories
POST   /api/categories          - Add category (admin)
DELETE /api/categories/:id      - Delete category (admin)

GET    /api/panels              - Homepage panels
POST   /api/panels/upload       - Upload panel (admin)

GET    /api/settings            - Site settings
PUT    /api/settings            - Update settings (admin)

---

Suhaib Photo © 2026
