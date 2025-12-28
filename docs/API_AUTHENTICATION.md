# API Authentication Guide

All API endpoints (except registration) require authentication using an API key.

## Getting an API Key

### 1. Register via Web Interface

Visit `/register` and fill out the registration form with your name and email.

### 2. Register via API

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "apiKey": "rdb_abc123...",
    "message": "Save this API key securely. It will not be shown again."
  }
}
```

**⚠️ Important:** Save your API key immediately! It will not be shown again.

## Using Your API Key

### Method 1: X-API-Key Header (Recommended)

```bash
curl -X GET http://localhost:3000/api/recipes \
  -H "X-API-Key: rdb_your_api_key_here"
```

### Method 2: Authorization Bearer Header

```bash
curl -X GET http://localhost:3000/api/recipes \
  -H "Authorization: Bearer rdb_your_api_key_here"
```

## Example Requests

### Analyze Recipe Text

```bash
curl -X POST http://localhost:3000/api/text \
  -H "X-API-Key: rdb_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Chocolate Chip Cookies\n\nIngredients:\n- 2 cups flour..."
  }'
```

### Get All Recipes

```bash
curl -X GET "http://localhost:3000/api/recipes?page=1&limit=10" \
  -H "X-API-Key: rdb_your_api_key_here"
```

### Get Single Recipe

```bash
curl -X GET http://localhost:3000/api/recipes/recipe-123 \
  -H "X-API-Key: rdb_your_api_key_here"
```

## Verify Your API Key

```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "X-API-Key: rdb_your_api_key_here"
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "isAdmin": false
    }
  }
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": "API key is required. Provide it in X-API-Key header or Authorization: Bearer <key>"
}
```

or

```json
{
  "success": false,
  "error": "Invalid or inactive API key"
}
```

### 403 Forbidden (Admin Only)

```json
{
  "success": false,
  "error": "Admin access required"
}
```

## Creating an Admin User

To create the first admin user, run:

```bash
npx ts-node scripts/create-admin.ts admin@example.com "Admin Name"
```

Or set environment variables and run:

```bash
MONGODB_URI=your_connection_string npx ts-node scripts/create-admin.ts
```

## API Key Security

- **Never share your API key** publicly
- **Never commit API keys** to version control
- **Rotate API keys** if compromised
- **Use environment variables** to store API keys in your applications
- API keys are hashed in the database for security

## Rate Limiting

Currently, there is no rate limiting implemented. Each API request increments your request count, which can be viewed in the admin dashboard.

## OpenAPI Documentation

View the full API documentation at `/api/openapi.json` or use it with Swagger UI.

