import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('AUTH0_CLIENT_ID', 'test')
os.environ.setdefault('AUTH0_CLIENT_SECRET', 'test')
os.environ.setdefault('AUTH0_DOMAIN', 'example.com')
os.environ.setdefault('AUTH0_CALLBACK_URL', 'http://localhost/callback')
os.environ.setdefault('FLASK_SECRET_KEY', 'test-secret')

from app import app


def test_callback_without_code():
    with app.test_client() as client:
        response = client.get('/callback')
        # When no authorization code is provided Auth0 redirects back to the
        # homepage, so we expect a redirect (302) rather than a 400 error.
        assert response.status_code == 302
