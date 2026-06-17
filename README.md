# Suhaib Photo — Full Stack Photography Portfolio

**Stack**: Node.js · Express · MongoDB Atlas · Cloudinary · Tailwind CSS

---

## 📁 Project Structure

```
suhaib-photo-final/
├── frontend/
│   ├── index.html        ← Homepage (hero + panels + nav)
│   ├── portfolio.html    ← Gallery page (filterable grid)
│   ├── script.js         ← Frontend logic (settings, panels, language toggle)
│   ├── style.css         ← Custom styles (animations, luxury theme)
│   └── 92411.jpg         ← Local asset
│
└── backend/
    ├── server.js         ← Main Express entry point
    ├── package.json      ← Dependencies
    ├── .env              ← 🔒 Credentials (DO NOT COMMIT)
    ├── .env.example      ← Template for new deployments
    ├── public/
    │   └── admin.html    ← Admin dashboard (JWT-protected)
    ├── middleware/
    │   ├── auth.js       ← JWT verification middleware
    │   └── upload.js     ← Multer + Sharp + Cloudinary upload
    ├── models/
    │   └── index.js      ← Mongoose schemas (Portfolio, Category, Panel, Settings)
    ├── db/
    │   └── connect.js    ← MongoDB Atlas connection helper
    └── routes/
        ├── auth.js        ← POST /api/auth/login|logout · GET /api/auth/verify
        ├── portfolio.js   ← GET|POST /api/portfolio · DELETE /api/portfolio/:id
        ├── categories.js  ← GET|POST /api/categories · DELETE /api/categories/:id
        ├── panels.js      ← GET /api/panels · POST /api/panels/upload
        └── settings.js    ← GET|PUT /api/settings
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, Cloudinary keys, admin password
```

### 3. Start the server
```bash
npm start           # production
npm run dev         # development (auto-reload with nodemon)
```

### 4. Open in browser
- **Homepage**:  http://localhost:3000
- **Gallery**:   http://localhost:3000/portfolio
- **Admin**:     http://localhost:3000/admin  (login with ADMIN_PASSWORD)

---

## 🔐 Environment Variables

| Variable              | Description                                |
|-----------------------|--------------------------------------------|
| `PORT`                | Server port (default: 3000)               |
| `NODE_ENV`            | `development` or `production`             |
| `ADMIN_PASSWORD`      | Password for admin login modal            |
| `JWT_SECRET`          | Secret key for JWT signing                |
| `MONGODB_URI`         | MongoDB Atlas connection string           |
| `CLOUD_NAME`          | Cloudinary cloud name                     |
| `CLOUDINARY_API_KEY`  | Cloudinary API key                        |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                  |
| `WATERMARK_TEXT`      | Text watermark on uploaded images         |
| `ALLOWED_ORIGIN`      | Production domain for CORS (optional)     |

---

## 📡 API Endpoints

| Method | Route                        | Auth     | Description                    |
|--------|------------------------------|----------|--------------------------------|
| POST   | `/api/auth/login`            | Public   | Login, returns JWT cookie      |
| POST   | `/api/auth/logout`           | Public   | Clear JWT cookie               |
| GET    | `/api/auth/verify`           | Admin    | Verify token validity          |
| GET    | `/api/portfolio`             | Public   | List media (?category=&sub=)   |
| GET    | `/api/portfolio/analytics`   | Admin    | Top viewed items               |
| POST   | `/api/portfolio/upload`      | Admin    | Upload image/video             |
| POST   | `/api/portfolio/:id/view`    | Public   | Increment view counter         |
| DELETE | `/api/portfolio/:id`         | Admin    | Delete media item              |
| GET    | `/api/categories`            | Public   | List all categories            |
| POST   | `/api/categories`            | Admin    | Create category                |
| DELETE | `/api/categories/:id`        | Admin    | Delete category                |
| GET    | `/api/panels`                | Public   | Get homepage panels            |
| POST   | `/api/panels/upload`         | Admin    | Upload panel image by position |
| GET    | `/api/settings`              | Public   | Get social links + hero text   |
| PUT    | `/api/settings`              | Admin    | Update settings                |

---

## 🌐 Deployment

Works on: **Render**, **Railway**, **Fly.io**, **Heroku**, **VPS**

Upload only the `backend/` folder (without `node_modules/`).  
The `frontend/` folder is served as static files by Express automatically.
