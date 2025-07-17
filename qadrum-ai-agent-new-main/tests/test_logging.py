import logging
import sys
from pathlib import Path
from flask import session
sys.path.append(str(Path(__file__).resolve().parents[1]))
import os
os.environ.setdefault('FLASK_SECRET_KEY', 'test-secret')
import app as app_module


def test_check_session_logs_no_user(caplog):
    caplog.set_level(logging.INFO)
    with app_module.app.test_client() as client:
        with client.session_transaction() as sess:
            sess.clear()
        caplog.clear()
        resp = client.get('/check-session')
        assert resp.status_code == 200
        assert resp.get_json() == {'logged_in': False}
        messages = [record.getMessage() for record in caplog.records]
        assert "check_session: no user_id in session" in messages


def test_auth0_callback_logs_login(monkeypatch, caplog):
    caplog.set_level(logging.INFO)
    with app_module.app.test_request_context('/callback'):
        def fake_authorize_access_token():
            return {'userinfo': {'sub': 'testuser', 'name': 'Test', 'email': 't@example.com', 'locale': 'en'}}
        monkeypatch.setattr(app_module.auth0, 'authorize_access_token', fake_authorize_access_token)
        monkeypatch.setattr(app_module.auth0, 'parse_id_token', lambda token: token['userinfo'])
        monkeypatch.setattr(app_module, 'create_new_thread', lambda: 'thread123')
        session.clear()
        app_module.auth0_callback()
        messages = [record.getMessage() for record in caplog.records]
        assert "User testuser logged in successfully" in messages
        assert session.get('user_id') == 'testuser'

