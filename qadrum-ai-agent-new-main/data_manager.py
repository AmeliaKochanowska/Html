
import json
import os
import logging

# Konfiguracja logowania
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Ścieżka do pliku z historią rozmów
CONVERSATIONS_FILE = "data/conversations.json"

def save_conversation(user_id, conversation):
    """
    Zapisuje konwersację użytkownika do pliku JSON.
    
    Args:
        user_id (str): Identyfikator użytkownika
        conversation (dict): Dane konwersacji do zapisania
    """
    try:
        if not os.path.exists("data"):
            os.makedirs("data")
            logger.info("Utworzono katalog data")
            
        try:
            with open(CONVERSATIONS_FILE, "r") as file:
                data = json.load(file)
        except FileNotFoundError:
            logger.info("Plik conversations.json nie istnieje. Tworzenie nowego pliku.")
            data = {}
            
        data[user_id] = conversation
        
        with open(CONVERSATIONS_FILE, "w") as file:
            json.dump(data, file, indent=4)
            logger.info(f"Zapisano konwersację dla użytkownika {user_id}")
    except Exception as e:
        logger.error(f"Błąd podczas zapisywania konwersacji: {str(e)}")
        
def load_conversation(user_id):
    """
    Wczytuje konwersację użytkownika z pliku JSON.
    
    Args:
        user_id (str): Identyfikator użytkownika
        
    Returns:
        dict: Dane konwersacji użytkownika lub pusty słownik, jeśli nie znaleziono
    """
    try:
        if not os.path.exists(CONVERSATIONS_FILE):
            logger.warning(f"Plik {CONVERSATIONS_FILE} nie istnieje")
            return {}
            
        with open(CONVERSATIONS_FILE, "r") as file:
            data = json.load(file)
            
        return data.get(user_id, {})
    except Exception as e:
        logger.error(f"Błąd podczas wczytywania konwersacji: {str(e)}")
        return {}

def get_all_conversations():
    """
    Pobiera wszystkie zapisane konwersacje.
    
    Returns:
        dict: Wszystkie zapisane konwersacje lub pusty słownik w przypadku błędu
    """
    try:
        if not os.path.exists(CONVERSATIONS_FILE):
            logger.warning(f"Plik {CONVERSATIONS_FILE} nie istnieje")
            return {}
            
        with open(CONVERSATIONS_FILE, "r") as file:
            data = json.load(file)
            
        return data
    except Exception as e:
        logger.error(f"Błąd podczas pobierania wszystkich konwersacji: {str(e)}")
        return {}
