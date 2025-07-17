import os
import logging
import json
import time
import uuid

import requests
import html2text
import zipfile # Do eksportu danych konta
import base64  # Do obsługi zawartości plików w formacie base64

from openai import OpenAI
from pathlib import Path

# --- Konfiguracja Logowania ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(funcName)s] %(message)s')
logger = logging.getLogger(__name__)

class q_OpenAI:
    """
    Klasa obsługujaca Open AI klienta
    """

    def __init__(self, assistant_id: str, api_key: str = None):
        self.api_key_ = None
        self.hnd_ = None
        self.assistant_id_ = None
        self.assistant_hnd_ = None
        self.response_ = None # last response
        self.threads_ = []

        self.flags_ = {
            'has_file_capability': False,
        }

        # POPRAWIONA LOGIKA INICJALIZACJI API KEY
        if api_key:
            self.api_key_ = api_key
            logger.info("API key provided in constructor")
        else:
            self.api_key_ = os.environ.get("OPENAI_API_KEY")
            if self.api_key_:
                logger.info("API key loaded from environment variable")
            else:
                logger.error("No API key found in environment variable OPENAI_API_KEY")
        
        # DODANE SZCZEGÓŁOWE LOGOWANIE
        logger.info(f"API key present: {bool(self.api_key_)}")
        if self.api_key_:
            logger.info(f"API key starts with: {self.api_key_[:10]}...")
            logger.info(f"API key length: {len(self.api_key_)}")
        
        self.__init_check_api_key()

        self.assistant_id_ = assistant_id
        self.__init_check_assistant()

    def __del__(self):
        if self.hnd_:
            for t in self.threads_:
                try:
                    self.hnd_.beta.threads.delete(t)
                except:
                    pass  # Ignoruj błędy podczas czyszczenia
            self.threads_ = []
            self.hnd_ = None

    @property
    def is_valid(self):
        return self.hnd_ is not None and self.assistant_id_ is not None

    @property
    def last_response(self):
        if not self.is_valid:
            return None
        return self.response_

    def __init_check_api_key(self):  # ← NAPRAWIONE: Właściwa indentacja jako metoda klasy
        logger.info("Checking API key...")

        # DODAJ TO NA POCZĄTKU FUNKCJI!
        project_id = os.environ.get("OPENAI_PROJECT_ID")

        if not self.api_key_:
            logger.error("No API key available")
            raise RuntimeError('ERROR_OPENAI_NO_KEY')

        if not self.api_key_.startswith('sk-'):
            logger.error(f"Invalid API key format. Key should start with 'sk-', got: {self.api_key_[:10]}...")
            raise RuntimeError('ERROR_OPENAI_INVALID_KEY_FORMAT')

        if self.api_key_.startswith('sk-proj-') and not project_id:
            logger.error("Project key detected, but OPENAI_PROJECT_ID not set in environment.")
            raise RuntimeError('ERROR_OPENAI_PROJECT_ID_MISSING')

        try:
            # KLUCZOWY FRAGMENT: WARUNKOWE PRZEKAZANIE project_id
            if self.api_key_.startswith('sk-proj-'):
                self.hnd_ = OpenAI(api_key=self.api_key_, project=project_id)
                logger.info(f"OpenAI client created with project ID: {project_id}")
            else:
                self.hnd_ = OpenAI(api_key=self.api_key_)
                logger.info("OpenAI client created with regular key")

            # TESTUJ POŁĄCZENIE
            try:
                # Prosta próba połączenia
                models = self.hnd_.models.list()
                logger.info("OpenAI connection test successful")
            except Exception as e:
                logger.error(f"OpenAI connection test failed: {e}")
                raise RuntimeError(f'ERROR_OPENAI_CONNECTION_FAILED: {str(e)}')
                
        except Exception as e:
            logger.error(f"Failed to create OpenAI client: {e}")
            raise RuntimeError(f'ERROR_OPENAI_NOT_INIT: {str(e)}')

    def __init_check_assistant(self):
        logger.info(f"Checking assistant with ID: {self.assistant_id_}")
        
        if not self.assistant_id_:
            logger.error("No assistant ID provided")
            raise RuntimeError('ERROR_OPENAI_NO_ASSISTANT')

        try:
            self.assistant_hnd_ = self.hnd_.beta.assistants.retrieve(self.assistant_id_)
            logger.info(f"Assistant retrieved successfully: {self.assistant_hnd_.name}")
            
            # POPRAWIONA LOGIKA SPRAWDZANIA TOOLS
            if hasattr(self.assistant_hnd_, 'tools') and self.assistant_hnd_.tools:
                logger.info(f"Assistant has {len(self.assistant_hnd_.tools)} tools")
                for i, tool in enumerate(self.assistant_hnd_.tools):
                    tool_type = None
                    if hasattr(tool, 'type'):
                        tool_type = tool.type
                    elif isinstance(tool, dict):
                        tool_type = tool.get('type')
                    
                    logger.info(f"Tool {i}: {tool_type}")
                    
                    # Sprawdź czy ma file capabilities (file_search lub retrieval)
                    if tool_type in ['file_search', 'retrieval']:
                        self.flags_['has_file_capability'] = True
                        logger.info(f"File capability found via tool: {tool_type}")
                        break
            else:
                logger.warning("Assistant has no tools")
                
            logger.info(f"File capability enabled: {self.flags_['has_file_capability']}")
            
        except Exception as e:
            logger.error(f"Failed to retrieve assistant {self.assistant_id_}: {e}")
            raise RuntimeError(f'ERROR_OPENAI_ASSISTANT_NOT_FOUND: {str(e)}')

    def check_functions(self, cap: str):
        try:
            return self.flags_.get(cap, False)
        except:
            return False

    def enable_file_capability(self):
        if not self.is_valid:
            logger.error("Cannot enable file capability - client not valid")
            return False

        if self.flags_['has_file_capability']:
            logger.info("File capability already enabled")
            return True

        # POPRAWIONA LOGIKA WŁĄCZANIA FILE CAPABILITY
        try:
            logger.info("Attempting to enable file capability...")
            assistant_tools = []
            
            if hasattr(self.assistant_hnd_, 'tools') and self.assistant_hnd_.tools:
                assistant_tools = list(self.assistant_hnd_.tools)
            
            # Dodaj file_search tool jeśli go nie ma
            has_file_tool = any(
                (hasattr(tool, 'type') and tool.type in ['file_search', 'retrieval']) or 
                (isinstance(tool, dict) and tool.get('type') in ['file_search', 'retrieval'])
                for tool in assistant_tools
            )
            
            if not has_file_tool:
                assistant_tools.append({"type": "file_search"})
                
                updated_assistant = self.hnd_.beta.assistants.update(
                    assistant_id=self.assistant_id_,
                    tools=assistant_tools
                )
                
                self.assistant_hnd_ = updated_assistant
                logger.info("File capability enabled successfully")
            
            self.flags_['has_file_capability'] = True
            return True
            
        except Exception as ex:
            logger.error(f"Failed to enable file capability: {ex}")
            return False

    def upload_file(self, filepath: str, purpose: str = "assistants"):
        logger.info(f"Uploading file: {filepath}")
        
        if not self.is_valid:
            logger.error("Cannot upload file - client not valid")
            return False

        if not self.flags_['has_file_capability']:
            logger.error(f"Assistant {self.assistant_id_} does not have file permissions")
            return False

        if not filepath:
            logger.error("No filepath provided")
            return False

        fn = Path(filepath)
        if not fn or not fn.exists() or not fn.is_file():
            logger.error(f"File does not exist or invalid path: {filepath}")
            return False

        try:
            with open(fn, "rb") as f:
                response = self.hnd_.files.create(
                    file=f,
                    purpose=purpose
                )
            self.response_ = response
            logger.info(f"File uploaded successfully with ID: {response.id}")
            return True
        except Exception as ex:
            logger.error(f"Failed to upload file: {ex}")
            return False

    def thread_start(self):  # ← Właściwa indentacja
        """Rozpoczęcie nowego wątku."""
        if not self.is_valid:
            logger.error("Cannot start thread - client not valid")
            return None

        try:
            thread = self.hnd_.beta.threads.create()
            if thread and thread.id:
                # Sprawdź czy ID jest prawidłowe
                if not thread.id.startswith('thread_'):
                    logger.error(f"OpenAI zwróciło nieprawidłowy thread_id: {thread.id}")
                    return None
                
                self.threads_.append(thread.id)
                logger.info(f"Thread created successfully: {thread.id}")
                return thread.id
            else:
                logger.error("Thread creation returned invalid response")
                return None
        except Exception as e:
            logger.error(f"Failed to create thread: {e}")
            return None

    def thread_check(self, thread_id):  # ✅ Poprawna indentacja
        """Check whether thread_id exists and is valid."""
        if not self.is_valid:
            logger.error("Cannot check thread - client not valid")
            return False

        if not thread_id:
            logger.error("No thread_id provided for check")
            return False
            
        # Właściwa walidacja formatu thread_id
        if not isinstance(thread_id, str):
            logger.error(f"Thread_id must be string, got: {type(thread_id)}")
            return False
            
        if not thread_id.startswith('thread_'):
            logger.error(f"Invalid thread_id format: {thread_id}. Expected format: thread_*")
            return False
            
        # OpenAI thread_id mają określoną długość (około 29 znaków)
        if len(thread_id) < 20 or len(thread_id) > 50:
            logger.error(f"Invalid thread_id length: {len(thread_id)}. Expected 20-50 chars")
            return False

        # Sprawdź czy thread istnieje w OpenAI
        try:
            thread_obj = self.hnd_.beta.threads.retrieve(thread_id)
            if thread_obj and thread_obj.id == thread_id:
                # Jeśli nie ma w lokalnej liście, dodaj
                if str(thread_id) not in self.threads_:
                    self.threads_.append(str(thread_id))
                return True
            else:
                logger.error(f"Thread {thread_id} exists but has different ID: {thread_obj.id}")
                return False
        except Exception as e:
            logger.error(f"Thread {thread_id} not found in OpenAI or API error: {e}")
            return False
        
    def thread_stop(self, thread_id):
        """Zakończenie wątku"""
        if not self.is_valid:
            return

        try:
            if thread_id in self.threads_:
                self.threads_.remove(thread_id)
            self.hnd_.beta.threads.delete(thread_id)
            logger.info(f"Thread stopped: {thread_id}")
        except Exception as e:
            logger.error(f"Failed to stop thread {thread_id}: {e}")
