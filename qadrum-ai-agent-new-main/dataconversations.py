
import json
import os

# Ścieżka do pliku z historią rozmów
CONVERSATIONS_FILE = "data/conversations.json"

def save_conversation(user_id, conversation):
    if not os.path.exists("data"):
        os.makedirs("data")
    try:
        with open(CONVERSATIONS_FILE, "r") as file:
            data = json.load(file)
    except FileNotFoundError:
        data = {}
    data[user_id] = conversation
    with open(CONVERSATIONS_FILE, "w") as file:
        json.dump(data, file, indent=4)
