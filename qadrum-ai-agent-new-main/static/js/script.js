
// script.js

let currentTopic = "";

// Funkcja do wyboru tematu
function selectTopic(topic) {
    currentTopic = topic;
    document.getElementById("messages").innerHTML += `<p><strong>Wybrany temat:</strong> ${topic}</p>`;
}

// Funkcja do wysyłania wiadomości - uproszczona wersja dla debugowania
function sendMessage() {
    const userInput = document.getElementById("user-input").value;
    const messagesDiv = document.getElementById("messages");

    // Dodaj wiadomość użytkownika
    if (!userInput.trim()) {
        alert("Wpisz wiadomość!");
        return;
    }
    messagesDiv.innerHTML += `<p><strong>Ty:</strong> ${userInput}</p>`;
    document.getElementById("user-input").value = "";
    
    // Dodaj komunikat "oczekiwanie..."
    const waitingMsgId = 'waiting-msg-' + Date.now();
    messagesDiv.innerHTML += `<p id="${waitingMsgId}"><strong>AI:</strong> <em>Oczekiwanie na odpowiedź...</em></p>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Uproszczone zapytanie z dodatkowym logowaniem
    console.log("Próba wysłania zapytania do: http://127.0.0.1:5000/ask");
    fetch('http://127.0.0.1:5000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userInput })
    })
    .then(response => {
        console.log("Odpowiedź serwera:", response);
        if (!response.ok) {
            throw new Error(`Błąd serwera: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Otrzymane dane:", data);
        if (data.answer) {
            document.getElementById(waitingMsgId).innerHTML = `<strong>AI:</strong> ${data.answer}`;
        } else {
            document.getElementById(waitingMsgId).innerHTML = `<strong>AI:</strong> Otrzymano pustą odpowiedź.`;
        }
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    })
    .catch(error => {
        console.error("Błąd:", error);
        document.getElementById(waitingMsgId).innerHTML = `<strong>Błąd:</strong> Nie udało się uzyskać odpowiedzi. (${error.message})`;
    });
}

// Funkcja do eksportu pliku
function exportFile(format) {
    console.log("Próba pobrania pliku w formacie:", format);
    fetch(`http://127.0.0.1:5000/export?format=${format}`, {
        method: 'GET'
    })
    .then(response => {
        console.log("Odpowiedź serwera przy eksporcie:", response);
        if (!response.ok) {
            throw new Error(`Błąd serwera: ${response.status}`);
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deck.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    })
    .catch(error => {
        console.error("Błąd podczas eksportu:", error);
        alert(`Nie udało się pobrać pliku. Błąd: ${error.message}`);
    });
}

// Nasłuchuj na klawisz Enter w polu input
document.addEventListener("DOMContentLoaded", function() {
    const inputField = document.getElementById("user-input");
    if (inputField) {
        inputField.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    } else {
        console.error("Element 'user-input' nie został znaleziony!");
    }
    
    console.log("Skrypt załadowany poprawnie");
});
