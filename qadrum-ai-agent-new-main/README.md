# qadrum-ai-agent

Qadrum - AI Agent

Pomoc dla Jarka.
Założyłem tutaj repo, aby lepiej zarządzać zmianami.

## Installation

Before installing the Python packages listed in `requirements.txt` make sure
the `libmagic` system library is installed. On Debian or Ubuntu run:

```bash
sudo apt-get update
sudo apt-get install libmagic1
```

macOS users can run `brew install libmagic`. On Windows install a compatible
`libmagic` package (for example via Chocolatey) or use the `python-magic-bin`
wheel.

## Configuration

All required secrets are read from environment variables. You can store them in a `.env` file (see `.env.example`) and the helper script will load them automatically. Alternatively you can export them in your shell configuration such as `~/.zshrc`.

Set the `OPENAI_API_KEY` environment variable with your OpenAI key before running the app:

You can also set a fallback flag so the application uses a built‑in key if your own key is not provided:

```bash
export OPENAI_API_KEY="sk-..."        # real key
export Q_FLAG_OPENAI_API_KEY_USE_DEFAULT=TRUE  # optional fallback
```

If you just want to try the project locally, set only the fallback flag:

```bash
export Q_FLAG_OPENAI_API_KEY_USE_DEFAULT=TRUE
```

Important: the built‑in key is intended only for quick local tests.*

When neither variable is set, the application logs an error `Brak klucza OpenAI. Ustaw zmienną "OPENAI_API_KEY" lub Q_FLAG_OPENAI_API_KEY_USE_DEFAULT=TRUE.` and no conversation thread is created. The application and utility scripts such as testopenai.py read the key from environment variables.

### Upload file API

The `/upload-file` endpoint returns only non-sensitive metadata after a successful upload. The `filePath` field has been removed from the response.

```
{
  "success": true,
  "fileId": "<uuid>",
  "originalName": "<filename>",
  "fileData": { /* optional preview */ }
}
```

### Thread management

The helper class `q_OpenAI` offers `thread_start()` for creating conversation
threads. The method now returns the new thread identifier on success or
`None` when a thread cannot be created.



### Auth0 Login

To enable authentication via Auth0 set the following variables before running the app:

```bash
export AUTH0_DOMAIN="your-domain.auth0.com"
export AUTH0_CLIENT_ID="<client-id>"
export AUTH0_CLIENT_SECRET="<client-secret>"
export AUTH0_CALLBACK_URL="http://127.0.0.1:5000/callback"
```

The `FLASK_SECRET_KEY` variable should also be set to a random value in production.

Auth0 can handle social logins such as Google when enabled in your Auth0 tenant.

### System dependencies

Before installing Python packages make sure the `libmagic` system library is installed (for example on Debian/Ubuntu: `apt-get install libmagic1`).
