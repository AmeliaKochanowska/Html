import sys
sys.path.insert(0, '.')
from modules.q_openai import q_OpenAI


class DummyThreads:
    def delete(self, _):
        pass


class DummyBeta:
    def __init__(self):
        self.threads = DummyThreads()


class DummyClient:
    def __init__(self):
        self.beta = DummyBeta()


def create_stub():
    inst = q_OpenAI.__new__(q_OpenAI)
    inst.hnd_ = DummyClient()
    inst.assistant_id_ = 'a'
    inst.threads_ = []
    return inst


def test_thread_check_valid():
    client = create_stub()
    client.threads_.append('123')
    assert client.thread_check('123') is True


def test_thread_check_invalid():
    client = create_stub()
    client.threads_.append('abc')
    assert client.thread_check('def') is False
    assert client.thread_check(None) is False
