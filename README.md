# kimmane-leaderboard
Manage the leaderboard for Kimmane Monthly Medal Match.

## Features
- Public leaderboard for all golfers.
- Admin-only login for updating results.
- Persistent SQLite data store.
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
   - Public leaderboard: `http://localhost:3000`
   - Admin portal: `http://localhost:3000/admin`

## Environment variables
The admin login uses environment variables (see `.env.example`):
- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (required unless using `ADMIN_PASSWORD_HASH`)
- `ADMIN_PASSWORD_HASH` (optional bcrypt hash)
- `JWT_SECRET` (required)
- `PORT` (optional, default `3000`)

## Data storage
All leaderboard data is stored in a local SQLite database at:
```
data/leaderboard.db
```
Back up the `data` folder to preserve results.

## Branding updates
To further match Kimmane branding (logos, fonts, imagery), update:
- `public/styles.css`
- `public/index.html`
- `public/admin.html`
