# kimmane-leaderboard
Manage and publish results for multiple Kimmane Golf Terrain tournaments.

## Features
- Public tournament results portal.
- Admin-only login for adding tournaments and results.
- Photo galleries and winner photos per category.
- Persistent SQLite data store and local image storage.
- Branded styling inspired by the Kimmane resort palette.

## Getting started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
   Update the admin credentials and JWT secret in `.env`.
3. Start the server:
   ```bash
   npm start
   ```
4. Open:
   - Public site: `http://localhost:3000`
   - Admin portal: `http://localhost:3000/admin`

## Environment variables
The admin login uses environment variables (see `.env.example`):
- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (required unless using `ADMIN_PASSWORD_HASH`)
- `ADMIN_PASSWORD_HASH` (optional bcrypt hash)
- `JWT_SECRET` (required)
- `PORT` (optional, default `3000`)

## Data storage
All tournament data is stored in a local SQLite database at:
```
data/leaderboard.db
```
Uploaded images are stored in:
```
data/uploads/
```
Back up the `data` folder to preserve results and photos.

## Branding updates
To further match Kimmane branding (logos, fonts, imagery), update:
- `public/styles.css`
- `public/index.html`
- `public/admin.html`
