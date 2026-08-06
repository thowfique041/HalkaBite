# HalkaBite

HalkaBite is a modern, AI-powered food delivery platform connecting customers, restaurants, delivery partners, and administrators through dedicated real-time dashboards.

## Features

- Customer, restaurant, delivery, and admin dashboards
- AI food recommendations powered by Google Gemini
- AI chat assistant with English, Bangla, and Banglish-aware responses
- Smart food and restaurant search
- Real-time order tracking and notifications
- Restaurant analytics and earnings reporting
- Customer reviews and ratings
- Promotional campaigns and targeted discounts
- Secure JWT authentication and role-based access control
- Leaflet and OpenStreetMap restaurant location management
- Responsive desktop and mobile interface

## Tech Stack

### Frontend

- React and TypeScript
- Tailwind CSS
- Redux Toolkit and RTK Query
- Vite

### Backend

- Node.js and Express.js
- TypeScript
- MongoDB and Mongoose

### Services

- Google Gemini API for AI features
- JWT authentication
- Leaflet, OpenStreetMap, and Nominatim for maps and geocoding
- Cloudinary for optional image storage
- SMTP for optional email delivery

## Installation

### Prerequisites

- Node.js 20 or newer
- npm
- MongoDB, locally or through MongoDB Atlas

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The API runs at `http://localhost:5000` by default.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The web application runs at `http://localhost:5173` by default.

## Environment Variables

Never commit real credentials. Copy the provided example files and populate local `.env` files.

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; defaults to `5000` |
| `NODE_ENV` | No | Runtime environment |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `CLIENT_URL` | Yes | Allowed frontend origin |
| `JWT_SECRET` | Yes | Strong secret used to sign authentication tokens |
| `GEMINI_API_KEY` | For AI | Google Gemini API credential |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret |
| `SMTP_HOST` | For email | SMTP server hostname |
| `SMTP_PORT` | For email | SMTP server port |
| `SMTP_USER` | For email | SMTP account username |
| `SMTP_PASS` | For email | SMTP account credential |
| `NOMINATIM_USER_AGENT` | Recommended | Identifies geocoding requests responsibly |
| `SEED_RESTAURANT_EMAIL` | For seeding | Development restaurant-owner email |
| `SEED_RESTAURANT_PASSWORD` | For seeding | Development restaurant-owner password |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Backend API base URL, such as `http://localhost:5000/api` |

See [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example).

## Project Structure

```text
HalkaBite/
├── backend/          # Express API, database models, controllers, and services
│   └── src/
│       ├── config/   # Database and external-service configuration
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── services/
├── frontend/         # React application
│   └── src/
│       ├── components/
│       ├── pages/    # Customer, restaurant, delivery, and admin views
│       ├── store/    # Redux Toolkit and RTK Query
│       └── types/
└── presentation/     # CSE 350 presentation materials
```

## Scripts

Run scripts from the relevant workspace:

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # Frontend static analysis
```

## Screenshots

Screenshots can be added under `docs/screenshots/` using the following names:

| Home | Customer Dashboard | Restaurant Dashboard |
| --- | --- | --- |
| _Screenshot coming soon_ | _Screenshot coming soon_ | _Screenshot coming soon_ |

| Delivery Dashboard | Admin Dashboard | AI Chat |
| --- | --- | --- |
| _Screenshot coming soon_ | _Screenshot coming soon_ | _Screenshot coming soon_ |

## Security

- Keep all credentials in local environment files.
- Use a strong, unique `JWT_SECRET` in production.
- Restrict CORS to the deployed frontend origin.
- Never use development seed credentials in production.
- Report security concerns privately to the project maintainers.

## Future Improvements

- Personalized recommendations using order history and dietary preferences
- Voice ordering and accessibility improvements
- Smarter meal-combo generation
- Native mobile applications
- Automated dispatch and route optimization
- Expanded multilingual support
- Advanced forecasting and business intelligence

## Contributing

Create a focused branch, keep credentials out of commits, run the build and lint checks, and submit a clear pull request describing the change.

## License

This project is available under the [MIT License](LICENSE).
