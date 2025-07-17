#!/bin/bash

# Local server startup script

source .venv/bin/activate

# Load variables from .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

export FLASK_ENV=development
export FLASK_APP=app.py

python app.py
