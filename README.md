# HalkaBite

HalkaBite is a full-stack food delivery platform for customers, restaurant owners, delivery partners, and administrators. It combines ordering and delivery workflows with database-grounded food recommendations, real-time browser updates, restaurant analytics, and role-based management tools.

Repository: [github.com/thowfique041/HalkaBite](https://github.com/thowfique041/HalkaBite)

## Problem

Food ordering often separates menu discovery, restaurant operations, delivery coordination, and administration into disconnected workflows. HalkaBite keeps these roles in one application and provides customers with recommendations based on food records stored in MongoDB instead of an unrestricted AI response.

## Features

### Customer

- Browse restaurants, categories, and food details
- Cart, checkout, order history, cancellation, and reordering
- Manual payment-information submission for configured restaurant payment methods
- Reviews and ratings after eligible orders
- Customer-to-restaurant conversations with order context
- Order and message updates through server-sent events
- Gemini-assisted food recommendations using filtered database records

### Restaurant

- Menu and order management
- Payment verification
- Review analytics per food item
- Revenue, order, menu, and earnings analytics
- Promotional campaign management
- Notification center and customer conversations
- Restaurant settings, business hours, delivery options, branding, and OpenStreetMap location search
- Audited restaurant-name change requests

### Delivery partner

- Online/offline availability
- Available and assigned delivery orders
- Delivery status progression, earnings, history, ratings, and profile information

### Administrator

- User, restaurant, order, review, campaign, and delivery management
- Featured-food selection with automatic top-rated fallback
- Restaurant commission and delivery earning settings
- Restaurant performance and commission history
- Restaurant-name change approvals
- Application settings and administrator profile management

## Technology Stack

### Frontend

- React 19 and TypeScript
- Vite and Tailwind CSS
- Redux Toolkit, RTK Query, and React Redux
- React Router
- Leaflet with OpenStreetMap
- Framer Motion, Lucide React, and React Hot Toast

### Backend

- Node.js, Express 5, and TypeScript
- MongoDB and Mongoose
- JWT authentication and bcrypt password hashing
- Google Gemini through `@google/genai`
- Cloudinary and Multer for image uploads
- Nodemailer for email delivery
- Server-sent events for order, chat, notification, and featured-food updates

## Architecture

```text
HalkaBite/
├── frontend/
│   ├── src/components/      # Shared UI and feature components
│   ├── src/pages/           # Customer and role-specific pages
│   ├── src/store/           # Redux state and RTK Query APIs
│   ├── src/hooks/           # Shared React hooks
│   └── src/types/           # Frontend TypeScript contracts
├── backend/
│   ├── src/controllers/     # HTTP request handlers
│   ├── src/services/        # Business, AI, finance, and event logic
│   ├── src/repositories/    # Query/repository logic
│   ├── src/models/          # Mongoose schemas
│   ├── src/routes/          # Express routers
│   ├── src/middleware/      # Authentication and error handling
│   └── src/config/          # Database and external services
├── LICENSE
└── README.md
```

The frontend communicates with the Express API through RTK Query. Controllers delegate reusable work to services and repositories, while Mongoose models persist application data. Long-lived server-sent event endpoints invalidate affected frontend caches without periodic polling.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB, locally or through MongoDB Atlas
- External-service credentials only for the integrations you plan to use

## Installation

Clone the repository and install each workspace independently:

```bash
git clone https://github.com/thowfique041/HalkaBite.git
cd HalkaBite/backend
npm install

cd ../frontend
npm install
```

The committed `package-lock.json` files should be kept. For reproducible CI installations, use `npm ci`.

## Environment Configuration

Create local environment files from the committed examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection URI |
| `JWT_SECRET` | Yes | Strong authentication signing secret |
| `PORT` | No | API port; example uses `5000` |
| `NODE_ENV` | No | Runtime environment |
| `CLIENT_URL` | Yes | Allowed frontend origin for CORS |
| `GEMINI_API_KEY` | For AI | Google Gemini credential |
| `GEMINI_MODEL` | No | Gemini model identifier |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret |
| `SMTP_HOST`, `SMTP_PORT` | For email | SMTP server configuration |
| `SMTP_USER`, `SMTP_PASS` | For email | SMTP credentials |
| `NOMINATIM_USER_AGENT` | Recommended | Identifies Nominatim requests |
| `SEED_RESTAURANT_EMAIL` | For seeding | Development restaurant-owner email |
| `SEED_RESTAURANT_PASSWORD` | For seeding | Development-only seed password |

### Frontend variable

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Backend base URL, for example `http://localhost:5000/api` |

Never commit local `.env` files or real credentials.

## Database Setup

Start MongoDB locally or configure an Atlas connection in `MONGODB_URI`. The backend connects during startup and Mongoose creates collections and declared indexes as the application uses them. Development seed utilities are under `backend/src/`; review a script before running it and provide the seed environment variables explicitly.

## Running Locally

Start the API:

```bash
cd backend
npm run dev
```

Start the web application in another terminal:

```bash
cd frontend
npm run dev
```

With the example configuration, the frontend runs at `http://localhost:5173` and calls the API at `http://localhost:5000/api`.

## API Overview

The Express application exposes routes below `/api` for:

- `/auth`, `/users` — authentication, profiles, sessions, and administration
- `/food`, `/foods`, `/categories`, `/restaurants` — catalog and restaurant operations
- `/cart`, `/orders`, `/payments`, `/reviews` — customer transactions and feedback
- `/delivery` — delivery availability and delivery workflow
- `/chat`, `/notifications`, `/customer-order-notifications` — communication and event history
- `/campaigns` — restaurant promotions
- `/location` — Nominatim-backed location lookup
- `/restaurant-name-change-requests` — protected identity-change workflow
- `/admin` — analytics, commissions, featured food, delivery finance, and settings
- `/ai` — chat, voice, recommendations, and catering quotes
- `/upload` — authenticated image upload

A development Postman collection is available at `backend/postman-collection.json`.

## Commands

Run commands from the corresponding workspace:

```bash
npm run dev       # Start the development server
npm run build     # Type-check and build
npm run start     # Start compiled backend output (backend only)
npm run lint      # Run frontend ESLint
npm run preview   # Preview the frontend production build
```

## Roadmap

- Add automated backend and frontend test suites
- Add API reference generation and deployment documentation
- Split large frontend bundles through route-level lazy loading
- Add production monitoring for event streams and background campaign activation

## License

Licensed under the [MIT License](LICENSE).
