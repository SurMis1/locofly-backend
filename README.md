
# Locofly Backend API

Small Node.js / Express API that powers the Locofly picker web app.

## Endpoints

- `GET /health` – basic health check
- `GET /locations` – returns list of locations:
  ```json
  [
    { "id": 1, "name": "Location 1" },
    ...
  ]
  ```

- `GET /inventory?location_id=1&query=milk` – items for a location,
  optionally filtered by search text (item name or barcode).

- `POST /inventory/adjust`
  ```json
  {
    "location_id": 1,
    "items": [
      { "id": 10, "delta": 1 },
      { "id": 11, "delta": -2 }
    ]
  }
  ```

## Local development

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Make sure you can reach your Cloud SQL Postgres instance, e.g. via
   Cloud SQL Proxy or a direct TCP connection.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Run:

   ```bash
   npm start
   ```

## Deploy to Cloud Run (manual steps)

From this folder:

```bash
gcloud run deploy locofly-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars DB_USER=postgres,DB_PASSWORD=YOUR_PASSWORD,DB_NAME=locofly,INSTANCE_CONNECTION_NAME=ageless-granite-478411-q3:asia-south1:locofly-db
```

Then point your Flutter picker app's `baseUrl` to the new service URL, e.g.:

```dart
static const String baseUrl = 'https://locofly-api-1234567890.asia-south1.run.app';
```
