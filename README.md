# Recipe DB

A Next.js application built with the Pages Router.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gpt-oss:120b-cloud
```

Replace the `MONGODB_URI` with your actual MongoDB connection string.

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Multilingual Support**: Recipes in 7 languages (English, German, Dutch, Hungarian, French, Spanish, Portuguese)
- **Ollama Integration**: AI-powered recipe processing and translation
- **MongoDB Database**: Persistent storage for recipes with Mongoose ODM
- **Comprehensive Recipe Model**: Ingredients, steps, macros, difficulty, and more
- **RESTful API**: Full CRUD operations for recipes

## Project Structure

```
├── pages/              # Next.js pages (Pages Router)
│   ├── _app.tsx       # App wrapper
│   ├── _document.tsx  # Document wrapper
│   ├── index.tsx      # Home page
│   └── api/           # API routes
│       ├── recipes/   # Recipe CRUD endpoints
│       └── recipe/    # Recipe processing endpoints
├── components/         # React components
├── lib/               # Utility functions and libraries
│   ├── mongodb.ts     # MongoDB connection
│   ├── ollama.ts      # Ollama client
│   └── recipe.ts      # Recipe processing functions
├── models/            # Mongoose models
│   └── Recipe.ts      # Recipe schema
├── types/             # TypeScript type definitions
└── styles/            # Global styles
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Ollama Setup Guide](./docs/OLLAMA_SETUP.md) - setup instructions for Ollama integration.
- [MongoDB Setup Guide](./docs/MONGODB_SETUP.md) - setup instructions for MongoDB integration.

