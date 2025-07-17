/**
 * Główny plik JavaScript dla aplikacji Deckster AI Assistant
 * Zintegrowana wersja z API backendu Flask
 */

// Poczekaj na załadowanie całego dokumentu DOM przed uruchomieniem kodu
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM w pełni załadowany - inicjalizacja aplikacji");

    // Zmienne dla śledzenia wybranego planu
    let selectedPlan = "";
    let selectedPlanName = "";
    let currentCategory = null;
    let threadId = null; // Identyfikator wątku konwersacji
    let apiBaseUrl = ''; // Bazowy URL do API (puste = ten sam host)

    // Zmienna dla obecnie eksportowanego tekstu
    let currentExportText = "";

    // Przechowywanie konwersacji dla każdej kategorii
    const categoryConversations = {};

    // Obiekt do przechowywania zapisanych odpowiedzi do pitch decku
    const savedContent = {};

    // Przechowywanie informacji o feedbacku (kciuk w górę/dół)
    const feedbackData = {
        positive: [],  // lista identyfikatorów wiadomości z pozytywnym feedbackiem
        negative: []   // lista identyfikatorów wiadomości z negatywnym feedbackiem
    };

    // Nowe zmienne dla etapu 3
    let userFiles = []; // Lista plików użytkownika

    // Nowe zmienne dla etapu 4
    let currentUser = {
        name: "Jarosław Frankowski", // Domyślna wartość, zastąpiona danymi z sesji/backendu
        email: "jaroslaw.frankowski@example.com", // Domyślna wartość
        plan: "Deckster Free", // Domyślna wartość
        language: "en", // Domyślny język
        notificationsEnabled: true // Domyślna wartość
    };

    // Zmienna do przechowywania historii ogólnego chatu
    let generalChatHistory = {};

    // ======== Funkcje walidacji thread_id ========
/**
 * Waliduje format thread_id po stronie JavaScript
 * @param {string} threadId - ID wątku do sprawdzenia
 * @returns {boolean} - true jeśli format jest prawidłowy
 */
function is_valid_thread_id(threadId) {
    if (!threadId || typeof threadId !== 'string') return false;
    if (!threadId.startsWith('thread_')) return false;
    if (threadId.length < 20 || threadId.length > 50) return false;
    
    // OpenAI używa alfanumeryczne + myślniki
    const validPattern = /^thread_[a-zA-Z0-9_-]+$/;
    return validPattern.test(threadId);
}

    // Category prompts
    const categoryPrompts = {
        "Problem": "Describe the pain of the customer (or the customer's customer). Outline how the customer addresses the issue today.",
        "Solution": "Demonstrate your company's value proposition to make the customer's life better. Show where your product physically sits. Provide use cases.",
        "Why Now": "Set-up the historical evolution of your category. Define recent trends that make your solution possible.",
        "Market Size": "Identify/profile the customer you cater to. Calculate the TAM (top down), SAM (bottoms up) and SOM.",
        "Competition": "List competitors, competitive advantages, positioning.",
        "Product": "Product line-up (form factor, functionality, features, architecture, intellectual property). Development roadmap.",
        "Business Model": "Revenue model, Pricing, Average account size and/or lifetime value, Sales & distribution model, Customer/pipeline list Traction.",
        "Team Founders & Management": "Founders & Management. Board of Directors/Board of Advisors.",
        "Financials": "P&L, Balance sheet, Cash flow, Cap table.",
        "The Deal": "Investment terms, Valuation, Use of funds",
        "Deckster & Customer Care": "How can Deckster help with your business needs",
        "Company Purpose": "Define the company/business in a single declarative sentence."
    };
    
    // Domyślne podpowiedzi dla pola wiadomości po kliknięciu w kategorie
    const categoryPlaceholders = {
        "Problem": "Opisz problem, który rozwiązuje Twój produkt. Jakie trudności napotykają Twoi potencjalni klienci?",
        "Solution": "Opisz, w jaki sposób Twój produkt rozwiązuje problem klienta. Jaką wartość dostarcza?",
        "Why Now": "Wyjaśnij, dlaczego teraz jest właściwy moment dla Twojego rozwiązania. Jakie trendy rynkowe to potwierdzają?",
        "Market Size": "Opisz potencjalny rozmiar rynku dla Twojego produktu. Kogo obsługujesz?",
        "Competition": "Wymień głównych konkurentów i opisz Twoje przewagi konkurencyjne.",
        "Product": "Opisz funkcje i cechy Twojego produktu lub usługi.",
        "Business Model": "Wyjaśnij, w jaki sposób Twój biznes będzie generował przychody. Jaki jest model cenowy?",
        "Team Founders & Management": "Opisz kluczowe osoby w zespole i ich doświadczenie.",
        "Financials": "Podaj informacje o przychodach, kosztach i prognozach finansowych.",
        "The Deal": "Opisz warunki inwestycji, wycenę i jak zostaną wykorzystane środki.",
        "Deckster & Customer Care": "W czym możemy Ci pomóc? Jakie masz pytania dotyczące rozwoju biznesu?",
        "Company Purpose": "Opisz cel Twojej firmy w jednym zwięzłym zdaniu."
    };
    
    // Track completed categories
    const completedCategories = {
        "Business Model": false,
        "Competition": false,
        "Product": false
        // Add other categories here as needed for progress tracking
    };

    // ======== Elementy DOM ========
    // Główne ekrany aplikacji
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const introSection = document.getElementById('introSection');
    const settingsPage = document.getElementById('settingsPage');

    // Elementy logowania
    const loginBtn = document.querySelector('.login-btn');
    const registerLink = document.getElementById('registerLink');

    // Elementy czatu
    const sendButton = document.getElementById('sendButton');
    const chatInput = document.querySelector('.chat-input');
    const chatContainer = document.getElementById('chatContainer');
    const initialView = document.getElementById('initialView');

    // Elementy plików
    const attachButton = document.getElementById('attachButton');
    const fileUploadContainer = document.getElementById('fileUploadContainer');
    const fileInput = document.getElementById('fileInput');
    const dropArea = document.getElementById('dropArea');
    const fileList = document.getElementById('fileList');
    let dropInProgress = false; // Flag to avoid duplicate handling on drop

    // Elementy progresji
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');

    // Elementy modalu eksportu
    const exportModal = document.getElementById('exportModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelExportBtn = document.getElementById('cancelExportBtn');
    const confirmExportBtn = document.getElementById('confirmExportBtn');

    // Elementy profilu i menu
    const backToMainBtn = document.getElementById('backToMainBtn');
    const userDropdown = document.getElementById('userDropdown');
    const profileToggle = document.getElementById('profileToggle');
    const contactMenuItem = document.getElementById('contactMenuItem');
    const contactSubmenu = document.getElementById('contactSubmenu');
    const settingsMenuItem = document.getElementById('settingsMenuItem');
    const introMenuItem = document.getElementById('introMenuItem');
    const userDisplayName = document.getElementById('userDisplayName');
    const selectedPlanBadge = document.getElementById('selectedPlanBadge'); // Dodano dla spójności

    // Elementy zmiany hasła
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const closeChangePasswordModal = document.getElementById('closeChangePasswordModal');
    const cancelChangePasswordBtn = document.getElementById('cancelChangePasswordBtn');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const passwordMatchIndicator = document.getElementById('passwordMatchIndicator');
    // Elementy resetu hasła (stare)
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const passwordResetModal = document.getElementById('passwordResetModal');
    const closeResetModal = document.getElementById('closeResetModal');
    const cancelResetBtn = document.getElementById('cancelResetBtn');
    const passwordResetForm = document.getElementById('passwordResetForm');
    const confirmationModal = document.getElementById('confirmationModal');
    const closeConfirmModal = document.getElementById('closeConfirmModal');
    const confirmOkBtn = document.getElementById('confirmOkBtn');

    // Elementy nawigacji
    const backToAppFromIntroBtn = document.getElementById('backToAppFromIntroBtn');

    // Elementy wyszukiwania
    const searchInput = document.querySelector('.search-input');

    // Elementy zapisanych odpowiedzi
    const savedContentPanel = document.getElementById('savedContentPanel');
    const closeSavedContentBtn = document.getElementById('closeSavedContentBtn');
    const downloadPitchDeckBtn = document.getElementById('downloadPitchDeckBtn');
    const generatePresentationBtn = document.getElementById('generatePresentationBtn');

    // Tworzenie przycisku do otwierania panelu zapisanych odpowiedzi (jeśli nie istnieje w HTML)
    let viewSavedContentBtn = document.getElementById('viewSavedContentBtn');
    if (!viewSavedContentBtn) {
        viewSavedContentBtn = document.createElement('button');
        viewSavedContentBtn.className = 'view-saved-content-btn';
        viewSavedContentBtn.id = 'viewSavedContentBtn';
        viewSavedContentBtn.innerHTML = '<i class="fas fa-file-alt"></i>';
        viewSavedContentBtn.title = 'View Saved Content';
        document.body.appendChild(viewSavedContentBtn);
    }

    // Elementy plików użytkownika
    const viewUserFilesBtn = document.getElementById('viewUserFilesBtn');
    const userFilesPanel = document.getElementById('userFilesPanel');
    const closeUserFilesBtn = document.getElementById('closeUserFilesBtn');
    const uploadNewFileBtn = document.getElementById('uploadNewFileBtn');

    // Elementy wyszukiwania Web
    const webSearchModal = document.getElementById('webSearchModal');
    const closeWebSearchModal = document.getElementById('closeWebSearchModal');
    const webSearchInput = document.getElementById('webSearchInput');
    const runWebSearchBtn = document.getElementById('runWebSearchBtn');
    const webSearchResults = document.getElementById('webSearchResults');
    const webSearchLoading = document.getElementById('webSearchLoading');
    const toolsBars = document.querySelectorAll('.tools-bar');

    // Elementy analizy URL
    const urlAnalysisModal = document.getElementById('urlAnalysisModal');
    const closeUrlAnalysisModal = document.getElementById('closeUrlAnalysisModal');
    const urlInput = document.getElementById('urlInput');
    const analyzeUrlBtn = document.getElementById('analyzeUrlBtn');
    const urlAnalysisResults = document.getElementById('urlAnalysisResults');
    const urlAnalysisLoading = document.getElementById('urlAnalysisLoading');
    // Elementy udostępniania i planów
    const shareMenuItem = document.getElementById('shareMenuItem');
    const shareModal = document.getElementById('shareModal');
    const closeShareModal = document.getElementById('closeShareModal');
    const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');
    const generateNewLinkBtn = document.getElementById('generateNewLinkBtn');
    const shareViaEmailBtn = document.getElementById('shareViaEmailBtn');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const upgradeBtn = document.querySelector('.upgrade-btn');
    const upgradePlanModal = document.getElementById('upgradePlanModal');
    const closeUpgradePlanModal = document.getElementById('closeUpgradePlanModal');
    const planSelectBtns = document.querySelectorAll('.plan-select-btn:not(.current-plan)');

    // New Chat button
    const newChatBtn = document.querySelector('.new-chat-btn');

    // Elementy strony ustawień (specyficzne dla Etapu 1)
    const currentEmailValue = document.getElementById('currentEmailValue');
    const changeEmailBtn = document.getElementById('changeEmailBtn');
    const currentProfileName = document.getElementById('currentProfileName');
    const editProfileNameBtn = document.getElementById('editProfileNameBtn');
    const emailNotifyToggle = document.getElementById('emailNotifyToggle');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    // Sprawdź tryb deweloperski z URL
    const urlParams = new URLSearchParams(window.location.search);
    const devMode = urlParams.has('dev_mode');
    const autoLogin = urlParams.has('auto_login'); // Dodany parametr dla automatycznego logowania podczas testowania

    // Zmienne dla pola wejściowego na ekranie głównym
    const mainInputContainer = document.getElementById('mainInputContainer');
    const mainChatInput = document.getElementById('mainChatInput');
    const mainSendButton = document.getElementById('mainSendButton');
    const mainAttachButton = document.getElementById('mainAttachButton');

    /**
     * System powiadomień
     * @param {string} message - Wiadomość do wyświetlenia
     * @param {string} type - Typ powiadomienia (success, error, info, warning)
     */
    function showNotification(message, type = 'info') {
        const notificationSystem = document.getElementById('notificationSystem');
        if (!notificationSystem) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        notificationSystem.appendChild(notification);

        // Dodaj event listener do przycisku zamykania
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                notification.classList.add('hide');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            });
        }

        // Automatycznie ukryj powiadomienie po określonym czasie
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    /**
     * Helper function to format a date
     * @param {Date|string|number} date - Date object, ISO string, or timestamp
     * @returns {string} - Formatted date string
     */
    function formatDate(date) {
        if (!date) return 'Unknown date';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid date';
        
        // Format the date: e.g., "Jan 15, 2023 at 14:30"
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(d);
    }

    /**
     * Helper function to escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Helper function to copy text to clipboard
     * @param {string} text - Text to copy
     */
    function copyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }

    /**
     * Helper function to prevent default events
     * @param {Event} e - Event object
     */
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Helper function to highlight drop area
     */
    function highlight() {
        if (dropArea) dropArea.classList.add('highlight');
    }

    /**
     * Helper function to unhighlight drop area
     */
    function unhighlight() {
        if (dropArea) dropArea.classList.remove('highlight');
    }

    /**
     * Helper function to handle dropped files
     * @param {Event} e - Drop event
     */
    function handleDrop(e) {
        dropInProgress = true;
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
        // Reset flag after the drop event fully propagates to avoid duplicate handling
        setTimeout(() => {
            dropInProgress = false;
        }, 0);
    }
    /**
     * Helper function to update progress bar
     */
    function updateProgress() {
        // Calculate progress based on completed categories
        const totalCategories = Object.keys(completedCategories).length;
        const completedCount = Object.values(completedCategories).filter(Boolean).length;
        
        let percent = 0;
        if (totalCategories > 0) {
            percent = Math.round((completedCount / totalCategories) * 100);
        }
        
        // Update UI
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercentage) progressPercentage.textContent = `${percent}%`;
    }

    /**
     * Filter categories and history based on search term
     * @param {string} searchTerm - Search query
     */
    function filterHistoryAndCategories(searchTerm) {
        // Apply to categories
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            const categoryText = item.textContent.toLowerCase();
            if (searchTerm === '' || categoryText.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Apply to history items
        const historyItems = document.querySelectorAll('.history-list .category-item');
        historyItems.forEach(item => {
            const historyText = item.textContent.toLowerCase();
            if (searchTerm === '' || historyText.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Search through conversations content
     * @param {string} searchTerm - Search query
     */
    function searchConversations(searchTerm) {
        // This would search through actual chat content
        // For now, just show a notification
        showNotification(`Searching for: "${searchTerm}" is not implemented yet.`, 'info');
    }

    /**
     * Render saved content in the panel
     */
    function renderSavedContent() {
        if (!savedContentPanel) return;
        
        const sectionsContainer = savedContentPanel.querySelector('.saved-content-sections');
        if (!sectionsContainer) return;
        
        // Clear existing content
        sectionsContainer.innerHTML = '';
        
        // Check if there are any saved items
        const hasContent = Object.keys(savedContent).some(section => savedContent[section].length > 0);
        
        if (!hasContent) {
            sectionsContainer.innerHTML = `
                <div class="saved-content-empty">
                    <p>No content saved yet. Use "Add to Pitch Deck" when viewing AI responses.</p>
                </div>
            `;
            return;
        }
        // Sort sections alphabetically
        const sortedSections = Object.keys(savedContent).sort();
        
        for (const section of sortedSections) {
            const items = savedContent[section];
            if (!items || items.length === 0) continue;
            
            const sectionElement = document.createElement('div');
            sectionElement.className = 'saved-section';
            
            sectionElement.innerHTML = `
                <div class="saved-section-header">
                    <h4>${escapeHtml(section)}</h4>
                    <span class="saved-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="saved-items"></div>
            `;
            
            const itemsContainer = sectionElement.querySelector('.saved-items');
            
            items.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.className = 'saved-item';
                
                itemElement.innerHTML = `
                    <div class="saved-item-header">
                        <span class="saved-date">${formatDate(item.timestamp)}</span>
                        <div class="saved-item-actions">
                            <button class="saved-item-action delete-saved" data-section="${escapeHtml(section)}" data-index="${index}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="saved-item-content">${escapeHtml(item.content)}</div>
                `;
                
                itemsContainer.appendChild(itemElement);
            });
            
            sectionsContainer.appendChild(sectionElement);
        }
        
        // Add event listeners for delete buttons
        const deleteButtons = sectionsContainer.querySelectorAll('.delete-saved');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const section = this.getAttribute('data-section');
                const index = parseInt(this.getAttribute('data-index'), 10);
                
                if (section && !isNaN(index) && savedContent[section] && savedContent[section][index]) {
                    // Remove the item
                    savedContent[section].splice(index, 1);
                    
                    // If section is now empty, remove it
                    if (savedContent[section].length === 0) {
                        delete savedContent[section];
                    }
                    
                    // Re-render the panel
                    renderSavedContent();
                    
                    // Update badge
                    updateSavedContentBadge();
                    
                    showNotification('Item removed from your pitch deck.', 'info');
                }
            });
        });
    }
    /**
     * Toggle saved content panel visibility
     */
    function toggleSavedContentPanel() {
        if (!savedContentPanel) return;
        
        const isOpen = savedContentPanel.classList.contains('open');
        
        if (isOpen) {
            savedContentPanel.classList.remove('open');
        } else {
            // Close other panels
            if (userFilesPanel) userFilesPanel.classList.remove('open');
            
            // Update content before showing
            renderSavedContent();
            
            // Show this panel
            savedContentPanel.classList.add('open');
        }
    }

    /**
     * Update saved content badge (count indicator)
     */
    function updateSavedContentBadge() {
        const viewSavedContentBtn = document.getElementById('viewSavedContentBtn');
        const mobileSavedBtn = document.querySelector('.mobile-saved-btn');
    
        if (!viewSavedContentBtn) return;
    
        // Count total saved items
        let totalItems = 0;
        Object.values(savedContent).forEach(items => {
            totalItems += items.length;
        });
    
        // Update desktop badge
        let badge = viewSavedContentBtn.querySelector('.badge');
    
        if (totalItems > 0) {
            const badgeText = totalItems > 99 ? '99+' : totalItems;
        
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge';
                viewSavedContentBtn.appendChild(badge);
            }
            badge.textContent = badgeText;
            badge.style.display = 'block';
        
            // ✅ Update mobile badge
            if (mobileSavedBtn) {
                let mobileBadge = mobileSavedBtn.querySelector('.badge');
                if (!mobileBadge) {
                    mobileBadge = document.createElement('span');
                    mobileBadge.className = 'badge';
                    mobileBadge.style.cssText = `
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: #e53e3e;
                        color: white;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        font-size: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        min-width: 20px;
                    `;
                    mobileSavedBtn.appendChild(mobileBadge);
                }
                mobileBadge.textContent = badgeText;
                mobileBadge.style.display = 'flex';
            }
        } else {
            if (badge) badge.style.display = 'none';
        
            // Hide mobile badge
            if (mobileSavedBtn) {
                const mobileBadge = mobileSavedBtn.querySelector('.badge');
                if (mobileBadge) mobileBadge.style.display = 'none';
            }
        }
    }

    /**
     * Toggle user files panel visibility
     */
    function toggleUserFilesPanel() {
        if (!userFilesPanel) return;
        
        const isOpen = userFilesPanel.classList.contains('open');
        
        if (isOpen) {
            userFilesPanel.classList.remove('open');
        } else {
            // Close other panels
            if (savedContentPanel) savedContentPanel.classList.remove('open');
            
            // Update content before showing
            renderUserFiles();
            
            // Show this panel
            userFilesPanel.classList.add('open');
        }
    }
    /**
     * Render user files in the panel
     */
    function renderUserFiles() {
        if (!userFilesPanel) return;
        
        const filesListContainer = userFilesPanel.querySelector('.user-files-list');
        if (!filesListContainer) return;
        
        // Clear existing content
        filesListContainer.innerHTML = '';
        
        // Check if there are any files
        if (!userFiles || userFiles.length === 0) {
            filesListContainer.innerHTML = `
                <div class="user-files-empty">
                    No files uploaded yet. Click the paperclip icon to upload files.
                </div>
            `;
            return;
        }
        
        // Sort files by date (newest first)
        const sortedFiles = [...userFiles].sort((a, b) => {
            const dateA = new Date(a.added || 0);
            const dateB = new Date(b.added || 0);
            return dateB - dateA;
        });
        
        // Create file list
        sortedFiles.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = 'user-file-item';
            
            // Determine file icon based on type
            let fileIcon = 'file';
            if (file.type) {
                if (file.type.startsWith('image/')) fileIcon = 'file-image';
                else if (file.type.startsWith('text/')) fileIcon = 'file-alt';
                else if (file.type.startsWith('application/pdf')) fileIcon = 'file-pdf';
                else if (file.type.includes('spreadsheet') || file.type.includes('excel')) fileIcon = 'file-excel';
                else if (file.type.includes('document') || file.type.includes('word')) fileIcon = 'file-word';
            }
            
            // Format file size
            const fileSize = file.size ? formatFileSize(file.size) : '';
            
            fileElement.innerHTML = `
                <div class="file-icon"><i class="fas fa-${fileIcon}"></i></div>
                <div class="file-details">
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        ${fileSize ? `<span class="file-size">${fileSize}</span>` : ''}
                        <span class="file-date">${formatDate(file.added)}</span>
                        ${file.category ? `<span class="file-category">${escapeHtml(file.category)}</span>` : ''}
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action view-file" data-file-id="${file.id}" title="View File">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="file-action download-file" data-file-id="${file.id}" title="Download File">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-action delete-file" data-file-id="${file.id}" title="Delete File">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            filesListContainer.appendChild(fileElement);
        });
        // Add event listeners for file actions
        filesListContainer.querySelectorAll('.view-file').forEach(button => {
            button.addEventListener('click', function() {
                const fileId = this.getAttribute('data-file-id');
                if (fileId) {
                    window.open(`${apiBaseUrl}/view-file/${fileId}`, '_blank');
                }
            });
        });
        
        filesListContainer.querySelectorAll('.download-file').forEach(button => {
            button.addEventListener('click', function() {
                const fileId = this.getAttribute('data-file-id');
                if (fileId) {
                    window.location.href = `${apiBaseUrl}/download-file/${fileId}`;
                }
            });
        });
        
        filesListContainer.querySelectorAll('.delete-file').forEach(button => {
            button.addEventListener('click', function() {
                const fileId = this.getAttribute('data-file-id');
                if (fileId && confirm('Are you sure you want to delete this file?')) {
                    // TODO: Implement file deletion API call
                    showNotification('File deletion not implemented yet.', 'info');
                }
            });
        });
    }

    /**
     * Format file size with appropriate units
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // DODAJ TUTAJ NOWĄ FUNKCJĘ:
/**
 * Generuje inicjały na podstawie imienia i nazwiska
 * @param {string} name - Imię i nazwisko użytkownika
 * @param {string} email - Email użytkownika (fallback)
 * @returns {string} - Inicjały (1-2 znaki)
 */
function generateInitials(name, email) {
    // Zabezpieczenie przed null/undefined
    name = name || '';
    email = email || '';
    
    // Sprawdź czy mamy prawidłowe imię
    if (name && typeof name === 'string' && name.trim() !== '') {
        const nameParts = name.trim().split(/\s+/).filter(part => part.length > 0);
        
        if (nameParts.length >= 2) {
            // Imię i nazwisko - weź pierwszą literę każdego
            return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
        } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
            // Tylko jedno słowo - weź pierwsze dwie litery
            return nameParts[0].substring(0, 2).toUpperCase();
        } else if (nameParts.length === 1 && nameParts[0].length === 1) {
            // Tylko jedna litera w imieniu
            return nameParts[0].toUpperCase() + 'U';
        }
    }
    
    // Fallback do emaila
    if (email && typeof email === 'string' && email.includes('@')) {
        const emailPart = email.split('@')[0];
        
        if (emailPart && emailPart.length > 0) {
            if (emailPart.includes('.')) {
                const parts = emailPart.split('.').filter(part => part.length > 0);
                if (parts.length >= 2) {
                    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                } else if (parts.length === 1 && parts[0].length >= 2) {
                    return parts[0].substring(0, 2).toUpperCase();
                }
            } else if (emailPart.includes('-')) {
                const parts = emailPart.split('-').filter(part => part.length > 0);
                if (parts.length >= 2) {
                    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                } else if (parts.length === 1 && parts[0].length >= 2) {
                    return parts[0].substring(0, 2).toUpperCase();
                }
            } else if (emailPart.length >= 2) {
                // Weź pierwsze dwie litery emaila
                return emailPart.substring(0, 2).toUpperCase();
            } else if (emailPart.length === 1) {
                return emailPart.toUpperCase() + 'U';
            }
        }
    }
    
    // Ultimate fallback
    return 'UN';
}
    /**
 * Zapisuje dane użytkownika w localStorage przed wylogowaniem
 */
function preserveUserData() {
    if (!currentUser.user_id) return;
    
    const userDataToPreserve = {
        savedContent: savedContent,
        userFiles: userFiles,
        generalChatHistory: generalChatHistory,
        categoryConversations: categoryConversations,
        avatar: localStorage.getItem('userAvatar_' + currentUser.user_id),
        hasSeenIntro: localStorage.getItem('hasSeenIntro_' + currentUser.user_id),
        timestamp: Date.now()
    };
    
    // Zapisz dane z prefixem, aby były dostępne po ponownym zalogowaniu
    localStorage.setItem('preservedUserData_' + currentUser.user_id, JSON.stringify(userDataToPreserve));
    console.log("User data preserved for user:", currentUser.user_id);
}

/**
 * Przywraca dane użytkownika po ponownym zalogowaniu
 */
function restoreUserData() {
    if (!currentUser.user_id) return;
    
    try {
        const preservedDataStr = localStorage.getItem('preservedUserData_' + currentUser.user_id);
        if (!preservedDataStr) {
            console.log("No preserved data found for user:", currentUser.user_id);
            return;
        }
        
        const preservedData = JSON.parse(preservedDataStr);
        
        // Sprawdź czy dane nie są za stare (np. starsze niż 30 dni)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (preservedData.timestamp < thirtyDaysAgo) {
            console.log("Preserved data too old, removing...");
            localStorage.removeItem('preservedUserData_' + currentUser.user_id);
            return;
        }
        
        // POPRAWKA: NIE przywracaj danych profilu z localStorage
        // Bo teraz są w backendzie. Przywróć tylko UI state:
        
        if (preservedData.savedContent) {
            Object.assign(savedContent, preservedData.savedContent);
            updateSavedContentBadge();
        }
        
        if (preservedData.userFiles && Array.isArray(preservedData.userFiles)) {
            userFiles = [...preservedData.userFiles];
            updateUserFilesBadge();
        }
        
        if (preservedData.generalChatHistory) {
            Object.assign(generalChatHistory, preservedData.generalChatHistory);
        }
        
        if (preservedData.categoryConversations) {
            Object.assign(categoryConversations, preservedData.categoryConversations);
        }
        
        if (preservedData.avatar) {
            localStorage.setItem('userAvatar_' + currentUser.user_id, preservedData.avatar);
        }
        
        if (preservedData.hasSeenIntro) {
            localStorage.setItem('hasSeenIntro_' + currentUser.user_id, preservedData.hasSeenIntro);
        }
        
        console.log("User data restored successfully for user:", currentUser.user_id);
        
    } catch (error) {
        console.error("Error restoring user data:", error);
        localStorage.removeItem('preservedUserData_' + currentUser.user_id);
    }
}

    /**
     * Funkcja do eksportu danych konta użytkownika
     * @returns {Promise} - Promise z wynikiem eksportu
     */
    async function exportAccountData() {
        try {
            showNotification("Preparing your data for export. This may take a moment...", "info");

            // Przygotuj odpowiednie opcje, aby otrzymać plik jako odpowiedź
            const options = {
                method: 'GET',
                headers: {
                    // Nie ustawiamy Content-Type na application/json, aby otrzymać plik
                },
                credentials: 'include' // Ważne dla ciasteczek sesji
            };

            // Wywołaj endpoint eksportu
            const response = await fetch(`${apiBaseUrl}/settings/data/export`, options);
            if (!response.ok) {
                let errorBody = 'No error body';
                try {
                    errorBody = await response.text();
                } catch (e) {}
                throw new Error(`Failed to export data: ${response.status} ${response.statusText}. Body: ${errorBody}`);
            }

            // Pobierz blob z odpowiedzi
            const blob = await response.blob();
            
            // Próba pobrania nazwy pliku z nagłówków
            let fileName = 'deckster_data_export.zip';
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches && matches[1]) {
                    fileName = matches[1].replace(/['"]/g, '');
                }
            } else {
                // Jeśli brak nagłówka, wygeneruj nazwę pliku z timestampem
                fileName = `deckster_data_export_${Date.now()}.zip`;
            }

            // Utwórz link do pobrania pliku
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();

            // Wyczyść URL obiektu po użyciu
           setTimeout(() => {
               window.URL.revokeObjectURL(url);
               document.body.removeChild(a);
               }, 0);

          showNotification("Your account data has been exported successfully!", "success");
          return true;
      } catch (error) {
          console.error("Error exporting account data:", error);
          showNotification(`Failed to export your data: ${error.message}`, "error");
          return false;
      }
  }

/**
   * Funkcja do usunięcia konta użytkownika
   * @param {string} password - Hasło użytkownika dla potwierdzenia
   * @returns {Promise} - Promise z wynikiem usunięcia
   */
  async function deleteUserAccount(password) {
      try {
          if (!password) {
              throw new Error("Password is required to confirm account deletion.");
          }

          showNotification("Processing account deletion request...", "info");

          const data = {
              password: password
          };

          const response = await callAPI('/settings/account/delete', data, 'POST');

if (response.success) {
              showNotification("Your account has been successfully deleted.", "success");
              
              // Po pomyślnym usunięciu, wyloguj i przekieruj do strony logowania
              setTimeout(() => {
                  window.location.href = '/'; // Przekieruj do strony głównej/logowania
              }, 2000);
              
              return true;
          } else {
              throw new Error(response.error || "Unknown error deleting account.");
          }
      } catch (error) {
          console.error("Error deleting account:", error);
          showNotification(`Failed to delete account: ${error.message}`, "error");
          return false;
      }
  }

  // --- Funkcje zarządzania historią konwersacji ---
   
/**
 * Ładuje i wyświetla historię konwersacji
 */
function loadConversationHistory() {
    const historyList = document.querySelector('.history-list');
    if (!historyList) return;
    
    // Wyczyść istniejącą listę historii
    historyList.innerHTML = '';
    
    // Sprawdź czy mamy ogólny chat
    const userId = currentUser.user_id || 'unknown_user';
    const generalHistory = generalChatHistory && generalChatHistory[userId];
    
    if (generalHistory && generalHistory.length > 0) {
        // Dodaj element dla ogólnego chatu
        const generalChatItem = document.createElement('div');
        generalChatItem.className = 'category-item history-item general-chat';
        generalChatItem.setAttribute('data-category', 'general');
        
        // Jeśli to aktualnie wybrany "kategoria", dodaj klasę active
        if (currentCategory === null) {
            generalChatItem.classList.add('active');
        }
        
        const latestGeneralChat = generalHistory[generalHistory.length - 1];
        const timestamp = new Date(latestGeneralChat.timestamp * 1000); // Konwersja timestampa
        
        generalChatItem.innerHTML = `
            <i class="fas fa-comments history-item-icon"></i>
            <span class="history-item-name">General Chat</span>
            <span class="history-item-date">${formatTime(timestamp)}</span>
        `;
        
        // Dodaj event listener do załadowania zapisanej konwersacji
        generalChatItem.addEventListener('click', function() {
            loadGeneralChat();
        });
        
        historyList.appendChild(generalChatItem);
    }
    
    // Sprawdź, czy jest historia kategorii do wyświetlenia
    if (Object.keys(categoryConversations).length === 0 && (!generalHistory || generalHistory.length === 0)) {
        // Jeśli nie ma historii w ogóle, pokaż komunikat
        const emptyItem = document.createElement('div');
        emptyItem.className = 'history-empty';
        emptyItem.textContent = 'No conversation history yet';
        historyList.appendChild(emptyItem);
        return;
    }
    
    // Dodaj historię kategorii
    // Posortuj kategorie alfabetycznie
    const sortedCategories = Object.keys(categoryConversations).sort();
    
    // Dodaj każdą kategorię jako element historii
    sortedCategories.forEach(category => {
        const historyItem = document.createElement('div');
        historyItem.className = 'category-item history-item';
        historyItem.setAttribute('data-category', category);
        
        // Jeśli to aktualnie wybrana kategoria, dodaj klasę active
        if (category === currentCategory) {
            historyItem.classList.add('active');
        }
        
        const date = new Date(); // W rzeczywistej aplikacji, użyj daty ostatniej interakcji
        
        historyItem.innerHTML = `
            <i class="fas fa-history history-item-icon"></i>
            <span class="history-item-name">${escapeHtml(category)}</span>
            <span class="history-item-date">${formatTime(date)}</span>
        `;
        
        // Dodaj event listener do załadowania zapisanej konwersacji
        historyItem.addEventListener('click', function() {
            selectCategory(category);
        });
        
        historyList.appendChild(historyItem);
    });
}
  
  /**
   * Aktualizuje historię po wysłaniu nowej wiadomości
   */
  function updateConversationHistory() {
      if (currentCategory && chatContainer) {
          // Zapisz aktualną zawartość czatu dla kategorii
          categoryConversations[currentCategory] = chatContainer.innerHTML;
          
          // Zapisz na backendzie (opcjonalnie)
          saveConversationToBackend(currentCategory, chatContainer.innerHTML);
          
          // Zaktualizuj listę historii
          loadConversationHistory();
          
          console.log(`Zaktualizowano historię dla kategorii: ${currentCategory}`);
      }
  }
  
  /**
   * Wysyła zawartość konwersacji do zapisania na backendzie
   */
  async function saveConversationToBackend(category, htmlContent) {
      try {
          const data = {
              category: category,
              content: htmlContent
          };
          
          await callAPI('/save-conversation', data, 'POST');
          console.log(`Conversation for category "${category}" saved to backend.`);
      } catch (error) {
          console.error(`Failed to save conversation to backend: ${error}`);
          // Nie pokazujemy powiadomienia użytkownikowi - to operacja w tle
      }
  }
  
  /**
   * Pobiera historię konwersacji z backendu
   */
  async function loadConversationHistoryFromBackend() {
      try {
          const response = await callAPI('/get-conversation-history', {}, 'GET');
          
          if (response.success && response.history) {
              // Załaduj historię z backendu do lokalnego stanu
              Object.entries(response.history).forEach(([category, data]) => {
                  if (data.content) {
                      categoryConversations[category] = data.content;
                  }
              });
              
              // Zaktualizuj widok historii
              loadConversationHistory();
              console.log("Conversation history loaded from backend.");
          }
      } catch (error) {
          console.error(`Failed to load conversation history from backend: ${error}`);
          // Kontynuuj z lokalną historią, jeśli jest dostępna
          loadConversationHistory();
      }
  }
  
  /**
   * Inicjalizuje obserwator zmian dla historii konwersacji
   */
  function initializeHistoryObserver() {
      if (chatContainer) {
          const observer = new MutationObserver(function(mutations) {
              // Kiedy treść czatu się zmienia, aktualizuj historię
              if (currentCategory) {
                  updateConversationHistory();
              }
          });
          
          // Obserwuj zmiany w dzieciach chatContainer
          observer.observe(chatContainer, { childList: true, subtree: true });
          console.log("Zainicjalizowano obserwator historii czatu");
      }
  }
  // ======== Funkcje API ========
/**
 * Funkcja do wysyłania zapytania do API
 * @param {string} endpoint - Endpoint API
 * @param {Object} data - Dane do wysłania
 * @param {string} method - Metoda HTTP (GET, POST, etc.)
 * @returns {Promise} - Promise z odpowiedzią API
 */
async function callAPI(endpoint, data = {}, method = 'POST') {
    try {
        const url = `${apiBaseUrl}${endpoint}`;

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Ważne dla wysyłania ciasteczek sesji
        };

        if (method !== 'GET' && Object.keys(data).length > 0) {
            options.body = JSON.stringify(data);
        }

        console.log(`Calling API: ${method} ${url}`, options);

        const response = await fetch(url, options);

        // Logowanie statusu odpowiedzi
        console.log(`API Response Status: ${response.status}`);

        if (!response.ok) {
            // Próba odczytania ciała odpowiedzi błędu
            let errorBody = 'No error body';
            try {
                errorBody = await response.text();
                console.error(`API Error Body: ${errorBody}`);
            } catch (e) {
                console.error("Could not read error body:", e);
            }
            
            // Jeśli mamy status 404, ale nie dotyczy żywotnych funkcji, wycisz błąd
            if (response.status === 404 && (
                endpoint === '/get-conversation-history' || 
                endpoint === '/save-conversation')) {
                console.warn(`Non-critical API 404 for endpoint: ${endpoint}`);
                return { success: false, error: `Endpoint not available: ${endpoint}` };
            }
            
            throw new Error(`API error: ${response.status} ${response.statusText}. Body: ${errorBody}`);
        }

        // Sprawdź, czy odpowiedź ma treść
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            // Jeśli nie ma JSON, zwróć pusty obiekt
            console.log("API Response is not JSON, returning empty object.");
            return {};
        }
    } catch (error) {
        console.error('API call failed:', error);
        
        // Nie pokazuj powiadomienia o błędzie dla niektórych endpointów (opcjonalne)
        const silentEndpoints = ['/get-conversation-history', '/save-conversation'];
        if (!silentEndpoints.includes(endpoint)) {
            showNotification(`API Call Error: ${error.message}`, 'error');
        }
        
        throw error;
    }
}

/**
 * Sprawdza aktywną sesję użytkownika
 * @returns {Promise<Object>} - Obiekt z informacją o sesji
 */
async function checkSession() {
    try {
        console.log("Sprawdzam sesję użytkownika...");
        
        const response = await fetch('/check-session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`, response.headers);
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            const errorText = await response.text();
            console.error("Error response body:", errorText);
            return { logged_in: false, error: `HTTP ${response.status}` };
        }
        
        const data = await response.json();
        console.log("Session check response:", data);
        
        // KRYTYCZNA POPRAWKA - sprawdź strukturę odpowiedzi
        if (data.success === false) {
            console.error("Session check failed:", data.error);
            return { logged_in: false, error: data.error };
        }
        
        // Sprawdź czy mamy wszystkie wymagane dane
        if (data.logged_in && data.user_data) {
            if (!data.user_data.user_id) {
                console.error("Missing user_id in session data");
                return { logged_in: false, error: "Invalid session data" };
            }
        }
        
        return data;
        
    } catch (error) {
        console.error('Network error during session check:', error);
        return { 
            logged_in: false, 
            error: error.message,
            networkError: true 
        };
    }
}
    
  /**
   * Funkcja do zmiany hasła użytkownika
   * @param {string} currentPass - Aktualne hasło
   * @param {string} newPass - Nowe hasło
   * @returns {Promise} - Promise z wynikiem zmiany hasła
   */
  async function changePassword(currentPass, newPass) {
      try {
          const data = {
              current_password: currentPass,
              new_password: newPass
          };
          
          const response = await callAPI('/settings/password/change', data, 'POST');
          return response;
      } catch (error) {
          console.error('Failed to change password:', error);
          return { success: false, error: "Failed to change password. Please try again later." };
      }
  }

  /**
   * Funkcja do wysyłania pytania do AI
   * @param {string} message - Treść wiadomości
   * @returns {Promise} - Promise z odpowiedzią AI
   */
async function askAI(message) {
    try {
        // ✅ NAJPIERW sprawdź format, POTEM istnienie
        if (threadId && !is_valid_thread_id(threadId)) {
            console.log("Invalid thread_id format, creating new thread");
            threadId = null;
        }
        
        // ✅ Jeśli nie mamy thread_id, utwórz nowy
        if (!threadId) {
            // Backend automatycznie utworzy nowy thread jeśli go nie ma
            console.log("No thread_id, backend will create new one");
        }

        const data = {
            question: message,
            topic: currentCategory || '',
            threadId: threadId // Może być null - backend obsłuży
        };

        const response = await callAPI('/ask', data);

        // ✅ ZAWSZE aktualizuj threadId z odpowiedzi
        if (response.threadId) {
            threadId = response.threadId;
            console.log("Updated threadId from API response:", threadId);
        }

        return response;
    } catch (error) {
        console.error('Error asking AI:', error);
        return { error: "Failed to get response from AI." };
    }
}
  /**
   * Funkcja do przesyłania pliku na serwer
   * @param {File} file - Plik do przesłania
   * @returns {Promise} - Promise z odpowiedzią API
   */
  async function uploadFile(file) {
      try {
          const formData = new FormData();
          formData.append('file', file);
          // Dołącz threadId i category, jeśli są dostępne
          if (threadId) formData.append('threadId', threadId);
          formData.append('category', currentCategory || 'general');

          const options = {
              method: 'POST',
              body: formData,
              credentials: 'include' // Ważne dla wysyłania ciasteczek sesji
              // Nagłówki Content-Type są ustawiane automatycznie przez fetch dla FormData
          };

          const url = `${apiBaseUrl}/upload-file`;
          console.log(`Uploading file to: ${url}`);

          const response = await fetch(url, options);

          if (!response.ok) {
               let errorBody = 'No error body';
              try {
                  errorBody = await response.text();
              } catch (e) {}
              throw new Error(`File upload failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
          }

          return await response.json();
      } catch (error) {
          console.error('File upload failed:', error);
          showNotification(`File Upload Error: ${error.message}`, 'error');
          throw error;
      }
  }

  /**
   * Funkcja do przetwarzania przesłanych plików
   * @param {Array} fileInfos - Informacje o przesłanych plikach
   * @returns {Promise} - Promise z odpowiedzią AI
   */
async function processFiles(fileInfos, message = '') {
    try {
        const data = {
            files: fileInfos,
            threadId: threadId,
            category: currentCategory || 'general',
            message: message // Dodajemy opcjonalną wiadomość
        };

        const response = await callAPI('/process-files', data);
        return response;
    } catch (error) {
        console.error('Error processing files:', error);
        // Błąd jest już logowany i pokazywany w callAPI
        return { error: "Failed to process files." };
    }
}
  /**
   * Funkcja do pobierania wygenerowanego dokumentu
   * @param {string} format - Format dokumentu (np. 'docx')
   */
  async function downloadDocument(format = 'docx') {
      try {
          // Przygotuj dane dla generowania DOCX
          const data = {
              sections: savedContent
          };

          // Użyj Fetch API do pobrania pliku
          const response = await fetch(`${apiBaseUrl}/generate-${format}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              credentials: 'include', // Dodane dla wysyłania ciasteczek sesji
              body: JSON.stringify(data)
          });

          if (!response.ok) {
               let errorBody = 'No error body';
              try {
                  errorBody = await response.text();
              } catch (e) {}
              throw new Error(`Failed to generate ${format}: ${response.status} ${response.statusText}. Body: ${errorBody}`);
          }

          // Pobierz blob z odpowiedzi
          const blob = await response.blob();

          // Utwórz link do pobrania pliku
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pitch_deck.${format}`;
          document.body.appendChild(a);
          a.click();

          // Wyczyść URL obiektu po użyciu
          setTimeout(() => {
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
          }, 0);

          // Pokaż powiadomienie o sukcesie
          showNotification(`Your pitch deck has been downloaded as ${format.toUpperCase()}.`, 'success');
      } catch (error) {
          console.error(`Error downloading ${format}:`, error);
          showNotification(`Failed to download your pitch deck: ${error.message}`, 'error');
      }
  }

  async function generatePresentation() {
      if (!generatePresentationBtn) return;
      try {
          generatePresentationBtn.disabled = true;
          const data = { sections: savedContent };
          const response = await fetch(`${apiBaseUrl}/generate-presentation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(data)
          });
          if (!response.ok) {
              let errorBody = await response.text().catch(() => '');
              throw new Error(`Failed to generate presentation: ${response.status} ${response.statusText}. ${errorBody}`);
          }
          const result = await response.json();
          if (result.success && result.link) {
              window.open(result.link, '_blank');
              showNotification('Presentation generated successfully.', 'success');
          } else {
              showNotification(result.error || 'Failed to generate presentation.', 'error');
          }
      } catch (error) {
          console.error('Error generating presentation:', error);
          showNotification(error.message, 'error');
      } finally {
          generatePresentationBtn.disabled = false;
      }
  }
  /**
   * Funkcja do wyszukiwania w sieci
   * @param {string} query - Zapytanie wyszukiwania
   * @returns {Promise} - Promise z wynikami wyszukiwania
   */
  async function searchWeb(query) {
      try {
          const data = {
              query: query
          };

          const response = await callAPI('/web-search', data);
          return response;
      } catch (error) {
          console.error('Web search failed:', error);
          // Błąd jest już logowany i pokazywany w callAPI
          return { error: "Web search failed." };
      }
  }
  /**
   * Funkcja do analizy URL
   * @param {string} url - URL do analizy
   * @param {string} category - Kategoria pitch decku, dla której analizujemy URL
   * @returns {Promise} - Promise z odpowiedzią API
   */
  async function scrapeURL(url, category = '') {
      try {
          const data = {
              url: url,
              threadId: threadId,
              category: category
          };

          const response = await callAPI('/scrape-url', data);
          return response;
      } catch (error) {
          console.error('URL scraping failed:', error);
          // Błąd jest już logowany i pokazywany w callAPI
          return { error: "URL analysis failed." };
      }
  }

  /**
   * Funkcja do pobierania listy plików użytkownika
   * @returns {Promise} - Promise z listą plików
   */
  async function getUserFiles() {
      try {
          // Upewnij się, że używasz GET i nie wysyłasz ciała dla GET
          const response = await callAPI('/list-user-files', {}, 'GET');
          return response;
      } catch (error) {
          console.error('Failed to get user files:', error);
          // Błąd jest już logowany i pokazywany w callAPI
          return { error: "Failed to retrieve user files." };
      }
  }

  // --- FUNKCJE ETAPU 1: Zarządzanie Ustawieniami Profilu ---

  /**
   * Aktualizuje nazwę profilu użytkownika 
   * @param {string} newName - Nowa nazwa użytkownika
   * @returns {Promise} - Promise z odpowiedzią API
   */
  async function updateProfileName(newName) {
      try {
          const data = {
              name: newName
          };
          
          const response = await callAPI('/settings/profile/name', data, 'PUT');
          return response;
      } catch (error) {
          console.error('Failed to update profile name:', error);
          // Błąd jest już logowany i pokazywany w callAPI
          return { success: false, error: "Failed to update profile name." };
      }
  }

  /**
   * Wysyła żądanie zmiany adresu email
   * @param {string} newEmail - Nowy adres email
   * @returns {Promise} - Promise z odpowiedzią API
   */
  async function requestEmailChange(newEmail) {
      try {
          const data = {
              new_email: newEmail
          };
          
          const response = await callAPI('/settings/profile/email/request-change', data, 'POST');
          return response;
       } catch (error) {
          console.error('Failed to request email change:', error);
          return { success: false, error: "Failed to request email change." };
      }
  }
  /**
   * Aktualizuje preferencje powiadomień email
   * @param {boolean} enabled - Czy powiadomienia są włączone
   * @returns {Promise} - Promise z odpowiedzią API
   */
  async function updateNotificationPreference(enabled) {
      try {
          const data = {
              enabled: enabled
          };
          
          const response = await callAPI('/settings/preferences/notifications', data, 'PUT');
          return response;
      } catch (error) {
          console.error('Failed to update notification preferences:', error);
          return { success: false, error: "Failed to update notification preferences." };
      }
  }

  /**
   * Wysyła żądanie resetu hasła
   * @param {string} email - Adres email do zresetowania hasła
   * @returns {Promise} - Promise z odpowiedzią API
   */
  async function requestPasswordReset(email) {
      try {
          const data = {
              email: email
          };
          
          const response = await callAPI('/auth/request-password-reset', data, 'POST');
          return response;
      } catch (error) {
          console.error('Failed to request password reset:', error);
          return { success: false, error: "Failed to request password reset." };
      }
  }

  /**
   * Funkcja wykonująca logowanie użytkownika
   * @param {string} email - Email użytkownika
   * @param {string} password - Hasło użytkownika
   * @returns {Promise} - Promise z wynikiem logowania
   */
  async function loginUser(email, password) {
      try {
          const data = {
              email: email,
              password: password
          };
          
          const response = await callAPI('/login-local', data, 'POST');
          return response;
      } catch (error) {
          console.error('Login failed:', error);
          return { success: false, error: "Failed to login. Check your credentials and try again." };
      }
  }

  // ======== Funkcje logowania i nawigacji ========

  // Jeśli z jakiegoś powodu JavaScript się nie załaduje,
  // linki w HTML nadal przekierują użytkownika do Auth0.
  // Funkcja do symulacji udanego logowania (dla testów)
  function simulateSuccessfulLogin(userData) {
      showNotification("Login successful!", "success");
      handleLoginSuccess(userData);
  }

  // Funkcja obsługująca logowanie i przejście do następnego ekranu
  function handleLoginSuccess(userData) {
    console.log("Logowanie pomyślne, przechodzę do sekcji intro", userData);

    // Aktualizuj dane użytkownika
    currentUser = { ...currentUser, ...userData };
    restoreUserData();
    updateUserInfoUI();
    
    // ZMIANA: Opóźnij inicjalizację awatara
    setTimeout(() => {
        initializeAvatarFunctionality();
    }, 100);
    
    applyPlanRestrictions();

    // Aktualizuj dane użytkownika
    currentUser = { ...currentUser, ...userData }; // Połącz domyślne z danymi z backendu

    // NOWE: Przywróć zapisane dane użytkownika
    restoreUserData();

    // Aktualizuj UI z danymi użytkownika
    updateUserInfoUI();
      
    // Inicjalizuj funkcjonalność awatara
    initializeAvatarFunctionality();
  
    applyPlanRestrictions();


    // POPRAWKA: Sprawdź czy ekran logowania istnieje przed ukryciem
    if (loginScreen) {
        loginScreen.style.display = 'none';
    }

    const hasSeenIntro = localStorage.getItem('hasSeenIntro_' + currentUser.user_id);
    
    if (hasSeenIntro) {
        if (introSection) introSection.style.display = 'none';
        if (appContainer) {
            appContainer.style.display = 'flex';
            initializeUI();
        }
    } else {
        if (introSection) {
            introSection.style.display = 'block';
        }
        if (appContainer) {
            appContainer.style.display = 'none';
        }
    }
    
    if (settingsPage) {
        settingsPage.style.display = 'none';
    }

    requestAnimationFrame(() => {
    initializePlanSelection();
});
} 
    
    // Ukryj stronę ustawień
if (settingsPage) {
    settingsPage.style.display = 'none';
}

// Inicjalizuj plany po zakończeniu wszystkich operacji DOM
requestAnimationFrame(() => {
    initializePlanSelection();
});

  // Funkcja do aktualizacji UI danymi użytkownika
function updateUserInfoUI() {
    // ✅ DODANE: Aktualizuj inicjały awatara
    const avatarPlaceholder = document.querySelector('.avatar-placeholder');
    if (avatarPlaceholder) {
        const initials = generateInitials(currentUser.name, currentUser.email);
        avatarPlaceholder.textContent = initials;
        console.log(`Updated avatar initials to: ${initials} for user: ${currentUser.name}`);
    }

    if (userDisplayName) {
        userDisplayName.textContent = currentUser.name || 'User';
    }
    if (selectedPlanBadge) {
        selectedPlanBadge.textContent = currentUser.plan || 'Free Plan';
    }

    if (generatePresentationBtn) {
        if (currentUser.plan === 'AI Deck Pro') {
            generatePresentationBtn.style.display = 'block';
        } else {
            generatePresentationBtn.style.display = 'none';
        }
    }
    
    // Aktualizuj elementy ustawień
    if (currentEmailValue) {
        currentEmailValue.textContent = currentUser.email || 'No email';
    }
    if (currentProfileName) {
        currentProfileName.textContent = currentUser.name || 'User';
    }
    
    // Resetowanie hasła - input email
    const resetEmailInput = document.getElementById('resetEmail');
    if (resetEmailInput) {
        resetEmailInput.value = currentUser.email || '';
    }
}
    
  // Ukrywa lub pokazuje elementy w zależności od planu
  function applyPlanRestrictions() {
      const plan = currentUser.plan || 'Deckster Free';
      if (downloadPitchDeckBtn) {
          downloadPitchDeckBtn.style.display = plan === 'Deckster Free' ? 'none' : '';
      }
  }

/**
 * Updated plan display function
 */
function updatePlanDisplay(planNumber) {
    const planConfig = PLAN_CONFIG[planNumber];
    if (!planConfig) {
        console.error(`Plan configuration not found for plan: ${planNumber}`);
        return;
    }

    selectedPlanName = planConfig.name;
    
    if (selectedPlanBadge) {
        selectedPlanBadge.textContent = selectedPlanName;
    }

    // Update current user data
    currentUser.plan = selectedPlanName;
    updateUserInfoUI();
    
    console.log(`Plan updated to: ${selectedPlanName}`);
}

  // Funkcja inicjalizująca interfejs użytkownika (wywoływana po zalogowaniu)
function initializeUI() {
    console.log("Inicjalizacja UI po zalogowaniu");
    
    // Aktualizuj UI danymi użytkownika
    updateUserInfoUI();
    applyPlanRestrictions();
    
    // Ustaw pasek postępu
    if (progressBar && progressPercentage) {
        updateProgress();
    }
    
    // Pokaż tylko inicjalny widok z logo, jeśli nie wybrano kategorii
    if (!currentCategory) {
        if (initialView) initialView.style.display = 'flex';
        if (chatContainer) chatContainer.style.display = 'none';
        
        // Pokaż pole wejściowe na ekranie głównym
        if (mainInputContainer) mainInputContainer.style.display = 'block';
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) inputContainer.style.display = 'none';
    }
    
    // Ukryj kontener plików
    if (fileUploadContainer) fileUploadContainer.style.display = 'none';
    
    // Ukryj panel zapisanych odpowiedzi
    if (savedContentPanel) savedContentPanel.classList.remove('open');
    updateSavedContentBadge();
    
    // Ukryj panel plików użytkownika
    if (userFilesPanel) userFilesPanel.classList.remove('open');
    
    // Zostaw threadId jako null
    threadId = null;
    console.log("ThreadId zainicjalizowany jako null");
        
    // ✅ Inicjalizuj UI events TYLKO RAZ
    initializeUIEvents();
    
    // Inicjalizuj obserwator dla automatycznego zapisywania historii
    initializeHistoryObserver();
    
    // Pobierz listę plików użytkownika
    fetchUserFilesAndUpdateUI();
    
    // Pobierz historię konwersacji z backendu
    loadConversationHistoryFromBackend();
    
    // Inicjalizuj funkcjonalność Drag and Drop dla pól tekstowych
    initializeTextAreaDragDrop();
    
    // Inicjalizuj obserwator dla nowych pól tekstowych
    initializeTextAreaObserver();
    
    // Pobierz historię ogólnego chatu
    loadGeneralChatHistory();
    
    // ✅ Initialize mobile functionality TYLKO na mobile I TYLKO RAZ
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            initializeMobileFunctionality();
            ensureFloatingButtonsInInput();
            // ✅ NIE wywołuj initializeCategoryEvents ponownie!
        }, 200);
    }
    // KRYTYCZNA ZMIANA: Wymuś ponowną inicjalizację event listenerów
    setTimeout(() => {
        console.log("Wymuś ponowną inicjalizację event listenerów");
        initializeCategoryEvents(); // Wymuś ponownie
        
        // Sprawdź czy mobile nie nadpisało desktop event listenerów
        if (window.innerWidth > 768) {
            initializeUIEvents(); // Wymuś ponownie dla desktop
        }
    }, 300);
}

  // Funkcja pobierająca pliki użytkownika z serwera i aktualizująca UI
  async function fetchUserFilesAndUpdateUI() {
      try {
          const response = await getUserFiles();
          if (response && response.files && Array.isArray(response.files)) {
              userFiles = response.files.map(f => ({ 
                  id: f.fileId,
                  name: f.originalName,
                  size: f.size || 0,
                  type: f.mimeType,
                  added: f.added || new Date().toISOString(),
                  category: f.category
              }));
              updateUserFilesBadge();
              console.log("Pobrano pliki użytkownika:", userFiles.length);
          } else if (response.error) {
              console.warn("Nie udało się pobrać plików użytkownika:", response.error);
          }
      } catch (error) {
          console.error("Nie udało się pobrać plików użytkownika (catch):", error);
          // Błąd pobierania plików nie powinien przerywać inicjalizacji UI
      }
  }
  // --- Inicjalizacja kategorii i inne funkcje UI ---

function initializeCategoryEvents() {
    console.log("Initializing category events...");
    
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        // USUŃ POPRZEDNIE LISTENERY ZAWSZE
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Dodaj listener tylko dla kategorii (nie history)
        if (!newItem.classList.contains('history-item')) {
            newItem.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const category = this.getAttribute('data-category');
                if (category) {
                    console.log(`Category clicked: ${category}`);
                    
                    // Zamknij mobile menu
                    if (window.innerWidth <= 768) {
                        const sidebar = document.querySelector('.sidebar');
                        const mobileOverlay = document.getElementById('mobileOverlay');
                        if (sidebar) sidebar.classList.remove('mobile-open');
                        if (mobileOverlay) mobileOverlay.classList.remove('active');
                    }
                    
                    selectCategory(category);
                }
            });
        }
    });
}
  
function selectCategory(category) {
    console.log(`Wybrano kategorię: ${category}`);
    
    // Update current category
    currentCategory = category;
    
    // Update UI - zaznacz aktywną kategorię
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-category') === category);
    });
    
    // Aktualizuj elementy historii
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-category') === category);
    });
    // Pokaż standardowy kontener wejściowy, ukryj główny
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) inputContainer.style.display = 'block';
    if (mainInputContainer) mainInputContainer.style.display = 'none';
    
    // Ustaw placeholder dla pola wiadomości na podstawie wybranej kategorii
    if (chatInput && categoryPlaceholders[category]) {
        chatInput.placeholder = categoryPlaceholders[category];
    } else if (chatInput) {
        chatInput.placeholder = "Ask Deckster AI about your pitch deck...";
    }
    
    // Reset chat input
    if (chatInput) chatInput.value = '';
    
    // Check if there's a saved conversation for this category
    if (categoryConversations[category]) {
        // Load the saved conversation
        if (chatContainer) {
            chatContainer.style.display = 'block';
            chatContainer.innerHTML = categoryConversations[category];
        }
        if (initialView) initialView.style.display = 'none';
    } else {
        // If there's no saved conversation, start a new one
        if (chatContainer) {
            chatContainer.style.display = 'block';
            chatContainer.innerHTML = '';
            addSystemMessage(category);
        }
        if (initialView) initialView.style.display = 'none';
    }
    
    // Scroll to bottom of chat
    scrollChatToBottom();
}

  function addSystemMessage(category) {
      // Check if there's a prompt for this category
      const prompt = categoryPrompts[category];
      if (!prompt || !chatContainer) return;
      
      // Create system message
      const messageElement = document.createElement('div');
      messageElement.className = 'message system-message';
      
      messageElement.innerHTML = `
          <div class="message-content">
              <div class="message-text">
                  <p><strong>${escapeHtml(category)}</strong></p>
                  <p>${escapeHtml(prompt)}</p>
              </div>
          </div>
      `;
      
      // Add to chat
      chatContainer.appendChild(messageElement);
  }

  function scrollChatToBottom() {
      if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
      }
  }

  /**
   * Add user message to chat
   * @param {string} message - Message to add
   * @returns {string} - ID of the message element
   */
  function addUserMessage(message) {
      if (!chatContainer) return;
      
      const messageId = 'msg_' + Date.now();
      const messageElement = document.createElement('div');
      messageElement.className = 'message user-message';
      messageElement.id = messageId;
      
      messageElement.innerHTML = `
          <div class="message-avatar">
              <i class="fas fa-user"></i>
          </div>
          <div class="message-content">
              <div class="message-text">${formatMessageText(message)}</div>
              <div class="message-time">${formatTime(new Date())}</div>
          </div>
      `;
      
      chatContainer.appendChild(messageElement);
      scrollChatToBottom();
      
      // Clear input field
      if (chatInput) chatInput.value = '';
      
      return messageId;
  }

  /**
   * Add loading message to chat
   * @returns {string} - ID of the loading message
   */
  function addLoadingMessage() {
      if (!chatContainer) return '';
      
      const messageId = 'loading_' + Date.now();
      const messageElement = document.createElement('div');
      messageElement.className = 'message ai-message loading';
      messageElement.id = messageId;
      
      messageElement.innerHTML = `
          <div class="message-avatar">
              <img src="https://www.alldeck.pl/wp-content/uploads/2025/04/alldeck-logo-czarne-60x60-2.png" alt="AI"
                   onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\' viewBox=\\'0 0 32 32\\'><rect width=\\'32\\' height=\\'32\\' rx=\\'16\\' fill=\\'%23465b5e\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'18\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'white\\'>D</text></svg>';">
          </div>
          <div class="message-content">
              <div class="message-text typing-indicator">
                  <span></span><span></span><span></span>
              </div>
          </div>
      `;
      
      chatContainer.appendChild(messageElement);
      scrollChatToBottom();
      
      return messageId;
  }

  /**
   * Remove loading message from chat
   * @param {string} messageId - ID of the loading message
   */
  function removeLoadingMessage(messageId) {
      if (!messageId) return;
      
      const messageElement = document.getElementById(messageId);
      if (messageElement) {
          messageElement.remove();
      }
  }

  /**
   * Add AI message to chat
   * @param {string} message - Message to add
   * @returns {string} - ID of the message element
   */
  function addAIMessage(message) {
      if (!chatContainer) return;
      
      const messageId = 'msg_' + Date.now();
      const messageElement = document.createElement('div');
      messageElement.className = 'message ai-message';
      messageElement.id = messageId;
      
      messageElement.innerHTML = `
          <div class="message-avatar">
              <img src="https://www.alldeck.pl/wp-content/uploads/2025/04/alldeck-logo-czarne-60x60-2.png" alt="AI" 
                   onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\' viewBox=\\'0 0 32 32\\'><rect width=\\'32\\' height=\\'32\\' rx=\\'16\\' fill=\\'%23465b5e\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'18\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'white\\'>D</text></svg>';">
          </div>
          <div class="message-content">
              <div class="message-text">${formatMessageText(message)}</div>
              <div class="message-time">${formatTime(new Date())}</div>
              <div class="message-actions">
                  <button class="message-action copy-btn" title="Copy to clipboard">
                      <i class="fas fa-copy"></i>
                  </button>
                  <button class="message-action export-action" title="Add to Pitch Deck">
                      <i class="fas fa-file-export"></i>
                  </button>
                  <div class="message-feedback">
                      <button class="feedback-btn thumbs-up" data-message-id="${messageId}" title="This was helpful">
                          <i class="fas fa-thumbs-up"></i>
                      </button>
                      <button class="feedback-btn thumbs-down" data-message-id="${messageId}" title="This was not helpful">
                          <i class="fas fa-thumbs-down"></i>
                      </button>
                  </div>
              </div>
          </div>
      `;
      
      chatContainer.appendChild(messageElement);
      scrollChatToBottom();
      
      return messageId;
  }

   /**
    * Add error message to chat
    * @param {string} error - Error message to add
    * @returns {string} - ID of the message element
    */
   function addErrorMessage(error) {
       if (!chatContainer) return;
       
       const messageId = 'error_' + Date.now();
       const messageElement = document.createElement('div');
       messageElement.className = 'message error-message';
       messageElement.id = messageId;
       
       messageElement.innerHTML = `
           <div class="message-avatar">
               <i class="fas fa-exclamation-circle"></i>
           </div>
           <div class="message-content">
               <div class="message-text">
                   <p>Error: ${escapeHtml(error)}</p>
                   <p>Please try again or refresh the page if the problem persists.</p>
               </div>
               <div class="message-time">${formatTime(new Date())}</div>
           </div>
       `;
       
       chatContainer.appendChild(messageElement);
       scrollChatToBottom();
       
       return messageId;
   }

   /**
    * Format message text with Markdown-like formatting
    * @param {string} text - Raw message text
    * @returns {string} - Formatted HTML
    */
   function formatMessageText(text) {
       if (!text) return '';
       
       // Escape HTML first
       let formattedText = escapeHtml(text);
       
       // Basic Markdown-like formatting
       // Bold
       formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
       
       // Italic
       formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
       
       // Code blocks
       formattedText = formattedText.replace(/```([^`]*?)```/g, '<pre><code>$1</code></pre>');
       
       // Inline code
       formattedText = formattedText.replace(/`([^`]*?)`/g, '<code>$1</code>');
       
       // Links
       formattedText = formattedText.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
       
       // Headers (use span instead of h1-h6 to maintain text flow)
       formattedText = formattedText.replace(/^# (.*?)$/gm, '<span class="md-h1">$1</span>');
       formattedText = formattedText.replace(/^## (.*?)$/gm, '<span class="md-h2">$1</span>');
       formattedText = formattedText.replace(/^### (.*?)$/gm, '<span class="md-h3">$1</span>');
       
       // Lists
       formattedText = formattedText.replace(/^- (.*?)$/gm, '• $1');
       
       // Paragraphs
       formattedText = formattedText.replace(/\n\n/g, '</p><p>');
       
       // Line breaks
       formattedText = formattedText.replace(/\n/g, '<br>');
       
       return `<p>${formattedText}</p>`;
   }

   /**
    * Format time for chat messages
    * @param {Date} date - Date object
    * @returns {string} - Formatted time string
    */
   function formatTime(date) {
       return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
   }

   /**
    * Toggle profile name edit UI
    * @param {boolean} editing - Whether to enable editing
    */
   function toggleProfileNameEdit(editing) {
       if (!currentProfileName || !editProfileNameBtn) return;

       const currentName = currentProfileName.textContent;
       const parentElement = currentProfileName.parentElement;

       if (editing) {
           // Przełącz na tryb edycji
           currentProfileName.style.display = 'none'; // Ukryj span z nazwą

           // Sprawdź czy input już istnieje
           let input = parentElement.querySelector('.settings-name-input');
           if (!input) {
               input = document.createElement('input');
               input.type = 'text';
               input.className = 'form-input settings-name-input';
               input.value = currentName;
               // Wstaw input przed span (lub gdzieś logicznie)
               currentProfileName.insertAdjacentElement('afterend', input);
           } else {
               input.style.display = 'inline-block';
               input.value = currentName;
           }
           input.focus();

           // Zmień przyciski
           editProfileNameBtn.style.display = 'none'; // Ukryj "Edit"

           // Sprawdź czy przyciski Save/Cancel już istnieją
           let controlsDiv = parentElement.parentElement.querySelector('.edit-controls');
           if (!controlsDiv) {
               controlsDiv = document.createElement('div');
               controlsDiv.className = 'edit-controls';
               controlsDiv.style.display = 'flex';
               controlsDiv.style.gap = '8px';
               controlsDiv.innerHTML = `
                   <button class="settings-edit-btn save">Save</button>
                   <button class="settings-edit-btn cancel">Cancel</button>
               `;
               // Wstaw po przycisku Edit
               editProfileNameBtn.insertAdjacentElement('afterend', controlsDiv);

               // Dodaj listenery do nowych przycisków
               controlsDiv.querySelector('.save').addEventListener('click', saveProfileName);
               controlsDiv.querySelector('.cancel').addEventListener('click', () => toggleProfileNameEdit(false));
           } else {
               controlsDiv.style.display = 'flex';
           }

       } else {
           // Anuluj lub zakończ edycję
           currentProfileName.style.display = 'inline'; // Pokaż span

           const input = parentElement.querySelector('.settings-name-input');
           if (input) input.style.display = 'none'; // Ukryj input

           editProfileNameBtn.style.display = 'inline-block'; // Pokaż "Edit"

           const controlsDiv = parentElement.parentElement.querySelector('.edit-controls');
           if (controlsDiv) controlsDiv.style.display = 'none'; // Ukryj "Save"/"Cancel"
       }
   }
   /**
    * Save profile name to backend
    */
   async function saveProfileName() {
       const parentElement = currentProfileName.parentElement;
       const input = parentElement.querySelector('.settings-name-input');
       const newName = input.value.trim();
       const originalName = currentUser.name; // Pobierz starą nazwę

       if (newName && newName !== originalName) {
           console.log(`Attempting to save new profile name: ${newName}`);
           try {
               // Wywołaj API backendu do zapisu nazwy
               const response = await updateProfileName(newName);
               
               if (response.success) {
                   // Aktualizuj lokalny stan i UI
                   currentUser.name = newName;
                   currentProfileName.textContent = newName;
                   if (userDisplayName) userDisplayName.textContent = newName; // Aktualizuj też w sidebarze
                   toggleProfileNameEdit(false); // Wyjdź z trybu edycji
                   showNotification('Profile name updated successfully!', 'success');
               } else {
                   showNotification(response.error || 'Failed to update profile name.', 'error');
                   // Opcjonalnie: przywróć starą nazwę w inpucie
                   input.value = originalName;
               }
           } catch (error) {
               showNotification('Failed to update profile name.', 'error');
               // Opcjonalnie: przywróć starą nazwę w inpucie
               input.value = originalName;
           }
       } else if (newName === originalName) {
           toggleProfileNameEdit(false); // Nic się nie zmieniło, po prostu wyjdź z edycji
       } else {
           showNotification('Profile name cannot be empty.', 'warning');
       }
   }

   /**
    * Initiate email change request
    * @param {string} newEmail - New email address
    */
   async function changeEmailRequest(newEmail) {
       console.log(`Requesting email change to: ${newEmail}`);
       try {
           // Wywołaj API backendu do rozpoczęcia procesu zmiany emaila
           const response = await requestEmailChange(newEmail);
           
           if (response.success) {
               showNotification(`Verification link sent to ${newEmail}. Please check your inbox.`, 'success');
           } else {
               showNotification(response.error || 'Failed to request email change.', 'error');
           }
       } catch (error) {
           showNotification('Failed to request email change.', 'error');
       }
   }

   /**
    * Update notification preferences
    * @param {boolean} isEnabled - Whether notifications are enabled
    */
   async function changeNotificationSettings(isEnabled) {
       console.log(`Updating email notification preference to: ${isEnabled}`);
       try {
           // Wywołaj API backendu do zapisu preferencji
           const response = await updateNotificationPreference(isEnabled);
           
           if (response.success) {
               currentUser.notificationsEnabled = isEnabled; // Aktualizuj lokalny stan
               showNotification('Notification preference updated.', 'success');
           } else {
               showNotification(response.error || 'Failed to update notification preference.', 'error');
               // Przywróć poprzedni stan wizualnie
               if (emailNotifyToggle) emailNotifyToggle.checked = !isEnabled;
           }
       } catch (error) {
           showNotification('Failed to update notification preference.', 'error');
           // Przywróć poprzedni stan wizualnie
           if (emailNotifyToggle) emailNotifyToggle.checked = !isEnabled;
           currentUser.notificationsEnabled = !isEnabled;
       }
   }

   /**
    * Function to download pitch deck
    */
   function downloadPitchDeck() {
       downloadDocument('docx');
   }

/**
 * Update user files badge (count indicator) - całkowicie przepisana funkcja
 */
function updateUserFilesBadge() {
    // Znajdź odznakę po ID
    const filesBadge = document.getElementById('filesBadge');
    const mobileFilesBadge = document.getElementById('mobileFilesBadge');
    
    if (!filesBadge) {
        console.warn("Files badge element not found");
        return;
    }
    
    // Zlicz pliki
    const fileCount = userFiles.length;
    
    if (fileCount > 0) {
        const badgeText = fileCount > 99 ? '99+' : fileCount;
        
        // Ustaw oryginalne badge
        filesBadge.textContent = badgeText;
        filesBadge.style.display = 'flex';
        
        // ✅ Ustaw mobile badge jeśli istnieje
        if (mobileFilesBadge) {
            mobileFilesBadge.textContent = badgeText;
            mobileFilesBadge.style.display = 'flex';
        }
        
        // Dostosuj szerokość dla większych liczb
        if (fileCount > 9) {
            filesBadge.style.minWidth = '24px';
            if (mobileFilesBadge) mobileFilesBadge.style.minWidth = '24px';
        } else {
            filesBadge.style.minWidth = '20px';
            if (mobileFilesBadge) mobileFilesBadge.style.minWidth = '20px';
        }
    } else {
        // Ukryj badge gdy nie ma plików
        filesBadge.style.display = 'none';
        if (mobileFilesBadge) mobileFilesBadge.style.display = 'none';
    }
    
    console.log(`Updated files badge: ${fileCount} files`);
}

   /**
    * Start a new chat conversation
    */
   function startNewChat() {
       console.log('Starting new chat (general chat)');
       
       // Clear current category
       currentCategory = null;
       
       // Update UI
       document.querySelectorAll('.category-item').forEach(item => {
           item.classList.remove('active');
       });
       
       // Show initial view
       if (initialView) initialView.style.display = 'flex';
       if (chatContainer) chatContainer.style.display = 'none';
       
       // Clear chat container
       if (chatContainer) chatContainer.innerHTML = '';
       
       // Reset chat input
       if (chatInput) chatInput.value = '';
       if (mainChatInput) mainChatInput.value = '';
       
       // Pokaż pole wejściowe na ekranie głównym, ukryj standardowe
       const inputContainer = document.querySelector('.input-container');
       if (inputContainer) inputContainer.style.display = 'none';
       if (mainInputContainer) mainInputContainer.style.display = 'block';
       
       // Create new thread on backend (TODO)
       // For now, reset threadId locally
       threadId = null; // ✅ Pozwól backendowi utworzyć nowy
       
       showNotification('Rozpoczęto nowy czat ogólny.', 'success');
   }

   /**
    * Show tools dropdown
    * @param {HTMLElement} parentElement - Parent element to position dropdown
    */
   function showToolsDropdown(parentElement) {
       // Remove existing dropdown if present
       hideToolsDropdown();
       
       // Create dropdown
       const dropdown = document.createElement('div');
       dropdown.id = 'toolsDropdown';
       dropdown.className = 'tools-dropdown';
       
       dropdown.innerHTML = `
           <div class="tools-dropdown-item" id="webSearchTool">
               <i class="fas fa-search"></i>
               <span>Web Search</span>
           </div>
           <div class="tools-dropdown-item" id="urlAnalysisTool">
               <i class="fas fa-globe"></i>
               <span>URL Analysis</span>
           </div>
       `;
       
       // Append to body
       document.body.appendChild(dropdown);
       
       // Calculate position based on parent element
       const rect = parentElement.getBoundingClientRect();
       dropdown.style.position = 'absolute';
       dropdown.style.bottom = `${window.innerHeight - rect.top + 5}px`;
       dropdown.style.left = `${rect.left}px`;
       dropdown.style.zIndex = '2000';
       
       // Show dropdown
       dropdown.classList.add('visible');
       
       // Add event listeners
       document.getElementById('webSearchTool').addEventListener('click', function() {
           if (webSearchModal) {
               webSearchModal.style.display = 'flex';
               if (webSearchInput) webSearchInput.focus();
           }
           hideToolsDropdown();
       });
       
       document.getElementById('urlAnalysisTool').addEventListener('click', function() {
           if (urlAnalysisModal) {
               urlAnalysisModal.style.display = 'flex';
               if (urlInput) urlInput.focus();
           }
           hideToolsDropdown();
       });
       
       // Removed File Analysis and File Q&A options
   }

   /**
    * Hide tools dropdown
    */
   function hideToolsDropdown() {
       const dropdown = document.getElementById('toolsDropdown');
       if (dropdown) {
           dropdown.classList.remove('visible');
           setTimeout(() => {
               dropdown.remove();
           }, 300);
       }
   }

   /**
    * Attach Tools dropdown handler to a bar if not already attached
    * @param {HTMLElement} bar - element containing .tools-button
    */
   function attachToolsHandler(bar) {
       if (!bar) return;

       const btn = bar.querySelector('.tools-button');
       if (!btn) {
           console.warn('Element .tools-button nie znaleziony w tools-bar');
           return;
       }

       if (btn.dataset.toolsAttached) {
           return; // handler already attached
       }

       btn.addEventListener('click', function() {
           showToolsDropdown(bar);
       });

       btn.dataset.toolsAttached = 'true';
   }

   /**
    * Perform web search
    * @param {string} query - Search query
    */
   async function performWebSearch(query) {
       if (!webSearchResults || !webSearchLoading) return;
       
       // Show loading indicator
       webSearchResults.innerHTML = '';
       webSearchLoading.style.display = 'flex';
       
       try {
           const response = await searchWeb(query);
           
           // Hide loading indicator
           webSearchLoading.style.display = 'none';
           
           if (response.error) {
               webSearchResults.innerHTML = `<div class="search-error">Error: ${escapeHtml(response.error)}</div>`;
               return;
           }
           
           if (!response.results || response.results.length === 0) {
               webSearchResults.innerHTML = `<div class="search-empty">No results found for "${escapeHtml(query)}"</div>`;
               return;
           }
           
           // Display results
           const resultsHtml = response.results.map(result => `
               <div class="search-result">
                   <div class="search-result-title">
                       <a href="${escapeHtml(result.url)}" target="_blank">${escapeHtml(result.title)}</a>
                   </div>
                   <div class="search-result-url">${escapeHtml(result.url)}</div>
                   <div class="search-result-snippet">${escapeHtml(result.snippet)}</div>
                   <div class="search-result-actions">
                       <button class="search-use-result" data-title="${escapeHtml(result.title)}" data-url="${escapeHtml(result.url)}">
                           Use in Chat
                       </button>
                   </div>
               </div>
           `).join('');
           
           webSearchResults.innerHTML = resultsHtml;
           
           // Add event listeners to "Use in Chat" buttons
           webSearchResults.querySelectorAll('.search-use-result').forEach(button => {
               button.addEventListener('click', function() {
                   const title = this.getAttribute('data-title');
                   const url = this.getAttribute('data-url');
                   
                   if (chatInput && title && url) {
                       chatInput.value += `\n\nReference: "${title}" from ${url}`;
                       if (webSearchModal) webSearchModal.style.display = 'none';
                   }
               });
           });
           
       } catch (error) {
           console.error('Web search UI error:', error);
           webSearchLoading.style.display = 'none';
           webSearchResults.innerHTML = `<div class="search-error">Search failed: ${escapeHtml(error.message)}</div>`;
       }
   }

   /**
    * Analyze URL
    * @param {string} url - URL to analyze
    * @param {string} category - Category of pitch deck
    */
   async function analyzeUrl(url, category) {
       if (!urlAnalysisResults || !urlAnalysisLoading) return;
       
       // Show loading indicator
       urlAnalysisResults.innerHTML = '';
       urlAnalysisLoading.style.display = 'flex';
       
       try {
           const response = await scrapeURL(url, category);
           
           // Hide loading indicator
           urlAnalysisLoading.style.display = 'none';
           
           if (!response.success || response.error) {
               urlAnalysisResults.innerHTML = `<div class="analysis-error">Error: ${escapeHtml(response.error || 'Failed to analyze URL')}</div>`;
               return;
           }
           
           // Display results
           let resultsHtml = `
               <div class="analysis-result">
                   <div class="analysis-title">
                       <a href="${escapeHtml(response.url)}" target="_blank">${escapeHtml(response.title || 'Untitled Page')}</a>
                   </div>
                   <div class="analysis-url">${escapeHtml(response.url)}</div>
           `;
           
           if (response.description) {
               resultsHtml += `<div class="analysis-description">${escapeHtml(response.description)}</div>`;
           }
           
           if (response.content) {
               resultsHtml += `
                   <div class="analysis-content-preview">
                       <h4>Content Preview:</h4>
                       <div class="analysis-content-text">${escapeHtml(response.content)}</div>
                   </div>
               `;
           }
           
           if (response.ai_analysis) {
               resultsHtml += `
                   <div class="analysis-ai">
                       <h4>AI Analysis:</h4>
                       <div class="analysis-ai-text">${escapeHtml(response.ai_analysis)}</div>
                   </div>
               `;
           }
           
           resultsHtml += `
                   <div class="analysis-actions">
                       <button class="analysis-use-result" data-title="${escapeHtml(response.title || 'URL Analysis')}" data-url="${escapeHtml(response.url)}" data-analysis="${response.ai_analysis ? escapeHtml(response.ai_analysis) : ''}">
                           Use in Chat
                       </button>
                   </div>
               </div>
           `;
           
           urlAnalysisResults.innerHTML = resultsHtml;
           
           // Add event listener to "Use in Chat" button
           const useButton = urlAnalysisResults.querySelector('.analysis-use-result');
           if (useButton) {
               useButton.addEventListener('click', function() {
                   const title = this.getAttribute('data-title');
                   const url = this.getAttribute('data-url');
                   const analysis = this.getAttribute('data-analysis');
                   
                   if (chatInput && url) {
                       let text = `Reference: "${title}" from ${url}`;
                       if (analysis) {
                           text += `\n\nAI Analysis: ${analysis}`;
                       }
                       
                       chatInput.value += (chatInput.value ? '\n\n' : '') + text;
                       if (urlAnalysisModal) urlAnalysisModal.style.display = 'none';
                   }
               });
           }
           
       } catch (error) {
           console.error('URL analysis UI error:', error);
           urlAnalysisLoading.style.display = 'none';
           urlAnalysisResults.innerHTML = `<div class="analysis-error">Analysis failed: ${escapeHtml(error.message)}</div>`;
       }
   }

   /**
    * Handle files for upload
    * @param {FileList} files - Files to handle
    */
   function handleFiles(files) {
       if (!files || files.length === 0) return;
       
       // Show file upload container
       if (fileUploadContainer) {
           fileUploadContainer.style.display = 'block';
       }
       
       // Process each file
       Array.from(files).forEach(file => {
           // Create file preview element
           const fileElement = document.createElement('div');
           fileElement.className = 'file-item';
           
           // Generate a temporary ID
           const tempId = 'temp_file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
           fileElement.setAttribute('data-file-id', tempId);
           
           // Determine file icon
           let fileIcon = 'file';
           if (file.type.startsWith('image/')) fileIcon = 'file-image';
           else if (file.type.startsWith('text/')) fileIcon = 'file-alt';
           else if (file.type.startsWith('application/pdf')) fileIcon = 'file-pdf';
           else if (file.type.includes('spreadsheet') || file.type.includes('excel')) fileIcon = 'file-excel';
           else if (file.type.includes('document') || file.type.includes('word')) fileIcon = 'file-word';
           
           fileElement.innerHTML = `
               <div class="file-info">
                   <div class="file-icon"><i class="fas fa-${fileIcon}"></i></div>
                   <div class="file-name">${escapeHtml(file.name)}</div>
                   <div class="file-size">${formatFileSize(file.size)}</div>
               </div>
               <div class="file-status">
                   <div class="file-loading">
                       <div class="file-progress"></div>
                   </div>
                   <div class="file-actions" style="display: none;">
                       <button class="file-action remove-file">
                           <i class="fas fa-times"></i>
                       </button>
                   </div>
               </div>
           `;
           
           // Add to file list
           if (fileList) {
               fileList.appendChild(fileElement);
           }
           
           // Upload the file
           uploadFile(file)
               .then(response => {
                   // Update preview with success
                   if (response.success && fileElement) {
                       // Update file ID
                       fileElement.setAttribute('data-file-id', response.fileId);
                       
                       // Update UI
                       const progressElement = fileElement.querySelector('.file-progress');
                       const loadingElement = fileElement.querySelector('.file-loading');
                       const actionsElement = fileElement.querySelector('.file-actions');
                       
                       if (progressElement) progressElement.style.width = '100%';
                       
                       setTimeout(() => {
                           if (loadingElement) loadingElement.style.display = 'none';
                           if (actionsElement) actionsElement.style.display = 'flex';
                       }, 500);
                       
                       // Add file to userFiles
                       userFiles.push({
                           id: response.fileId,
                           name: file.name,
                           size: file.size,
                           type: file.type,
                           added: new Date().toISOString(),
                           category: currentCategory || 'general'
                       });
                       
                       // Update files badge
                       updateUserFilesBadge();
                   }
               })
               .catch(error => {
                   // Update preview with error
                   if (fileElement) {
                       fileElement.classList.add('upload-error');
                       const loadingElement = fileElement.querySelector('.file-loading');
                       if (loadingElement) {
                           loadingElement.innerHTML = `<div class="file-error">Upload failed: ${escapeHtml(error.message)}</div>`;
                       }
                   }
               });
               
           // Add event listener for remove button
           const removeButton = fileElement.querySelector('.remove-file');
           if (removeButton) {
               removeButton.addEventListener('click', function() {
                   if (fileElement) {
                       fileElement.remove();
                       
                       // Check if file list is empty
                       if (fileList && fileList.children.length === 0) {
                           // Hide file upload container
                           if (fileUploadContainer) {
                               fileUploadContainer.style.display = 'none';
                           }
                       }
                   }
               });
           }
       });
   }

/**
 * Funkcja inicjalizująca obsługę przeciągania i upuszczania plików do pól tekstowych
 */
function initializeTextAreaDragDrop() {
    console.log("Inicjalizacja drag and drop dla pól tekstowych");
    
    // Dodaje style CSS dla podświetlenia pól tekstowych podczas przeciągania plików
    addDragAndDropStyles();
    
    // Znajdź wszystkie istniejące pola tekstowe
    const textareas = document.querySelectorAll('.chat-input');
    
    textareas.forEach(textarea => {
        attachDragDropHandlers(textarea);
    });
    
    console.log(`Zainicjalizowano drag and drop dla ${textareas.length} pól tekstowych`);
}

/**
 * Dodaje style CSS dla podświetlenia pól tekstowych podczas przeciągania plików
 */
function addDragAndDropStyles() {
    if (!document.getElementById('dragDropStyles')) {
        const style = document.createElement('style');
        style.id = 'dragDropStyles';
        style.innerHTML = `
            .chat-input.drag-highlight {
                border: 2px dashed #4285f4 !important;
                background-color: rgba(66, 133, 244, 0.05) !important;
                box-shadow: 0 0 8px rgba(66, 133, 244, 0.3) !important;
            }
            
            .file-preview-inline {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 10px 0;
                padding: 8px;
                background: rgba(240, 247, 255, 0.5);
                border: 1px solid rgba(209, 230, 255, 0.5);
                border-radius: 8px;
                position: relative;
                z-index: 998;
            }
            
            .file-preview-item {
                display: flex;
                align-items: center;
                background: white;
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid #d7dedf;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .file-preview-icon {
                margin-right: 8px;
                color: #465b5e;
                font-size: 14px;
            }
            
            .file-preview-name {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 13px;
                max-width: 150px;
            }
            
            .file-preview-remove {
                color: #5a686b;
                cursor: pointer;
                font-size: 12px;
                margin-left: 8px;
            }
            
            .analyze-files-btn {
                position: absolute;
                bottom: 16px;
                left: 16px;
                background: #465b5e;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                font-size: 14px;
                cursor: pointer;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }
            
            .analyze-files-btn:hover {
                background: #576b70;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Dołącza obsługę przeciągania i upuszczania do pola tekstowego
 * @param {HTMLElement} textarea - Element pola tekstowego
 */
function attachDragDropHandlers(textarea) {
    if (!textarea) return;

    // Zapobiegaj domyślnym akcjom przeglądarki dla zdarzeń drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        textarea.addEventListener(eventName, preventDefaults, false);
    });
    
    // Podświetl pole tekstowe podczas przeciągania nad nim
    ['dragenter', 'dragover'].forEach(eventName => {
        textarea.addEventListener(eventName, function() {
            this.classList.add('drag-highlight');
        }, false);
    });
    
    // Usuń podświetlenie, gdy element opuszcza pole lub jest upuszczony
    ['dragleave', 'drop'].forEach(eventName => {
        textarea.addEventListener(eventName, function() {
            this.classList.remove('drag-highlight');
        }, false);
    });
    
    // Obsługa upuszczenia pliku w polu tekstowym
    textarea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files && files.length > 0) {
            // Wywołaj funkcję obsługi plików
            handleTextAreaDroppedFiles(e, files, this);
        }
    }, false);
}

/**
 * Obsługuje pliki upuszczone do pola tekstowego
 * @param {Event} e - Zdarzenie drop
 * @param {FileList} files - Lista upuszczonych plików
 * @param {HTMLElement} textarea - Pole tekstowe, do którego upuszczono pliki
 */
// Modyfikacja funkcji handleTextAreaDroppedFiles w main.js
async function handleTextAreaDroppedFiles(e, files, textarea) {
    e.preventDefault();
    
    if (!files || files.length === 0) return;
    
    // Pokaż powiadomienie o przetwarzaniu
    showNotification("Przetwarzanie upuszczonych plików...", "info");
    
    // Pobierz kategorię jeśli jesteśmy w trybie kategorii
    const category = currentCategory || 'general';
    
    // Tablica do przechowywania informacji o przesłanych plikach
    const uploadedFilesInfo = [];
    
    // Utwórz lub pobierz kontener dla podglądu plików
    let previewContainer = getOrCreateFilePreviewContainer();
    
    // Pokaż kontener podglądu
    previewContainer.style.display = 'flex';
    
    // Prześlij każdy plik na serwer
    for (const file of files) {
        try {
            // Utwórz tymczasowy element podglądu z animacją ładowania
            const tempFileItem = createFilePreviewItem(file, true);
            
            // Dodaj tymczasowy element do kontenera
            previewContainer.appendChild(tempFileItem);
            
            // Prześlij plik na serwer
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            
            // Wyślij żądanie przesłania pliku
            const response = await fetch('/process-dropped-file', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Zaktualizuj element podglądu
                updateFilePreviewItem(tempFileItem, result, file, textarea);
                
                // Dodaj informację o pliku do tablicy
                uploadedFilesInfo.push({
                    fileId: result.fileId,
                    originalName: result.originalName,
                    fileInfo: result.fileInfo || {}
                });
                
                // Dołącz plik do pola tekstowego
                attachFileToTextArea(textarea, result.fileId, result.originalName);
                
                // Jeśli mamy dane plików, aktualizujemy listę plików użytkownika
                if (result.fileInfo) {
                    addFileToUserFiles(result.fileInfo);
                }
            } else {
                // Obsługa błędu
                showErrorInFilePreviewItem(tempFileItem, file.name, result.error || 'Upload failed');
                showNotification(`Failed to upload ${file.name}: ${result.error || 'Unknown error'}`, "error");
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showNotification(`Error uploading file: ${error.message}`, "error");
        }
    }
    
    // Jeśli wszystko poszło dobrze, prześlij pliki do analizy
    if (uploadedFilesInfo.length > 0) {
        const fileCount = uploadedFilesInfo.length;
        showNotification(`Successfully uploaded ${fileCount} file${fileCount !== 1 ? 's' : ''}`, "success");

        const fileIds = uploadedFilesInfo.map(f => f.fileId);
        // Capture the current text from the textarea to use as context
        const contextText = textarea.value || '';
        analyzeFiles(fileIds, contextText);
    }
    
    // Dodaj przycisk do ukrycia kontenera podglądu
    addHidePreviewButton(previewContainer);
}

// Nowa funkcja do dodawania przycisku ukrywania podglądu
function addHidePreviewButton(previewContainer) {
    // Sprawdź, czy przycisk już istnieje
    if (previewContainer.querySelector('.hide-preview-btn')) {
        return;
    }
    
    // Utwórz przycisk zamykania
    const hideBtn = document.createElement('button');
    hideBtn.className = 'hide-preview-btn';
    hideBtn.innerHTML = '<i class="fas fa-times"></i>';
    hideBtn.style.position = 'absolute';
    hideBtn.style.top = '8px';
    hideBtn.style.right = '8px';
    hideBtn.style.background = 'transparent';
    hideBtn.style.border = 'none';
    hideBtn.style.color = '#5a686b';
    hideBtn.style.cursor = 'pointer';
    hideBtn.style.padding = '4px';
    hideBtn.style.zIndex = '999';
    
    // Dodaj obsługę kliknięcia
    hideBtn.addEventListener('click', function() {
        previewContainer.style.display = 'none';
    });
    
    // Dodaj przycisk do kontenera
    previewContainer.appendChild(hideBtn);
} 
/**
 * Pobiera lub tworzy kontener do podglądu plików
 * @returns {HTMLElement} - Element kontenera
 */
function getOrCreateFilePreviewContainer() {
    let previewContainer = document.querySelector('.file-preview-inline');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.className = 'file-preview-inline';
        
        // Wstaw kontener przed inputContainer
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.parentNode.insertBefore(previewContainer, inputContainer);
        }
    }
    
    return previewContainer;
}

/**
 * Tworzy element podglądu pliku
 * @param {File} file - Obiekt pliku
 * @param {boolean} isLoading - Czy jest w trakcie ładowania
 * @returns {HTMLElement} - Element podglądu pliku
 */
function createFilePreviewItem(file, isLoading = false) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-preview-item';
    if (isLoading) {
        fileItem.classList.add('file-uploading');
    }
    
    // Określ ikonę na podstawie typu pliku
    let fileIcon = 'file';
    const fileType = file.type;
    if (fileType.startsWith('image/')) fileIcon = 'file-image';
    else if (fileType.startsWith('text/')) fileIcon = 'file-alt';
    else if (fileType.startsWith('application/pdf')) fileIcon = 'file-pdf';
    else if (fileType.includes('spreadsheet') || fileType.includes('excel')) fileIcon = 'file-excel';
    else if (fileType.includes('document') || fileType.includes('word')) fileIcon = 'file-word';
    
    fileItem.innerHTML = `
        <i class="fas fa-${fileIcon} file-preview-icon"></i>
        <span class="file-preview-name">${file.name}</span>
        ${isLoading ? '<div class="file-loader"></div>' : ''}
    `;
    
    return fileItem;
}

/**
 * Aktualizuje element podglądu pliku po pomyślnym przesłaniu
 * @param {HTMLElement} fileItem - Element podglądu pliku
 * @param {Object} result - Wynik przesłania pliku
 * @param {File} file - Obiekt pliku
 */
function updateFilePreviewItem(fileItem, result, file, textarea) {
    fileItem.classList.remove('file-uploading');
    fileItem.setAttribute('data-file-id', result.fileId);
    
    // Określ ikonę na podstawie typu pliku
    let fileIcon = 'file';
    const fileType = file.type;
    if (fileType.startsWith('image/')) fileIcon = 'file-image';
    else if (fileType.startsWith('text/')) fileIcon = 'file-alt';
    else if (fileType.startsWith('application/pdf')) fileIcon = 'file-pdf';
    else if (fileType.includes('spreadsheet') || fileType.includes('excel')) fileIcon = 'file-excel';
    else if (fileType.includes('document') || fileType.includes('word')) fileIcon = 'file-word';
    
    fileItem.innerHTML = `
        <i class="fas fa-${fileIcon} file-preview-icon"></i>
        <span class="file-preview-name">${result.originalName}</span>
        <i class="fas fa-times file-preview-remove"></i>
    `;
    
    // Dodaj obsługę przycisku usuwania
    const removeBtn = fileItem.querySelector('.file-preview-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Zapobiega wywoływaniu innych zdarzeń
            
            // Usuń plik z listy załączonych plików
            removeFileFromTextarea(fileItem, textarea);
            
            // Usuń element podglądu
            fileItem.remove();
            
            // Jeśli nie ma więcej plików, ukryj kontener
            const previewContainer = document.querySelector('.file-preview-inline');
            if (previewContainer && previewContainer.children.length === 0) {
                previewContainer.style.display = 'none';
            }
        });
    }
}

/**
 * Wyświetla błąd w elemencie podglądu pliku
 * @param {HTMLElement} fileItem - Element podglądu pliku
 * @param {string} fileName - Nazwa pliku
 * @param {string} errorMessage - Komunikat błędu
 */
function showErrorInFilePreviewItem(fileItem, fileName, errorMessage) {
    fileItem.classList.remove('file-uploading');
    fileItem.classList.add('file-error');
    
    fileItem.innerHTML = `
        <i class="fas fa-exclamation-circle file-preview-icon" style="color: #e53e3e;"></i>
        <span class="file-preview-name">${fileName} - ${errorMessage}</span>
        <i class="fas fa-times file-preview-remove"></i>
    `;
    
    // Dodaj obsługę przycisku usuwania
    const removeBtn = fileItem.querySelector('.file-preview-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            // Usuń element podglądu
            fileItem.remove();
            
            // Jeśli nie ma więcej plików, ukryj kontener
            const previewContainer = document.querySelector('.file-preview-inline');
            if (previewContainer && previewContainer.children.length === 0) {
                previewContainer.style.display = 'none';
            }
        });
    }
}

/**
 * Przesyła pojedynczy plik na serwer
 * @param {File} file - Plik do przesłania
 * @param {string} category - Kategoria pliku
 * @returns {Promise<Object>} - Promise z wynikiem przesłania
 */
async function uploadSingleFile(file, category) {
    // Utwórz FormData do przesłania pliku
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    
    try {
        // Wyślij żądanie przesłania pliku
        const response = await fetch('/process-dropped-file', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error uploading file:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Dołącza plik do pola tekstowego
 * @param {HTMLElement} textarea - Pole tekstowe
 * @param {string} fileId - ID pliku
 * @param {string} fileName - Nazwa pliku
 */
function attachFileToTextArea(textarea, fileId, fileName) {
    if (!textarea) return;
    
    // Sprawdź, czy pole tekstowe ma już atrybut z załączonymi plikami
    if (!textarea.hasAttribute('data-attached-files')) {
        textarea.setAttribute('data-attached-files', JSON.stringify([]));
    }
    
    try {
        let attachedFiles = JSON.parse(textarea.getAttribute('data-attached-files'));
        
        // Dodaj nowy plik
        attachedFiles.push({
            fileId: fileId,
            originalName: fileName
        });
        
        // Zaktualizuj atrybut
        textarea.setAttribute('data-attached-files', JSON.stringify(attachedFiles));
    } catch (e) {
        console.error('Error parsing attached files:', e);
        // Resetuj w przypadku błędu
        textarea.setAttribute('data-attached-files', JSON.stringify([{
            fileId: fileId,
            originalName: fileName
        }]));
    }
}

/**
 * Usuwa plik z pola tekstowego
 * @param {HTMLElement} fileItem - Element podglądu pliku
 */
function removeFileFromTextarea(fileItem, textarea) {
    if (!fileItem || !textarea) return;

    const fileId = fileItem.getAttribute('data-file-id');
    if (!fileId) return;

    if (!textarea.hasAttribute('data-attached-files')) return;
    
    try {
        let attachedFiles = JSON.parse(textarea.getAttribute('data-attached-files'));
        
        // Usuń plik z listy
        attachedFiles = attachedFiles.filter(file => file.fileId !== fileId);
        
        // Zaktualizuj atrybut
        textarea.setAttribute('data-attached-files', JSON.stringify(attachedFiles));
    } catch (e) {
        console.error('Error parsing attached files during removal:', e);
    }
}

/**
 * Dodaje plik do listy plików użytkownika
 * @param {Object} fileInfo - Informacje o pliku
 */
function addFileToUserFiles(fileInfo) {
    if (!fileInfo) return;
    
    userFiles.push({
        id: fileInfo.id,
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.type,
        added: new Date().toISOString(),
        category: fileInfo.category
    });
    
    // Aktualizuj odznakę plików
    updateUserFilesBadge();
}


/**
 * Analizuje wybrane pliki
 * @param {Array} fileIds - ID plików do analizy
 * @param {string} context - Kontekst analizy
 */
async function analyzeFiles(fileIds, context = '') {
    if (!fileIds || fileIds.length === 0) {
        showNotification('No files selected for analysis', 'warning');
        return;
    }
    
    try {
        showNotification('Analyzing files...', 'info');
        
        const response = await fetch('/analyze-conversation-files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileIds: fileIds,
                context: context
            }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Dodaj wiadomość użytkownika o analizie plików
            const userMsgId = addUserMessage(context || `Analyze these files: ${result.files_analyzed} file(s)`);
            
            // Dodaj odpowiedź AI
            const aiMsgId = addAIMessage(result.analysis);
            
            // Ukryj kontener podglądu plików
            const previewContainer = document.querySelector('.file-preview-inline');
            if (previewContainer) {
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'none';
            }

            // Wyczyść załączone pliki w polach tekstowych
            document.querySelectorAll('.chat-input').forEach(ta => {
                if (ta.hasAttribute('data-attached-files')) {
                    ta.setAttribute('data-attached-files', JSON.stringify([]));
                }
            });
            
            showNotification('File analysis completed successfully', 'success');
        } else {
            showNotification(`File analysis failed: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error analyzing files:', error);
        showNotification(`Error analyzing files: ${error.message}`, 'error');
    }
}

/**
 * Dostosowanie przycisku Tools w głównym oknie
 */
function fixMainToolsButton() {
    const mainToolsButton = document.getElementById('mainToolsButton');
    if (!mainToolsButton) return;
    
    // Usuń istniejący event listener, jeśli istnieje
    const newToolsButton = mainToolsButton.cloneNode(true);
    mainToolsButton.parentNode.replaceChild(newToolsButton, mainToolsButton);
    
    // Dodaj nowy event listener
    newToolsButton.addEventListener('click', function(event) {
        showToolsDropdown(this.parentElement);
    });
}

/**
 * Inicjalizuje monitorowanie nowych pól tekstowych
 */
function initializeTextAreaObserver() {
    const config = { 
        childList: true, 
        subtree: true 
    };
    
    const callback = function(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Sprawdź czy węzeł jest elementem
                    if (node.nodeType === 1) {
                        // Sprawdź czy węzeł jest polem tekstowym z klasą chat-input
                        if (node.classList && node.classList.contains('chat-input')) {
                            console.log("Wykryto nowe pole tekstowe, dodaję obsługę drag and drop");
                            attachDragDropHandlers(node);
                        }

                        // Sprawdź czy węzeł zawiera pola tekstowe
                        const textareas = node.querySelectorAll('.chat-input');
                        if (textareas.length > 0) {
                            console.log(`Wykryto ${textareas.length} nowych pól tekstowych w dodanym elemencie`);
                            textareas.forEach(textarea => {
                                attachDragDropHandlers(textarea);
                            });
                        }

                        // Sprawdź czy węzeł jest paskiem narzędzi lub go zawiera
                        if (node.classList && node.classList.contains('tools-bar')) {
                            attachToolsHandler(node);
                        }

                        const bars = node.querySelectorAll('.tools-bar');
                        if (bars.length > 0) {
                            bars.forEach(bar => attachToolsHandler(bar));
                        }
                    }
                });
            }
        }
    };
    
    const observer = new MutationObserver(callback);
    observer.observe(document.body, config);
    
    console.log("Uruchomiono obserwator dla nowych pól tekstowych");
}

// Dodatkowe funkcje inicjalizacji
function enhanceInitializeUIEvents() {
    // Napraw przycisk Tools na stronie głównej
    fixMainToolsButton();

    // Inicjalizuj obsługę drag & drop dla pól tekstowych
    initializeTextAreaDragDrop();

    // Inicjalizuj monitorowanie nowych pól tekstowych
    initializeTextAreaObserver();

    // Dodaj obsługę Tools dla istniejących pasków narzędzi
    if (toolsBars && toolsBars.length > 0) {
        toolsBars.forEach(bar => attachToolsHandler(bar));
    } else {
        console.warn('Paski narzędzi (.tools-bar) nie znalezione');
    }
}

// Modal dla File Q&A
function openFileQAModal() {
    // Sprawdź czy modal już istnieje, jeśli nie - utwórz go
    let fileQAModal = document.getElementById('fileQAModal');
    
    if (!fileQAModal) {
        fileQAModal = document.createElement('div');
        fileQAModal.id = 'fileQAModal';
        fileQAModal.className = 'modal';
        
        fileQAModal.innerHTML = `
            <div class="modal-content file-qa-modal">
                <div class="modal-header">
                    <h3>Ask Questions About File</h3>
                    <button class="modal-close" id="closeFileQAModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="file-qa-instructions">
                        <p>Upload a file (PDF, DOCX, TXT) and ask a question about its content.</p>
                    </div>
                    
                    <div class="file-upload-section">
                        <div class="file-upload-area" id="fileQADropArea">
                            <i class="fas fa-cloud-upload-alt file-upload-icon"></i>
                            <div class="file-upload-text">
                                <div><strong>Drag and drop file here</strong></div>
                                <div>or click to browse</div>
                            </div>
                            <input type="file" id="fileQAInput" style="display: none;" accept=".pdf,.docx,.txt">
                        </div>
                        <div id="fileQAPreview" class="file-qa-preview" style="display: none;">
                            <div class="file-qa-preview-item">
                                <i class="fas fa-file file-preview-icon"></i>
                                <span class="file-preview-name" id="fileQAName"></span>
                                <button class="file-preview-remove" id="removeFileQA">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="file-qa-question">
                        <label for="fileQAQuestion">Your Question:</label>
                        <textarea id="fileQAQuestion" class="file-qa-question-input" placeholder="Ask a question about the file content..."></textarea>
                    </div>
                    
                    <div id="fileQAResult" class="file-qa-result" style="display: none;">
                        <h4>Answer:</h4>
                        <div id="fileQAAnswer" class="file-qa-answer"></div>
                    </div>
                    
                    <div id="fileQALoading" class="file-qa-loading" style="display: none;">
                        <div class="loading-animation">
                            <span class="loading-dot"></span>
                            <span class="loading-dot"></span>
                            <span class="loading-dot"></span>
                        </div>
                        <div class="loading-text">Processing your file and question...</div>
                    </div>
                    
                    <div class="file-qa-actions">
                        <button id="cancelFileQABtn" class="cancel-btn">Cancel</button>
                        <button id="askFileQABtn" class="submit-btn" disabled>Ask Question</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(fileQAModal);
        
        // Dodaj obsługę zdarzeń dla modalu
        
        // Zamykanie modalu
        document.getElementById('closeFileQAModal').addEventListener('click', function() {
            fileQAModal.style.display = 'none';
            resetFileQAModal();
        });
        
        document.getElementById('cancelFileQABtn').addEventListener('click', function() {
            fileQAModal.style.display = 'none';
            resetFileQAModal();
        });
        
        // Obsługa uploadu pliku
        const fileQADropArea = document.getElementById('fileQADropArea');
        const fileQAInput = document.getElementById('fileQAInput');
        
        // Kliknięcie w obszar upuszczania
        fileQADropArea.addEventListener('click', function() {
            fileQAInput.click();
        });
        
        // Zmiana pliku w inpucie
        fileQAInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                handleFileQASelection(this.files[0]);
            }
        });
        
        // Obsługa drag & drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileQADropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            fileQADropArea.addEventListener(eventName, function() {
                this.classList.add('highlight');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            fileQADropArea.addEventListener(eventName, function() {
                this.classList.remove('highlight');
            }, false);
        });
        
        fileQADropArea.addEventListener('drop', function(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files && files.length > 0) {
                handleFileQASelection(files[0]);
            }
        }, false);
        
        // Obsługa usuwania pliku
        document.getElementById('removeFileQA').addEventListener('click', function() {
            resetFileQAFile();
        });
        
        // Obsługa przycisku Ask Question
        document.getElementById('askFileQABtn').addEventListener('click', submitFileQA);
        
        // Aktywacja/dezaktywacja przycisku Ask Question
        document.getElementById('fileQAQuestion').addEventListener('input', validateFileQAForm);
    }
    
    // Pokaż modal
    fileQAModal.style.display = 'flex';
}

// Funkcja obsługująca wybór pliku
function handleFileQASelection(file) {
    // Sprawdź typ pliku
    const allowedTypes = [
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'text/plain'
    ];
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isAllowedExtension = ['pdf', 'docx', 'txt'].includes(fileExtension);
    
    if (!allowedTypes.includes(file.type) && !isAllowedExtension) {
        showNotification('Please upload a PDF, DOCX or TXT file.', 'warning');
        return;
    }
    
    // Pokaż podgląd pliku
    document.getElementById('fileQAPreview').style.display = 'block';
    document.getElementById('fileQAName').textContent = file.name;
    
    // Określ ikonę na podstawie typu pliku
    let fileIcon = 'file';
    if (file.type.includes('pdf') || fileExtension === 'pdf') {
        fileIcon = 'file-pdf';
    } else if (file.type.includes('word') || fileExtension === 'docx') {
        fileIcon = 'file-word';
    } else if (file.type.includes('text') || fileExtension === 'txt') {
        fileIcon = 'file-alt';
    }
    
    document.querySelector('#fileQAPreview .file-preview-icon').className = `fas fa-${fileIcon} file-preview-icon`;
    
    // Zapisz plik w pamięci
    window.fileQASelectedFile = file;
    
    // Zaktualizuj stan formularza
    validateFileQAForm();
}

// Funkcja resetująca wybrany plik
function resetFileQAFile() {
    document.getElementById('fileQAPreview').style.display = 'none';
    document.getElementById('fileQAName').textContent = '';
    window.fileQASelectedFile = null;
    
    // Zresetuj input pliku
    const fileInput = document.getElementById('fileQAInput');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Zaktualizuj stan formularza
    validateFileQAForm();
}

// Funkcja resetująca cały modal
function resetFileQAModal() {
    resetFileQAFile();
    document.getElementById('fileQAQuestion').value = '';
    document.getElementById('fileQAResult').style.display = 'none';
    document.getElementById('fileQAAnswer').textContent = '';
    document.getElementById('fileQALoading').style.display = 'none';
    document.getElementById('askFileQABtn').disabled = true;
}

// Funkcja walidująca formularz
function validateFileQAForm() {
    const fileSelected = window.fileQASelectedFile !== undefined && window.fileQASelectedFile !== null;
    const questionProvided = document.getElementById('fileQAQuestion').value.trim() !== '';
    
    document.getElementById('askFileQABtn').disabled = !(fileSelected && questionProvided);
}

// Funkcja wysyłająca formularz
function submitFileQA() {
    if (!window.fileQASelectedFile) {
        showNotification('Please select a file first.', 'warning');
        return;
    }
    
    const question = document.getElementById('fileQAQuestion').value.trim();
    if (!question) {
        showNotification('Please enter a question.', 'warning');
        return;
    }
    
    // Pokaż ładowanie
    document.getElementById('fileQALoading').style.display = 'block';
    document.getElementById('fileQAResult').style.display = 'none';
    document.getElementById('askFileQABtn').disabled = true;
    
    // Przygotuj dane formularza
    const formData = new FormData();
    formData.append('file', window.fileQASelectedFile);
    formData.append('question', question);
    
    // Opcjonalnie dodaj thread_id, jeśli go mamy
    if (threadId) {
        formData.append('thread_id', threadId);
    }
    
    // Wyślij zapytanie
    fetch('/file-qa', {
        method: 'POST',
        body: formData,
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        // Ukryj ładowanie
        document.getElementById('fileQALoading').style.display = 'none';
        
        if (data.success) {
            // Pokaż odpowiedź
            document.getElementById('fileQAResult').style.display = 'block';
            document.getElementById('fileQAAnswer').innerHTML = formatMessageText(data.answer);
            
            // Zachowaj thread_id, jeśli istnieje
            if (data.threadId) {
                threadId = data.threadId;
            }
            
            // Dodaj odpowiedź do historii czatu (opcjonalnie)
            addFileQAToChat(question, data.answer, data.fileId, data.originalName);
            
            showNotification('Question answered successfully!', 'success');
        } else {
            showNotification(data.error || 'Failed to get answer.', 'error');
        }
        
        // Przywróć przycisk
        document.getElementById('askFileQABtn').disabled = false;
    })
    .catch(error => {
        console.error('Error submitting file Q&A:', error);
        document.getElementById('fileQALoading').style.display = 'none';
        document.getElementById('askFileQABtn').disabled = false;
        showNotification('Error processing your request. Please try again.', 'error');
    });
}

// Funkcja dodająca wynik do czatu
function addFileQAToChat(question, answer, fileId, fileName) {
    // Sprawdź czy jesteśmy na stronie czatu
    if (chatContainer) {
        // Ukryj widok inicjalny, pokaż kontener czatu
        if (initialView) initialView.style.display = 'none';
        chatContainer.style.display = 'block';
        
        // Dodaj wiadomość użytkownika
        const userMessageId = addUserMessage(`${question}\n\n[File: ${fileName}]`);
        
        // Dodaj odpowiedź asystenta
        const aiMessageId = addAIMessage(answer);
        
        // Przewiń na dół czatu
        scrollChatToBottom();
    }
}

   /**
    * Funkcja do walidacji podawanych haseł
    */
   function validatePasswords() {
       if (!newPassword || !confirmPassword || !passwordMatchIndicator) return;
       
       const newPass = newPassword.value;
       const confirmPass = confirmPassword.value;
       
       if (confirmPass === '') {
           passwordMatchIndicator.textContent = '';
           passwordMatchIndicator.className = 'password-match-indicator';
           return;
       }
       
       if (newPass === confirmPass) {
           passwordMatchIndicator.textContent = 'Passwords match';
           passwordMatchIndicator.className = 'password-match-indicator match';
           return true;
       } else {
           passwordMatchIndicator.textContent = 'Passwords do not match';
           passwordMatchIndicator.className = 'password-match-indicator not-match';
           return false;
       }
   }

   function initializeUIEvents() {
    console.log("Inicjalizuję dodatkowe eventy UI");
    
    // DODAJ OBSŁUGĘ PROFILE TOGGLE
    const profileToggle = document.getElementById('profileToggle');
    const userDropdown = document.getElementById('userDropdown');
    
    if (profileToggle && userDropdown) {
        // Usuń poprzedni listener
        const newProfileToggle = profileToggle.cloneNode(true);
        profileToggle.parentNode.replaceChild(newProfileToggle, profileToggle);
        
        newProfileToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Profile toggle clicked");
            
            const isVisible = userDropdown.style.display === 'block';
            userDropdown.style.display = isVisible ? 'none' : 'block';
        });
    }
    
    // DODAJ OBSŁUGĘ MENU ITEMS
    const settingsMenuItem = document.getElementById('settingsMenuItem');
    if (settingsMenuItem) {
        settingsMenuItem.addEventListener('click', function() {
            console.log("Settings clicked");
            if (userDropdown) userDropdown.style.display = 'none';
            if (fileUploadContainer) fileUploadContainer.style.display = 'none';
            if (settingsPage) {
                if (appContainer) appContainer.style.display = 'none';
                settingsPage.style.display = 'block';
            }
        });
    }

       // Obsługa wysyłania wiadomości z głównego ekranu
       if (mainSendButton && mainChatInput) {
           // Funkcja do wysyłania wiadomości z głównego ekranu
           mainSendButton.addEventListener('click', sendMainMessage);
           
           // Obsługa naciśnięcia Enter (bez Shift)
           mainChatInput.addEventListener('keypress', function(e) {
               if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   sendMainMessage();
               }
           });
       }
       
       // Obsługa przycisku załącznika na głównym ekranie
       if (mainAttachButton) {
           mainAttachButton.addEventListener('click', function() {
               if (fileUploadContainer && fileUploadContainer.style.display === 'block') {
                   fileUploadContainer.style.display = 'none';
               } else {
                   if (fileUploadContainer) fileUploadContainer.style.display = 'block';
                   if (fileInput) fileInput.click();
               }
           });
       }

       // --- Obsługa zmiany hasła ---
       if (changePasswordBtn) {
           changePasswordBtn.addEventListener('click', function() {
               // Pokaż modal zmiany hasła zamiast resetu
               if (changePasswordModal) {
                   changePasswordModal.style.display = 'flex';
                   if (currentPassword) currentPassword.focus();
               }
           });
       }

       if (closeChangePasswordModal) {
           closeChangePasswordModal.addEventListener('click', function() {
               if (changePasswordModal) changePasswordModal.style.display = 'none';
           });
       }

       if (cancelChangePasswordBtn) {
           cancelChangePasswordBtn.addEventListener('click', function() {
               if (changePasswordModal) changePasswordModal.style.display = 'none';
           });
       }

       // Walidacja hasła w czasie rzeczywistym
       if (newPassword && confirmPassword) {
           confirmPassword.addEventListener('input', validatePasswords);
           newPassword.addEventListener('input', function() {
               if (confirmPassword.value) {
                   validatePasswords();
               }
           });
       }

       // Obsługa formularza zmiany hasła
       if (changePasswordForm) {
           changePasswordForm.addEventListener('submit', async function(e) {
               e.preventDefault();
               
               // Walidacja
               if (!validatePasswords()) {
                   showNotification("Passwords do not match.", "error");
                   return;
               }
               
               const currentPass = currentPassword ? currentPassword.value : '';
               const newPass = newPassword ? newPassword.value : '';
               
               if (!currentPass || !newPass) {
                   showNotification("All fields are required.", "error");
                   return;
               }
               
               // Wywołanie API do zmiany hasła
               try {
                   const response = await changePassword(currentPass, newPass);
                   
                   if (response.success) {
                       showNotification("Your password has been successfully updated.", "success");
                       // Ukryj modal
                       if (changePasswordModal) changePasswordModal.style.display = 'none';
                       // Wyczyść pola formularza
                       if (changePasswordForm) changePasswordForm.reset();
                   } else {
                       showNotification(response.error || "Failed to change password. Please check your current password.", "error");
                   }
               } catch (error) {
                   console.error("Error changing password:", error);
                   showNotification("An error occurred while trying to change your password.", "error");
               }
           });
       }

       // Obsługa przycisków kopiowania
       document.addEventListener('click', function(event) {
           const copyBtn = event.target.closest('.copy-btn');
           if (copyBtn) {
               const messageContent = copyBtn.closest('.message-content');
               if (messageContent) {
                   const textElement = messageContent.querySelector('.message-text');
                   if (textElement) {
                       const textToCopy = textElement.textContent.trim();
                       copyToClipboard(textToCopy);
                       showNotification('Text copied to clipboard!', 'success');
                   } else {
                       console.warn("Nie znaleziono elementu .message-text do skopiowania");
                   }
               }
           }
       });
       
       // Obsługa przycisku "Add to Pitch Deck"
       document.addEventListener('click', function(event) {
           const exportBtn = event.target.closest('.export-action');
           if (exportBtn) {
               const messageContent = exportBtn.closest('.message-content');
               if (messageContent) {
                   const textElement = messageContent.querySelector('.message-text');
                   if (textElement) {
                       currentExportText = textElement.textContent.trim();
                       if (exportModal) {
                           // Ustaw domyślnie wybraną sekcję na bieżącą kategorię, jeśli istnieje
                           const sectionItems = exportModal.querySelectorAll('.export-section-item');
                           sectionItems.forEach(item => {
                               item.classList.remove('selected');
                               if (currentCategory && item.textContent.trim() === currentCategory) {
                                   item.classList.add('selected');
                               }
                           });
                           // Jeśli żadna sekcja nie pasuje, zaznacz pierwszą (lub żadną)
                           if (!exportModal.querySelector('.export-section-item.selected')) {
                               if (sectionItems.length > 0) {
                                   // sectionItems[0].classList.add('selected'); // Opcjonalne zaznaczanie pierwszej
                               }
                           }
                           exportModal.style.display = 'flex';
                       }
                   } else {
                       console.warn("Nie znaleziono elementu .message-text do wyeksportowania");
                   }
               }
           }
       });

       // Obsługa przycisku kciuka w górę/dół
       document.addEventListener('click', function(event) {
           const feedbackBtn = event.target.closest('.feedback-btn');
           if (feedbackBtn) {
               const messageId = feedbackBtn.getAttribute('data-message-id');
               const isThumbsUp = feedbackBtn.classList.contains('thumbs-up');
               const messageElement = document.getElementById(messageId);

               if (messageElement) {
                   const thumbsUpBtn = messageElement.querySelector('.thumbs-up');
                   const thumbsDownBtn = messageElement.querySelector('.thumbs-down');
                   let feedbackChanged = false;
                   let newFeedbackStatus = null; // null, 'positive', 'negative'

                   if (feedbackBtn.classList.contains('active')) {
                       // Odznaczanie
                       feedbackBtn.classList.remove('active');
                       feedbackChanged = true;
                       newFeedbackStatus = null;
                   } else {
                       // Zaznaczanie
                       if (thumbsUpBtn) thumbsUpBtn.classList.remove('active');
                       if (thumbsDownBtn) thumbsDownBtn.classList.remove('active');
                       feedbackBtn.classList.add('active');
                       feedbackChanged = true;
                       newFeedbackStatus = isThumbsUp ? 'positive' : 'negative';
                   }
                   
                   // Zapisz feedback, jeśli się zmienił
                   if (feedbackChanged) {
                       console.log(`Feedback for message ${messageId}: ${newFeedbackStatus}`);
                       // TODO: Wyślij feedback do backendu
                       // callAPI('/feedback', { message_id: messageId, rating: newFeedbackStatus }, 'POST');

                       if (newFeedbackStatus === 'positive') {
                           showNotification('Thank you for your feedback!', 'success');
                       } else if (newFeedbackStatus === 'negative') {
                           showNotification('Thank you for your feedback. We\'ll try to improve.', 'info');
                       }
                   }
               }
           }
       });

       // Obsługa zamykania modalu eksportu
       if (closeModalBtn) {
           closeModalBtn.addEventListener('click', function() {
               if (exportModal) exportModal.style.display = 'none';
           });
       }

       if (cancelExportBtn) {
           cancelExportBtn.addEventListener('click', function() {
               if (exportModal) exportModal.style.display = 'none';
           });
       }
       // Obsługa potwierdzenia eksportu
       if (confirmExportBtn) {
           confirmExportBtn.addEventListener('click', function() {
               // Pobierz wybraną sekcję
               const selectedSection = document.querySelector('.export-section-item.selected');
               if (selectedSection && currentExportText) {
                   const sectionName = selectedSection.textContent.trim();

                   // Dodaj treść do zapisanych odpowiedzi
                   if (!savedContent[sectionName]) {
                       savedContent[sectionName] = [];
                   }

                   savedContent[sectionName].push({
                       content: currentExportText,
                       timestamp: new Date().toISOString(),
                       category: currentCategory // Zapisz też kategorię, w której to było
                   });

                   // Zwiększ licznik zapisanych odpowiedzi
                   updateSavedContentBadge();

                   // Aktualizuj panel zapisanych odpowiedzi, jeśli jest otwarty
                   if (savedContentPanel && savedContentPanel.classList.contains('open')) {
                       renderSavedContent();
                   }

                   // Ukryj modal
                   if (exportModal) exportModal.style.display = 'none';

                   // Pokaż powiadomienie
                   showNotification(`Added to ${sectionName} section!`, 'success');
                   currentExportText = ""; // Wyczyść po dodaniu
               } else if (!selectedSection) {
                   showNotification("Please select a section to add the content to.", "warning");
               }
           });
       }

       // Obsługa wyboru sekcji w modalu eksportu
       document.querySelectorAll('.export-section-item').forEach(function(item) {
           item.addEventListener('click', function() {
               // Usuń zaznaczenie z innych elementów
               document.querySelectorAll('.export-section-item').forEach(el => {
                   el.classList.remove('selected');
               });

               // Zaznacz kliknięty element
               this.classList.add('selected');
           });
       });
       
       // Obsługa przycisku "View Saved Content"
       if (viewSavedContentBtn) {
           viewSavedContentBtn.addEventListener('click', function() {
               toggleSavedContentPanel();
           });
       } else {
           console.warn("Przycisk 'View Saved Content' nie znaleziony");
       }

       // Obsługa zamykania panelu zapisanych odpowiedzi
       if (closeSavedContentBtn) {
           closeSavedContentBtn.addEventListener('click', function() {
               if (savedContentPanel) savedContentPanel.classList.remove('open');
           });
       } else {
           console.warn("Przycisk zamykania panelu zapisanych odpowiedzi nie znaleziony");
       }

       // Obsługa przycisku downloadPitchDeckBtn
       if (downloadPitchDeckBtn) {
           downloadPitchDeckBtn.addEventListener('click', function() {
               downloadPitchDeck();
           });
       } else {
           console.warn("Przycisk pobierania pitch decku nie znaleziony");
       }

       if (generatePresentationBtn) {
           generatePresentationBtn.addEventListener('click', function() {
               generatePresentation();
           });
       } else {
           console.warn("Przycisk generowania prezentacji nie znaleziony");
       }

       // Obsługa przycisku "View User Files"
       if (viewUserFilesBtn) {
           viewUserFilesBtn.addEventListener('click', function() {
               toggleUserFilesPanel();
           });
       } else {
           console.warn("Przycisk 'View User Files' nie znaleziony");
       }

       // Obsługa zamykania panelu plików użytkownika
       if (closeUserFilesBtn) {
           closeUserFilesBtn.addEventListener('click', function() {
               if (userFilesPanel) userFilesPanel.classList.remove('open');
           });
       } else {
           console.warn("Przycisk zamykania panelu plików użytkownika nie znaleziony");
       }
       
       // Obsługa przycisku "Upload New File" w panelu plików
       if (uploadNewFileBtn) {
           uploadNewFileBtn.addEventListener('click', function() {
               // Otwórz okno wyboru pliku
               if (fileInput) fileInput.click();
           });
       } else {
           console.warn("Przycisk 'Upload New File' w panelu plików nie znaleziony");
       }

       // Obsługa menu Tools dla wszystkich pasków narzędzi
       if (toolsBars && toolsBars.length > 0) {
           toolsBars.forEach(bar => {
               attachToolsHandler(bar);
           });
       } else {
           console.warn('Paski narzędzi (.tools-bar) nie znalezione');
       }

       // Obsługa eksportu danych (z Etapu 2)
       if (exportDataBtn) {
           exportDataBtn.addEventListener('click', async function() {
               console.log("Kliknięto przycisk eksportu danych");
               await exportAccountData();
           });
       } else {
           console.warn("Przycisk eksportu danych nie znaleziony");
       }
       
       // Obsługa usuwania konta (z Etapu 2)
       if (deleteAccountBtn) {
           deleteAccountBtn.addEventListener('click', function() {
               console.log("Kliknięto przycisk usuwania konta");
               // Pokaż podwójne potwierdzenie przed usunięciem
               if (confirm("ARE YOU ABSOLUTELY SURE?\nThis action cannot be undone and will permanently delete your account and all associated data.")) {
                   // Poproś o hasło dla dodatkowej weryfikacji
                   const password = prompt("Please enter your password to confirm account deletion:");
                   if (password) {
                       deleteUserAccount(password);
                   } else {
                       showNotification("Account deletion cancelled - password is required.", "info");
                   }
               }
           });
       } else {
           console.warn("Przycisk usuwania konta nie znaleziony");
       }

       // Obsługa modalu web search
       if (closeWebSearchModal) {
           closeWebSearchModal.addEventListener('click', function() {
               if (webSearchModal) webSearchModal.style.display = 'none';
           });
       }

       if (runWebSearchBtn && webSearchInput) {
           const performSearchAction = () => {
               const query = webSearchInput.value.trim();
               if (query) {
                   performWebSearch(query);
               } else {
                   showNotification("Please enter a search query.", "warning");
               }
           };
           runWebSearchBtn.addEventListener('click', performSearchAction);
           webSearchInput.addEventListener('keypress', function(e) {
               if (e.key === 'Enter') {
                   performSearchAction();
               }
           });
       }

       // Obsługa modalu analizy URL
       if (closeUrlAnalysisModal) {
           closeUrlAnalysisModal.addEventListener('click', function() {
               if (urlAnalysisModal) urlAnalysisModal.style.display = 'none';
           });
       }
       
       if (analyzeUrlBtn && urlInput) {
           const analyzeUrlAction = () => {
               const urlToAnalyze = urlInput.value.trim();
               if (urlToAnalyze) {
                   // Prosta walidacja URL
                   try {
                       new URL(urlToAnalyze);
                       analyzeUrl(urlToAnalyze, currentCategory);
                   } catch (_) {
                       showNotification("Please enter a valid URL (e.g., https://example.com).", "warning");
                   }
               } else {
                   showNotification("Please enter a URL to analyze.", "warning");
               }
           };
           analyzeUrlBtn.addEventListener('click', analyzeUrlAction);
           urlInput.addEventListener('keypress', function(e) {
               if (e.key === 'Enter') {
                   analyzeUrlAction();
               }
           });
       }

       // Obsługa modalu udostępniania
       if (shareMenuItem) {
           shareMenuItem.addEventListener('click', function() {
               if (userDropdown) userDropdown.style.display = 'none';
               if (shareModal) {
                   // TODO: Wygeneruj link na backendzie? Na razie placeholder
                   if (shareLinkInput) shareLinkInput.value = `https://deckster.ai/share/placeholder_${Date.now()}`;
                   shareModal.style.display = 'flex';
               }
           });
       } else {
           console.warn("Element menu 'Share' nie znaleziony");
       }

       if (closeShareModal) {
           closeShareModal.addEventListener('click', function() {
               if (shareModal) shareModal.style.display = 'none';
           });
       }

       if (copyShareLinkBtn && shareLinkInput) {
           copyShareLinkBtn.addEventListener('click', function() {
               copyToClipboard(shareLinkInput.value);
               showNotification('Share link copied to clipboard!', 'success');
           });
       }

       if (generateNewLinkBtn) {
           generateNewLinkBtn.addEventListener('click', function() {
               // TODO: Wywołaj API backendu do generowania nowego linku
               const newShareId = 'new_placeholder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
               const newShareLink = `https://deckster.ai/share/${newShareId}`;
               if (shareLinkInput) shareLinkInput.value = newShareLink;
               showNotification('New share link generation (backend) not implemented yet!', 'info');
           });
       }

       if (shareViaEmailBtn) {
           shareViaEmailBtn.addEventListener('click', function() {
               const shareLink = shareLinkInput ? shareLinkInput.value : '';
               if (shareLink) {
                   const mailtoLink = `mailto:?subject=Check out Deckster AI&body=I'd like to share Deckster AI with you. Click this link to access: ${encodeURIComponent(shareLink)}`;
                   window.open(mailtoLink);
               } else {
                   showNotification("No share link available.", "warning");
               }
           });
       }

       // Obsługa przycisku upgrade
       if (upgradeBtn) {
           upgradeBtn.addEventListener('click', function() {
               if (upgradePlanModal) upgradePlanModal.style.display = 'flex';
           });
       } else {
           console.warn("Przycisk 'Upgrade' nie znaleziony");
       }

       if (closeUpgradePlanModal) {
           closeUpgradePlanModal.addEventListener('click', function() {
               if (upgradePlanModal) upgradePlanModal.style.display = 'none';
           });
       }

       // Obsługa przycisku kontaktu
       if (contactMenuItem) {
           contactMenuItem.addEventListener('click', function() {
               if (contactSubmenu) {
                   const isVisible = contactSubmenu.style.display === 'block';
                   contactSubmenu.style.display = isVisible ? 'none' : 'block';
                   // Zmień ikonę chevron
                   const icon = contactMenuItem.querySelector('.fa-chevron-right, .fa-chevron-down');
                   if (icon) {
                       icon.classList.toggle('fa-chevron-right', isVisible);
                       icon.classList.toggle('fa-chevron-down', !isVisible);
                   }
               }
           });
       } else {
           console.warn("Element menu 'Contact' nie znaleziony");
       }

       // Obsługa przycisku "New Chat"
       if (newChatBtn) {
           newChatBtn.addEventListener('click', function() {
               startNewChat();
           });
       } else {
           console.warn("Przycisk 'New Chat' nie znaleziony");
       }

       // Obsługa wyszukiwania w sidebarze
       if (searchInput) {
           searchInput.addEventListener('input', function(e) { // Zmieniono na 'input' dla dynamicznego filtrowania
               const searchTerm = this.value.trim().toLowerCase();
               filterHistoryAndCategories(searchTerm); // Funkcja do filtrowania (można dodać później)
           });
           
           searchInput.addEventListener('keypress', function(e) {
               if (e.key === 'Enter') {
                   const searchTerm = this.value.trim();
                   if (searchTerm) {
                       searchConversations(searchTerm); // Funkcja do wyszukiwania w treści (już istnieje)
                   }
               }
           });
       } else {
           console.warn("Pole wyszukiwania w sidebarze nie znalezione");
       }

       // Obsługa wyboru i przesyłania plików
       if (fileInput) {
           fileInput.addEventListener('change', function() {
               if (!dropInProgress) {
                   handleFiles(this.files);
               }
               this.value = null; // Resetuj input, aby można było wybrać ten sam plik ponownie
           });
       } else {
           console.warn("Input plików (#fileInput) nie znaleziony");
       }

       if (dropArea) {
           // Prevent default drag behaviors
           ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
               dropArea.addEventListener(eventName, preventDefaults, false);
               document.body.addEventListener(eventName, preventDefaults, false); // Zapobiegaj otwieraniu pliku w nowej karcie
           });

           // Highlight drop area when item is dragged over it
           ['dragenter', 'dragover'].forEach(eventName => {
               dropArea.addEventListener(eventName, highlight, false);
           });

           ['dragleave', 'drop'].forEach(eventName => {
               dropArea.addEventListener(eventName, unhighlight, false);
           });

           // Handle dropped files
           dropArea.addEventListener('drop', handleDrop, false);

           // Handle click on drop area
           dropArea.addEventListener('click', function() {
               if (fileInput) fileInput.click();
           });
       } else {
           console.warn("Obszar upuszczania plików (#dropArea) nie znaleziony");
       }
       
       // Zamknij dropdown użytkownika i submenu kontaktu po kliknięciu gdziekolwiek indziej
       document.addEventListener('click', function(event) {
           // Zamknij dropdown użytkownika
           if (userDropdown && userDropdown.style.display === 'block') {
               if (!profileToggle.contains(event.target) && !userDropdown.contains(event.target)) {
                   userDropdown.style.display = 'none';
               }
           }
           
           // Zamknij submenu kontaktu
           if (contactSubmenu && contactSubmenu.style.display === 'block') {
               if (!contactMenuItem.contains(event.target) && !contactSubmenu.contains(event.target)) {
                   contactSubmenu.style.display = 'none';
                   // Resetuj ikonę chevron
                   const icon = contactMenuItem.querySelector('.fa-chevron-down');
                   if (icon) {
                       icon.classList.remove('fa-chevron-down');
                       icon.classList.add('fa-chevron-right');
                   }
               }
           }
           
           // Zamknij dropdown narzędzi
           const toolsDropdown = document.getElementById('toolsDropdown');
           if (toolsDropdown && toolsDropdown.classList.contains('visible')) {
               const insideBar = Array.from(toolsBars).some(bar => bar.contains(event.target));
               if (!insideBar && !toolsDropdown.contains(event.target)) {
                   hideToolsDropdown();
               }
           }
       });

       // Edycja Nazwy Profilu (etap 1)
       if (editProfileNameBtn) {
           editProfileNameBtn.addEventListener('click', function() {
               toggleProfileNameEdit(true);
           });
       } else {
           console.warn("Przycisk edycji nazwy profilu nie znaleziony.");
       }
       
       // Zmiana Adresu Email (etap 1)
       if (changeEmailBtn) {
           changeEmailBtn.addEventListener('click', function() {
               const newEmail = prompt("Enter your new email address:", currentUser.email);
               if (newEmail && newEmail !== currentUser.email) {
                   changeEmailRequest(newEmail);
               } else if (newEmail === currentUser.email) {
                   showNotification("This is already your current email address.", "info");
               }
           });
       } else {
           console.warn("Przycisk zmiany emaila nie znaleziony.");
       }
       
       // Przełącznik Powiadomień Email (etap 1)
       if (emailNotifyToggle) {
           emailNotifyToggle.addEventListener('change', function() {
               const isEnabled = this.checked;
               changeNotificationSettings(isEnabled);
           });
       } else {
           console.warn("Przełącznik powiadomień email nie znaleziony.");
       }

       // Obsługa wysyłania wiadomości
       if (sendButton && chatInput) {
           // Funkcja do wysyłania wiadomości
           const sendCurrentMessage = () => {
               const message = chatInput.value.trim();
               if (message || (chatInput.hasAttribute('data-attached-files') && 
                             JSON.parse(chatInput.getAttribute('data-attached-files')).length > 0)) {
                   sendMessage(message);
               }
           };

           // Obsługa kliknięcia przycisku wysyłania
           sendButton.addEventListener('click', sendCurrentMessage);

           // Obsługa naciśnięcia Enter (bez Shift)
           chatInput.addEventListener('keypress', function(e) {
               if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault(); // Zapobiegaj domyślnemu Enter (nowa linia)
                   sendCurrentMessage();
               }
           });
       } else {
           console.warn("Elementy wysyłania wiadomości nie znalezione");
       }
       
       // Obsługa przycisku załącznika
       if (attachButton) {
           attachButton.addEventListener('click', function() {
               if (fileUploadContainer && fileUploadContainer.style.display === 'block') {
                   fileUploadContainer.style.display = 'none';
               } else {
                   if (fileUploadContainer) fileUploadContainer.style.display = 'block';
                   if (fileInput) fileInput.click();
               }
           });
       } else {
           console.warn("Przycisk załącznika nie znaleziony");
       }

       // Obsługa wylogowania
       const logoutBtn = document.querySelector('.logout-btn');
       if (logoutBtn) {
           logoutBtn.addEventListener('click', function() {
               if (confirm("Are you sure you want to log out?")) {
                   preserveUserData();
            
                   callAPI('/logout', {}, 'POST')
                       .then(response => {
                           if (response.success) {
                               showNotification("Logging out...", "info");
                               // KRYTYCZNA ZMIANA: Przekieruj na Auth0 logout URL
                               if (response.auth0_logout_url) {
                                   window.location.href = response.auth0_logout_url;
                               } else {
                                   // Fallback
                                   window.location.href = '/';
                               }
                           } else {
                               showNotification("Logout failed: " + (response.error || "Unknown error"), "error");
                           }
                       })
                       .catch(error => {
                           console.error("Logout error:", error);
                           // Fallback - wyczyść lokalnie i przekieruj
                           showNotification("Logout error, redirecting...", "error");
                           window.location.href = '/';
                       });
               }
           });
       }

       
       // Obsługa nawigacji głównej
       if (settingsMenuItem) {
           settingsMenuItem.addEventListener('click', function() {
               if (userDropdown) userDropdown.style.display = 'none';
               if (fileUploadContainer) fileUploadContainer.style.display = 'none';
               if (settingsPage) {
                   if (appContainer) appContainer.style.display = 'none';
                   settingsPage.style.display = 'block';
               }
           });
       }
       
       if (backToMainBtn) {
           backToMainBtn.addEventListener('click', function() {
               if (settingsPage) settingsPage.style.display = 'none';
               if (appContainer) appContainer.style.display = 'flex';
               if (fileUploadContainer) fileUploadContainer.style.display = 'none';
           });
       }
       
       if (introMenuItem) {
           introMenuItem.addEventListener('click', function() {
               if (userDropdown) userDropdown.style.display = 'none';
               if (fileUploadContainer) fileUploadContainer.style.display = 'none';
               if (introSection) {
                   if (appContainer) appContainer.style.display = 'none';
                   if (settingsPage) settingsPage.style.display = 'none';
                   introSection.style.display = 'block';
               }
           });
       }
       
       // Naprawiona obsługa przycisku Back to App w Intro
       if (backToAppFromIntroBtn) {
           backToAppFromIntroBtn.addEventListener('click', function() {
               console.log("Przechodzę z intro do aplikacji");
        
               // Oznacz że użytkownik widział intro
               if (currentUser && currentUser.user_id) {
                   localStorage.setItem('hasSeenIntro_' + currentUser.user_id, 'true');
               }
        
               if (introSection) introSection.style.display = 'none';
               if (appContainer) {
                   appContainer.style.display = 'flex';
                   if (fileUploadContainer) fileUploadContainer.style.display = 'none';
                   // Przechowujemy stan UI pomiędzy przełączeniami
                   if (threadId === null) {
                       initializeUI(); // Inicjalizuj UI tylko jeśli nie było wcześniej inicjalizowane
                   }
               }
           });
       }       
       if (profileToggle) {
           profileToggle.addEventListener('click', function() {
               if (userDropdown) {
                   userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
               }
           });
       }
       
       // Inicjalizuj funkcjonalność awatara
       console.log("Inicjalizuję funkcjonalność awatara");
       } 

           
       // Obsługa linku Eyepi.ai
    const eyepiLink = document.querySelector('.eyepi-link');
    if (eyepiLink) {
        eyepiLink.addEventListener('click', function(e) {
            console.log('Eyepi.ai link clicked from settings page');
            showNotification('Opening Eyepi.ai in a new tab...', 'info');
        });
        
        eyepiLink.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-1px)';
        });
        
        eyepiLink.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    }


   /**
    * Modify sendMessage to update history and handle attached files
    * @param {string} message - Message to send
    */
    async function sendMessage(message) {
    // Check if there is a message or attached files
    const hasAttachedFiles = chatInput && chatInput.hasAttribute('data-attached-files') && 
                            JSON.parse(chatInput.getAttribute('data-attached-files')).length > 0;
                            
    if (!message.trim() && !hasAttachedFiles) {
        return;
    }
    
    // Pobierz załączone pliki
    let attachedFiles = [];
    if (chatInput && chatInput.hasAttribute('data-attached-files')) {
        try {
            attachedFiles = JSON.parse(chatInput.getAttribute('data-attached-files')) || [];
        } catch (e) {
            console.error("Error parsing attached files data:", e);
            attachedFiles = [];
        }
    }
    
    // POPRAWIONA LOGIKA OBSŁUGI THREAD_ID
    // 1. Sprawdź czy mamy thread_id i czy jest prawidłowy
    if (threadId && !is_valid_thread_id(threadId)) {
        console.warn("Invalid thread_id format, will request new one from backend");
        threadId = null; // Wyczyść nieprawidłowy thread_id
    }
    
    // Jeśli nie ma wybranej kategorii, używamy ogólnego chatu
    if (!currentCategory) {
        return await sendGeneralMessage(message, attachedFiles);
    }
    
    // Update chat UI
    addUserMessage(message);
    
    // Add loading message
    const loadingMsgId = addLoadingMessage();
    
    try {
        let response;
        
        // Przygotuj dane do wysłania
        const requestData = {
            question: message,
            topic: currentCategory || '',
            threadId: threadId // Może być null - backend obsłuży
        };
        
        // If there are files, process them first
        if (attachedFiles.length > 0) {
            const filesToProcess = attachedFiles.map(file => ({
                fileId: file.fileId,
                originalName: file.originalName
            }));
            
            response = await processFiles(filesToProcess, message);
            
            // Wyczyść atrybut plików dołączonych
            if (chatInput) {
                chatInput.setAttribute('data-attached-files', JSON.stringify([]));
            }
            
            // Ukryj kontener podglądu plików
            const previewContainer = document.querySelector('.file-preview-inline');
            if (previewContainer) {
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'none';
            }
        } else {
            // Otherwise, just send the message
            response = await askAI(message);
        }
        
        // Remove loading message
        removeLoadingMessage(loadingMsgId);
        
        // KRYTYCZNE: Zaktualizuj threadId z odpowiedzi
        if (response.threadId && is_valid_thread_id(response.threadId)) {
            if (threadId !== response.threadId) {
                console.log(`Updated threadId: ${threadId} -> ${response.threadId}`);
                threadId = response.threadId;
            }
        }
        
        // Add AI response
        if (response.error) {
            addErrorMessage(response.error);
        } else if (response.answer) {
            addAIMessage(response.answer);
        } else {
            addErrorMessage("Received empty response from AI.");
        }
        
        // Aktualizuj historię konwersacji po dodaniu odpowiedzi
        updateConversationHistory();
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeLoadingMessage(loadingMsgId);
        addErrorMessage(`Failed to get a response: ${error.message}`);
    }
}

/**
 * Obsługa ogólnego chatu z poprawnym zarządzaniem thread_id
 */
async function sendGeneralMessage(message, attachedFiles = []) {
    if (initialView) initialView.style.display = 'none';
    if (chatContainer) chatContainer.style.display = 'block';
    
    const userMsgId = addUserMessage(message);
    const loadingMsgId = addLoadingMessage();
    
    try {
        let response;
        
        if (attachedFiles && attachedFiles.length > 0) {
            const filesToProcess = attachedFiles.map(file => ({
                fileId: file.fileId,
                originalName: file.originalName
            }));
            
            response = await processFiles(filesToProcess, message);
        } else {
            // Wyślij do general-chat endpoint
            const requestData = {
                message: message,
                threadId: threadId // Backend sprawdzi i utworzy nowy jeśli potrzeba
            };
            
            const fetchResponse = await fetch('/general-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData),
                credentials: 'include'
            });
            
            if (!fetchResponse.ok) {
                throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
            }
            
            response = await fetchResponse.json();
        }
        
        removeLoadingMessage(loadingMsgId);
        
        // KRYTYCZNE: Aktualizuj threadId z odpowiedzi
        if (response.threadId && is_valid_thread_id(response.threadId)) {
            if (threadId !== response.threadId) {
                console.log(`Updated threadId in general chat: ${threadId} -> ${response.threadId}`);
                threadId = response.threadId;
            }
        }
        
        if (response.error) {
            addErrorMessage(response.error);
        } else if (response.answer) {
            const msgId = addAIMessage(response.answer);
            updateGeneralChatHistory(message, response.answer);
        } else {
            addErrorMessage("No response received from AI");
        }
        
        // Wyczyść pola
        if (chatInput) chatInput.value = '';
        if (mainChatInput) mainChatInput.value = '';
        
        // Wyczyść załączniki
        if (attachedFiles.length > 0) {
            const previewContainer = document.querySelector('.file-preview-inline');
            if (previewContainer) {
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Error in general chat:', error);
        removeLoadingMessage(loadingMsgId);
        addErrorMessage(`Failed to get response: ${error.message}`);
    }
}
   /**
    * Funkcja wysyłająca wiadomość z głównego pola wejściowego (ogólny chat)
    */
   function sendMainMessage() {
       const message = mainChatInput.value.trim();
       if (!message) return;
       
       // Sprawdź czy są załączone pliki do textarea
       let attachedFiles = [];
       if (mainChatInput.hasAttribute('data-attached-files')) {
           try {
               attachedFiles = JSON.parse(mainChatInput.getAttribute('data-attached-files')) || [];
           } catch (e) {
               console.error("Error parsing attached files data:", e);
               attachedFiles = [];
           }
       }
       
       // Dodajemy wiadomość użytkownika do interfejsu
       if (initialView) initialView.style.display = 'none';
       if (chatContainer) {
           chatContainer.style.display = 'block';
           
           // Dodaj wiadomość użytkownika
           const userMsgId = addUserMessage(message);
           
           // Dodaj animację ładowania
           const loadingMsgId = addLoadingMessage();
           
           // Jeśli są załączone pliki, użyj API do ich przetworzenia
           if (attachedFiles && attachedFiles.length > 0) {
               // Przygotuj dane o plikach do analizy
               const filesToProcess = attachedFiles.map(file => ({
                   fileId: file.fileId,
                   originalName: file.originalName
               }));
               
               // Wywołaj funkcję przetwarzania plików z wiadomością
               processFiles(filesToProcess, message)
                   .then(response => {
                       // Usuń animację ładowania
                       removeLoadingMessage(loadingMsgId);
                       
                       if (response.error) {
                           addErrorMessage(response.error);
                       } else if (response.answer) {
                           // Dodaj odpowiedź asystenta
                           const msgId = addAIMessage(response.answer);
                           
                           // Zaktualizuj threadId jeśli został zwrócony
                           if (response.threadId && response.threadId !== threadId) {
                               threadId = response.threadId;
                           }
                           
                           // Dodaj do historii ogólnego chatu
                           updateGeneralChatHistory(message, response.answer);
                       } else {
                           addErrorMessage("No response received from AI");
                       }
                       
                       // Wyczyść pole wejściowe i załączniki
                       mainChatInput.value = '';
                       mainChatInput.setAttribute('data-attached-files', JSON.stringify([]));
                       
                       // Ukryj kontener podglądu plików
                       const previewContainer = document.querySelector('.file-preview-inline');
                       if (previewContainer) {
                           previewContainer.innerHTML = '';
                           previewContainer.style.display = 'none';
                       }
                   })
                   .catch(error => {
                       console.error('Error processing files with message:', error);
                       removeLoadingMessage(loadingMsgId);
                       addErrorMessage(`Failed to process files: ${error.message}`);
                   });
           } else {
               // Wyślij zapytanie do ogólnego chatu
               fetch('/general-chat', {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json'
                   },
                   body: JSON.stringify({
                       message: message
                   }),
                   credentials: 'include'
               })
               .then(response => response.json())
               .then(data => {
                   // Usuń animację ładowania
                   removeLoadingMessage(loadingMsgId);
                   
                   if (data.error) {
                       addErrorMessage(data.error);
                   } else if (data.answer) {
                       // Dodaj odpowiedź asystenta
                       const msgId = addAIMessage(data.answer);
                       
                       // Zaktualizuj threadId jeśli został zwrócony
                       if (data.threadId && data.threadId !== threadId) {
                           threadId = data.threadId;
                       }
                       
// Dodaj do historii ogólnego chatu
                       updateGeneralChatHistory(message, data.answer);
                   }
               })
               .catch(error => {
                   console.error('Error in general chat:', error);
                   removeLoadingMessage(loadingMsgId);
                   addErrorMessage(`Failed to get response: ${error.message}`);
               });
           }
           
           // Wyczyść pole wejściowe
           mainChatInput.value = '';
       }
   }

   /**
     * Funkcja do aktualizacji historii ogólnego chatu
     */
    function updateGeneralChatHistory(question, answer) {
        // Dodaj wpis do lokalnego stanu general_chat_history
        const userId = currentUser.user_id || 'unknown_user';
        
        if (!generalChatHistory) {
            generalChatHistory = {};
        }
        
        if (!generalChatHistory[userId]) {
            generalChatHistory[userId] = [];
        }
        
        generalChatHistory[userId].push({
            question: question,
            answer: answer,
            timestamp: Math.floor(Date.now() / 1000) // Timestamp w sekundach
        });
        
        // Aktualizuj UI historii
        loadConversationHistory();
    }

    /**
     * Funkcja do ładowania historii ogólnego chatu
     */
    function loadGeneralChatHistory() {
        // Pobierz historię z serwera
        fetch('/get-general-chat-history', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.history) {
                const userId = currentUser.user_id || 'unknown_user';
                generalChatHistory[userId] = data.history;
                
                // Aktualizuj UI historii
                loadConversationHistory();
            }
        })
        .catch(error => {
            console.error('Error loading general chat history:', error);
        });
    }

/**
 * Funkcja do ładowania widoku ogólnego chatu
 */
function loadGeneralChat() {
    console.log('Loading general chat view');
    
    // Resetuj kategorię
    currentCategory = null;
    
    // Aktualizuj UI - zaznacz aktywny element historii
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-category') === 'general');
    });
    
    // Pokaż standardowy kontener wejściowy, ukryj główny
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) inputContainer.style.display = 'block';
    if (mainInputContainer) mainInputContainer.style.display = 'none';
    
    // Ustaw placeholder dla pola wiadomości
    if (chatInput) {
        chatInput.placeholder = "Ask about anything...";
    }
    
    // Reset chat input
    if (chatInput) chatInput.value = '';
    
    // Załaduj historię czatu
    if (chatContainer) {
        chatContainer.style.display = 'block';
        chatContainer.innerHTML = '';
        
        // Pobierz historię ogólnego chatu
        const userId = currentUser.user_id || 'unknown_user';
        const generalHistory = generalChatHistory && generalChatHistory[userId];
        
        if (generalHistory && generalHistory.length > 0) {
            // Dodaj każdą wiadomość z historii
            generalHistory.forEach(entry => {
                // Dodaj wiadomość użytkownika
                const question = entry.question;
                if (question) {
                    const messageElement = document.createElement('div');
                    messageElement.className = 'message user-message';
                    
                    messageElement.innerHTML = `
                        <div class="message-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="message-content">
                            <div class="message-text">${formatMessageText(question)}</div>
                            <div class="message-time">${formatTime(new Date(entry.timestamp * 1000))}</div>
                        </div>
                    `;
                    
                    chatContainer.appendChild(messageElement);
                }
                
                // Dodaj odpowiedź asystenta
                const answer = entry.answer;
                if (answer) {
                    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
                    const messageElement = document.createElement('div');
                    messageElement.className = 'message ai-message general-message';
                    messageElement.id = messageId;
                    
                    messageElement.innerHTML = `
                        <div class="message-avatar">
                            <img src="https://www.alldeck.pl/wp-content/uploads/2025/04/alldeck-logo-czarne-60x60-2.png" alt="AI" 
                                 onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\' viewBox=\\'0 0 32 32\\'><rect width=\\'32\\' height=\\'32\\' rx=\\'16\\' fill=\\'%23465b5e\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'18\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'white\\'>D</text></svg>';">
                        </div>
                        <div class="message-content">
                            <div class="message-text">${formatMessageText(answer)}</div>
                            <div class="message-time">${formatTime(new Date(entry.timestamp * 1000))}</div>
                            <div class="message-actions">
                                <button class="message-action copy-btn" title="Copy to clipboard">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="message-action export-action" title="Add to Pitch Deck">
                                    <i class="fas fa-file-export"></i>
                                </button>
                                <div class="message-feedback">
                                    <button class="feedback-btn thumbs-up" data-message-id="${messageId}" title="This was helpful">
                                        <i class="fas fa-thumbs-up"></i>
                                    </button>
                                    <button class="feedback-btn thumbs-down" data-message-id="${messageId}" title="This was not helpful">
                                        <i class="fas fa-thumbs-down"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    chatContainer.appendChild(messageElement);
                }
            });
        } else {
            // Jeśli nie ma historii, dodaj wiadomość powitalną
            const welcomeElement = document.createElement('div');
            welcomeElement.className = 'message ai-message general-message';
            
            welcomeElement.innerHTML = `
                <div class="message-avatar">
                    <img src="https://www.alldeck.pl/wp-content/uploads/2025/04/alldeck-logo-czarne-60x60-2.png" alt="AI" 
                         onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\' viewBox=\\'0 0 32 32\\'><rect width=\\'32\\' height=\\'32\\' rx=\\'16\\' fill=\\'%23465b5e\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'18\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'white\\'>D</text></svg>';">
                </div>
                <div class="message-content">
                    <div class="message-text">
                        <p>Welcome to the general chat! How can I help you?</p>
                    </div>
                    <div class="message-time">${formatTime(new Date())}</div>
                </div>
            `;
            
            chatContainer.appendChild(welcomeElement);
        }
    }
    
    if (initialView) initialView.style.display = 'none';
    
    // Przewiń do dołu chatu
    scrollChatToBottom();
}

/**
 * Validate plan selection before any action
 */
function validatePlanSelection(planId) {
    const planConfig = PLAN_CONFIG[planId];
    
    if (!planConfig) {
        return {
            valid: false,
            message: 'Invalid plan selected'
        };
    }
    
    if (!planConfig.available) {
        return {
            valid: false,
            message: `${planConfig.name} is not available yet`
        };
    }
    
    return {
        valid: true,
        config: planConfig
    };
}

/**
 * Update the existing selectPlan function to use new logic
 */
function selectPlan(planId) {
    const validation = validatePlanSelection(planId);
    
    if (!validation.valid) {
        showNotification(validation.message, 'warning');
        return;
    }
    
    const planConfig = validation.config;
    
    if (planConfig.action === 'contact') {
        showHumanIntelligenceModal();
        return;
    }
    
    // For available plans, simulate selection (since backend integration isn't implemented)
    console.log(`Selecting plan: ${planConfig.name}`);
    showNotification('Plan change functionality not fully implemented yet.', 'info');
    
    // Update local display
    updatePlanDisplay(planId);
    applyPlanRestrictions();
    
    // Close modal
    if (upgradePlanModal) {
        upgradePlanModal.style.display = 'none';
    }
}

// Funkcja do obsługi zmiany i zapisywania awatara
function initializeAvatarFunctionality() {
    // Sprawdź czy app jest widoczny (nie sprawdzaj style.display)
    const appContainer = document.getElementById('appContainer');
    if (!appContainer) {
        console.error("App container not found, cannot initialize avatar");
        return;
    }
    
    // Sprawdź czy elementy awatara istnieją
    const userAvatar = document.getElementById('userAvatar');
    const avatarModal = document.getElementById('avatarModal');
    
    if (!userAvatar || !avatarModal) {
        console.error("Avatar elements missing from DOM. Check HTML template.");
        return;
    }
    
    // USUŃ POPRZEDNIE LISTENERY PRZED DODANIEM NOWYCH
    const existingClickHandler = userAvatar.onclick;
    if (existingClickHandler) {
        userAvatar.removeEventListener('click', existingClickHandler);
    }
    
    console.log("Initializing avatar functionality...");
        
    // POPRAWKA: WSZYSTKIE const DECLARATIONS NA POCZĄTKU
    const closeAvatarModal = document.getElementById('closeAvatarModal');
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    const avatarFileInput = document.getElementById('avatarFileInput');
    
    // Otwórz modal po kliknięciu w awatar
    userAvatar.addEventListener('click', function() {
        updateAvatarPreview();
        avatarModal.style.display = 'flex';
    });
    
    // Zamknij modal
    if (closeAvatarModal) {
        closeAvatarModal.addEventListener('click', function() {
            avatarModal.style.display = 'none';
        });
    }
    
    // Zamknij modal po kliknięciu w tło
    avatarModal.addEventListener('click', function(e) {
        if (e.target === avatarModal) {
            avatarModal.style.display = 'none';
        }
    });
    
    // Obsługa upload'u awatara
    if (uploadAvatarBtn && avatarFileInput) {
        uploadAvatarBtn.addEventListener('click', function() {
            avatarFileInput.click();
        });
        
        avatarFileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                // Sprawdź czy to obraz
                if (!file.type.startsWith('image/')) {
                    showNotification('Please select an image file.', 'error');
                    return;
                }
                
                // Sprawdź rozmiar (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('Image file is too large. Maximum size is 5MB.', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        saveAvatar(e.target.result);
                        updateAllAvatars(e.target.result);
                        avatarModal.style.display = 'none';
                        showNotification('Avatar updated successfully!', 'success');
                    } catch (error) {
                        console.error('Error updating avatar:', error);
                        showNotification('Error updating avatar.', 'error');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Usuń awatar
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove your avatar?')) {
                removeAvatar();
                updateAllAvatars(null);
                avatarModal.style.display = 'none';
                showNotification('Avatar removed successfully!', 'success');
            }
        });
    }
    
    // Załaduj zapisany awatar przy inicjalizacji
    loadSavedAvatar();
}

// Funkcja aktualizująca podgląd awatara w modalu
function updateAvatarPreview() {
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarPreviewPlaceholder = document.getElementById('avatarPreviewPlaceholder');
    
    if (!avatarPreview || !avatarPreviewPlaceholder) return;
    
    try {
        const userId = currentUser.user_id || 'default';
        const savedAvatar = localStorage.getItem('userAvatar_' + userId);
        
        if (savedAvatar) {
            avatarPreview.innerHTML = `<img src="${savedAvatar}" alt="Avatar Preview">`;
        } else {
            const initials = generateInitials(currentUser.name, currentUser.email);
            avatarPreview.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
        }
    } catch (e) {
        console.warn('Could not load avatar preview:', e);
        const initials = generateInitials(currentUser.name, currentUser.email);
        avatarPreview.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
    }
}

// Funkcja zapisująca awatar
function saveAvatar(avatarData) {
    try {
        const userId = currentUser.user_id || 'default';
        localStorage.setItem('userAvatar_' + userId, avatarData);
    } catch (e) {
        console.error('Could not save avatar to localStorage:', e);
        throw new Error('Failed to save avatar');
    }
}

// Funkcja usuwająca awatar
function removeAvatar() {
    try {
        const userId = currentUser.user_id || 'default';
        localStorage.removeItem('userAvatar_' + userId);
    } catch (e) {
        console.error('Could not remove avatar from localStorage:', e);
    }
}

// Funkcja aktualizująca wszystkie awatary na stronie
function updateAllAvatars(avatarData) {
    const userAvatar = document.getElementById('userAvatar');
    const avatarPreview = document.getElementById('avatarPreview');
    
    if (avatarData) {
        // Ustaw zdjęcie
        if (userAvatar) {
            userAvatar.innerHTML = `<img src="${avatarData}" alt="User Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
        if (avatarPreview) {
            avatarPreview.innerHTML = `<img src="${avatarData}" alt="Avatar Preview">`;
        }
    } else {
        // Powróć do inicjałów
        const initials = generateInitials(currentUser.name, currentUser.email);
        if (userAvatar) {
            userAvatar.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
        }
        if (avatarPreview) {
            avatarPreview.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
        }
    }
}

// Uproszczona funkcja ładująca awatar
function loadSavedAvatar() {
    try {
        const userId = currentUser.user_id || 'default';
        const savedAvatar = localStorage.getItem('userAvatar_' + userId);
        
        if (savedAvatar) {
            updateAllAvatars(savedAvatar);
        }
    } catch (e) {
        console.warn('Could not load avatar from localStorage:', e);
    }
}

        
// Inicjalizacja aplikacji
async function initializeApp() {
    console.log("Inicjalizacja aplikacji...");

    // ✅ DODAJ TO TUTAJ - sprawdź czy AI działa
    if (typeof OPENAI_INIT_ERROR !== 'undefined' && OPENAI_INIT_ERROR) {
        console.error("OpenAI initialization error:", OPENAI_INIT_ERROR);
        showNotification("AI Assistant unavailable: " + OPENAI_INIT_ERROR, 'error');
        
        // Wyłącz funkcje wymagające AI
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.title = "AI Assistant unavailable";
        }
        if (mainSendButton) {
            mainSendButton.disabled = true;
            mainSendButton.title = "AI Assistant unavailable";
        }
        
        // Dodaj komunikat w UI
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.innerHTML = `
                <div class="message error-message">
                    <div class="message-content">
                        <div class="message-text">
                            <p><strong>AI Assistant Unavailable</strong></p>
                            <p>The AI service is currently unavailable. Please contact support or try again later.</p>
                            <p>Error: ${OPENAI_INIT_ERROR}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Sprawdź parametry URL
    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get('login_success');
    const authError = urlParams.get('error');
    
    if (authError) {
        console.error("Auth error from URL:", authError);
        showNotification(`Authentication failed: ${authError}`, 'error');
        // Wyczyść parametry URL po pokazaniu błędu
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (loginSuccess) {
        console.log("Login success detected from URL");
        showNotification("Successfully logged in!", 'success');
        // Wyczyść parametr z URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    let sessionInfo = null;
    
    // POPRAWIONA LOGIKA - tylko jeden attempt, potem error
    try {
        console.log("Checking session...");
        sessionInfo = await checkSession();
        console.log("Session check result:", sessionInfo);
        
        // Jeśli mamy błąd sieci, pokaż komunikat i nie próbuj ponownie
        if (sessionInfo.networkError) {
            console.error("Network error during session check");
            showNotification("Connection error. Please refresh the page.", 'error');
            sessionInfo = { logged_in: false };
        }
        
    } catch (e) {
        console.error('Session check failed:', e);
        showNotification("Session check failed. Please refresh the page.", 'error');
        sessionInfo = { logged_in: false };
    }

    // KRYTYCZNA POPRAWKA - sprawdź czy mamy prawidłowe dane użytkownika
    if (sessionInfo && sessionInfo.logged_in && sessionInfo.user_data && sessionInfo.user_data.user_id) {
        console.log("Użytkownik zalogowany, inicjalizuję aplikację");
        console.log("User data:", sessionInfo.user_data);
        
        // Ukryj ekran logowania
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        
        // Wywołaj funkcję obsługi udanego logowania
        handleLoginSuccess(sessionInfo.user_data);
        
    } else {
        console.log("Użytkownik niezalogowany lub brak danych, pokazuję ekran logowania");
        console.log("Session info:", sessionInfo);
        
        // Pokaż ekran logowania
        if (loginScreen) {
            loginScreen.style.display = 'flex';
        }

        // Ukryj pozostałe sekcje
        if (introSection) introSection.style.display = 'none';
        if (appContainer) appContainer.style.display = 'none';
        if (settingsPage) settingsPage.style.display = 'none';
        if (mainInputContainer) mainInputContainer.style.display = 'none';
        
        // Jeśli był błąd Auth0, nie próbuj ponownie
        if (authError) {
            console.log("Auth error detected, staying on login screen");
            return;
        }
    }
    
    // Obsługa trybu deweloperskiego (tylko jeśli nie ma sesji I nie ma błędu Auth0)
    if (devMode && (!sessionInfo || !sessionInfo.logged_in) && !authError) {
        console.log("Tryb dev - pomijam logowanie");
        if (loginScreen) loginScreen.style.display = 'none';
        if (appContainer) {
            appContainer.style.display = 'flex';
            // Symuluj dane użytkownika dla trybu dev
            const devUserData = {
                user_id: 'dev_user',
                name: 'Developer User',
                email: 'dev@example.com',
                plan: 'AI Deck Pro',
                language: 'en',
                notificationsEnabled: true
            };
            handleLoginSuccess(devUserData);
        }
    }
    
    console.log("Inicjalizacja aplikacji zakończona");
}
    
// --- PLAN MANAGEMENT FUNCTIONALITY (DODAJ TO TUTAJ) ---

// Plan configuration object
const PLAN_CONFIG = {
    1: {
        id: "1",
        name: "AI Deck Builder",
        price: "147 EUR / 3 months",
        available: true,
        beta: true,
        action: "select"
    },
    2: {
        id: "2", 
        name: "AI Deck Pro",
        price: "297 EUR / 3 months",
        available: false,
        beta: false,
        action: "disabled"
    },
    3: {
        id: "3",
        name: "Human Intelligence Precision", 
        price: "5000 EUR+",
        available: true,
        beta: false,
        action: "contact"
    }
};

/**
 * Initialize plan selection functionality
 */
function initializePlanSelection() {
    console.log("Initializing plan selection functionality");
    
    // Handle intro section plan buttons
    const introPlanButtons = document.querySelectorAll('#introSection .plan-select-btn');
    introPlanButtons.forEach(button => {
        button.addEventListener('click', handlePlanSelection);
    });
    
    // Handle upgrade modal plan buttons  
    const upgradePlanButtons = document.querySelectorAll('#upgradePlanModal .plan-select-btn');
    upgradePlanButtons.forEach(button => {
        button.addEventListener('click', handlePlanSelection);
    });
    
    // Initialize Human Intelligence modal
    initializeHumanIntelligenceModal();
}

/**
 * Handle plan selection with validation
 */
function handlePlanSelection(event) {
    event.preventDefault();
    
    const button = event.target;
    const planId = button.getAttribute('data-plan');
    const planConfig = PLAN_CONFIG[planId];
    
    if (!planConfig) {
        console.error(`Invalid plan ID: ${planId}`);
        showNotification('Invalid plan selected', 'error');
        return;
    }
    
    // Check if plan is available
    if (!planConfig.available) {
        showNotification(`${planConfig.name} is not available yet. Coming soon!`, 'info');
        return;
    }
    
    // Handle different plan actions
    switch (planConfig.action) {
        case 'select':
            selectAvailablePlan(planConfig);
            break;
        case 'contact':
            showHumanIntelligenceModal();
            break;
        case 'disabled':
            showNotification(`${planConfig.name} is coming soon!`, 'info');
            break;
        default:
            console.error(`Unknown plan action: ${planConfig.action}`);
    }
}

/**
 * Select an available plan and proceed to app
 */
function selectAvailablePlan(planConfig) {
    console.log(`Selecting plan: ${planConfig.name}`);
    
    // Update plan display
    updatePlanDisplay(planConfig.id);
    
    // Show success message with beta info if applicable
    let message = `Thank you for choosing ${planConfig.name}!`;
    if (planConfig.beta) {
        message += ' Enjoy free beta access! 🎉';
    }
    message += ' Redirecting to the app...';
    
    showNotification(message, 'success');
    
    // Mark intro as seen
    if (currentUser && currentUser.user_id) {
        localStorage.setItem('hasSeenIntro_' + currentUser.user_id, 'true');
    }
    
    // Transition to main app after delay
    setTimeout(() => {
        if (introSection) introSection.style.display = 'none';
        if (upgradePlanModal) upgradePlanModal.style.display = 'none';
        
        if (appContainer) {
            appContainer.style.display = 'flex';
            initializeUI();
        }
    }, 1500);
}

/**
 * Initialize Human Intelligence modal functionality
 */
function initializeHumanIntelligenceModal() {
    const modal = document.getElementById('humanIntelligenceModal');
    const closeBtn = document.getElementById('closeHumanIntelligenceModal');
    
    if (!modal) {
        console.warn("Human Intelligence modal not found");
        return;
    }
    
    if (!closeBtn) {
        console.warn("Human Intelligence modal close button not found");
        return;
    }
    
    // Close modal on button click
    closeBtn.addEventListener('click', hideHumanIntelligenceModal);
    
    // Close modal on overlay click
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideHumanIntelligenceModal();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            hideHumanIntelligenceModal();
        }
    });
}

/**
 * Show Human Intelligence modal
 */
function showHumanIntelligenceModal() {
    const modal = document.getElementById('humanIntelligenceModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Hide Human Intelligence modal
 */
function hideHumanIntelligenceModal() {
    const modal = document.getElementById('humanIntelligenceModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// --- END PLAN MANAGEMENT FUNCTIONALITY ---

// MOBILE FIXES - Dodaj te funkcje do main.js

/**
 * Initialize mobile-specific functionality
 */
function initializeMobileFunctionality() {
    console.log("Initializing mobile functionality...");
    
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileUserBtn = document.getElementById('mobileUserBtn');
    const sidebar = document.querySelector('.sidebar');
    const userDropdown = document.getElementById('userDropdown');

    // ✅ USUŃ ISTNIEJĄCE LISTENERY PRZED DODANIEM NOWYCH
    if (hamburgerBtn) {
        const newHamburgerBtn = hamburgerBtn.cloneNode(true);
        hamburgerBtn.parentNode.replaceChild(newHamburgerBtn, hamburgerBtn);
        
        newHamburgerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Hamburger clicked!");
            
            if (sidebar) {
                const isOpen = sidebar.classList.contains('mobile-open');
                
                if (isOpen) {
                    sidebar.classList.remove('mobile-open');
                    if (mobileOverlay) mobileOverlay.classList.remove('active');
                } else {
                    sidebar.classList.add('mobile-open');
                    if (mobileOverlay) mobileOverlay.classList.add('active');
                }
                
                console.log(`Mobile menu ${isOpen ? 'closed' : 'opened'}`);
            }
        });
    }
    
    if (mobileOverlay && !mobileOverlay.hasAttribute('data-mobile-initialized')) {
        mobileOverlay.setAttribute('data-mobile-initialized', 'true');
        mobileOverlay.addEventListener('click', function() {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
            console.log("Mobile menu closed via overlay");
        });
    }

    // ✅ Mobile user button - NIE KLONUJ
    if (mobileUserBtn && userDropdown && !mobileUserBtn.hasAttribute('data-mobile-initialized')) {
        mobileUserBtn.setAttribute('data-mobile-initialized', 'true');
        
        mobileUserBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Mobile user button clicked");
            
            // Zamknij mobile sidebar
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (mobileOverlay) mobileOverlay.classList.remove('active');
            
            // Pozycjonowanie dla mobile
            userDropdown.style.position = 'fixed';
            userDropdown.style.top = '60px';
            userDropdown.style.right = '16px';
            userDropdown.style.left = 'auto';
            userDropdown.style.width = '250px';
            userDropdown.style.maxWidth = 'calc(100vw - 32px)';
            userDropdown.style.zIndex = '2001';
            
            // Toggle visibility
            const isVisible = userDropdown.style.display === 'block';
            userDropdown.style.display = isVisible ? 'none' : 'block';
            
            console.log(`Mobile user dropdown: ${isVisible ? 'closed' : 'opened'}`);
        });
    }

    // Close dropdowns when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768) {
            // Close user dropdown if clicking outside
            if (userDropdown && userDropdown.style.display === 'block') {
                if (!mobileUserBtn.contains(event.target) && !userDropdown.contains(event.target)) {
                    userDropdown.style.display = 'none';
                }
            }
        }
    });
}

 /**
 * Ensure floating buttons are properly moved to input container on mobile
 */
function ensureFloatingButtonsInInput() {
    if (window.innerWidth > 768) return;
    
    console.log("Ensuring floating buttons in input container...");
    
    // ✅ POPRAWIONY SELEKTOR
    const inputBox = document.querySelector('.input-box');
    if (!inputBox) {
        console.error("Input box not found!");
        // ✅ FALLBACK: Sprawdź alternatywne selektory
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            const fallbackBox = inputContainer.querySelector('div');
            if (fallbackBox) {
                console.log("Using fallback input box");
                // Użyj fallback
            }
        }
        return;
    }
    
    // ✅ USUŃ ISTNIEJĄCE PRZYCISKI PRZED DODANIEM NOWYCH
    const existingActions = inputBox.querySelector('.mobile-input-actions');
    if (existingActions) {
        existingActions.remove();
    }
    
    // Sprawdź czy już dodano
    if (inputBox.querySelector('.mobile-input-actions')) {
        console.log("Mobile buttons already added");
        return;
    }
    
    // Create actions container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'mobile-input-actions';
    actionsContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        margin-right: 8px;
    `;
    
    // Insert before send button
    const sendButton = inputBox.querySelector('#sendButton, [id$="SendButton"]');
    if (sendButton) {
        inputBox.insertBefore(actionsContainer, sendButton);
    } else {
        inputBox.appendChild(actionsContainer);
    }
    
    // ✅ Files button z badge
    const originalFilesBtn = document.getElementById('viewUserFilesBtn');
    const originalFilesBadge = document.getElementById('filesBadge');
    
    const mobileFilesBtn = document.createElement('button');
    mobileFilesBtn.className = 'mobile-files-btn';
    mobileFilesBtn.innerHTML = '<i class="fas fa-folder"></i>';
    mobileFilesBtn.style.cssText = `
        position: relative;
        width: 32px;
        height: 32px;
        border: 1px solid #d7dedf;
        background: #f1f3f4;
        color: #465b5e;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
    `;
    
    // ✅ Skopiuj badge jeśli istnieje
    if (originalFilesBadge && originalFilesBadge.style.display !== 'none') {
        const mobileBadge = originalFilesBadge.cloneNode(true);
        mobileBadge.id = 'mobileFilesBadge';
        mobileBadge.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            background: #e53e3e;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            min-width: 20px;
        `;
        mobileFilesBtn.appendChild(mobileBadge);
    }
    
    mobileFilesBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleUserFilesPanel();
    });
    
    actionsContainer.appendChild(mobileFilesBtn);
    
    // ✅ Saved content button z badge
    const originalSavedBtn = document.getElementById('viewSavedContentBtn');
    const originalSavedBadge = originalSavedBtn?.querySelector('.badge');
    
    const mobileSavedBtn = document.createElement('button');
    mobileSavedBtn.className = 'mobile-saved-btn';
    mobileSavedBtn.innerHTML = '<i class="fas fa-file-alt"></i>';
    mobileSavedBtn.style.cssText = `
        position: relative;
        width: 32px;
        height: 32px;
        border: 1px solid #d7dedf;
        background: #f1f3f4;
        color: #465b5e;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
    `;
    
    // ✅ Skopiuj badge jeśli istnieje
    if (originalSavedBadge && originalSavedBadge.style.display !== 'none') {
        const mobileSavedBadge = originalSavedBadge.cloneNode(true);
        mobileSavedBadge.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            background: #e53e3e;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            min-width: 20px;
        `;
        mobileSavedBtn.appendChild(mobileSavedBadge);
    }
    
    mobileSavedBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSavedContentPanel();
    });
    
    actionsContainer.appendChild(mobileSavedBtn);
    
    // ✅ Ukryj oryginalne przyciski na mobile
    if (originalFilesBtn) originalFilesBtn.style.display = 'none';
    if (originalSavedBtn) originalSavedBtn.style.display = 'none';
    
    console.log("Mobile floating buttons added to input container");
}



// Replace the existing initializeUI call with mobile-enhanced version
// Find this line in your initializeUI function and replace initializeUIEvents() with:
// initializeMobileUIEvents();

    
// Wywołaj inicjalizację aplikacji
initializeApp();

// ✅ JEDYNY POPRAWNY RESIZE HANDLER
window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
        // Mobile mode
        setTimeout(() => {
            // Usuń istniejące mobile buttons żeby uniknąć duplikacji
            const existingMobileActions = document.querySelector('.mobile-input-actions');
            if (existingMobileActions) {
                existingMobileActions.remove();
            }
            
            ensureFloatingButtonsInInput();
            
            // Pokaż mobile header buttons
            const hamburgerBtn = document.getElementById('hamburgerBtn');
            const mobileUserBtn = document.getElementById('mobileUserBtn');
            if (hamburgerBtn) hamburgerBtn.style.display = 'block';
            if (mobileUserBtn) mobileUserBtn.style.display = 'block';
        }, 100);
    } else {
        // Desktop mode - przywróć oryginalne
        const filesBtn = document.getElementById('viewUserFilesBtn');
        const savedBtn = document.getElementById('viewSavedContentBtn');
        
        if (filesBtn) filesBtn.style.display = '';
        if (savedBtn) savedBtn.style.display = '';
        
        // Usuń mobile buttons
        const mobileActions = document.querySelector('.mobile-input-actions');
        if (mobileActions) mobileActions.remove();
        
        // Ukryj mobile header buttons
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const mobileUserBtn = document.getElementById('mobileUserBtn');
        if (hamburgerBtn) hamburgerBtn.style.display = 'none';
        if (mobileUserBtn) mobileUserBtn.style.display = 'none';
    }
});

console.log("Inicjalizacja głównego skryptu JS zakończona.");
});

//dodane przez Amelie

if (sendButton) {
    sendButton.addEventListener('click', async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        const response = await askAI(message);
        // Dodaj odpowiedź do UI (jeśli masz funkcję np. renderAIResponse)
        console.log("AI response:", response);
        chatInput.value = "";
    });
}

if (attachButton && fileInput) {
    attachButton.addEventListener('click', () => {
        fileInput.click(); // symuluje kliknięcie ukrytego inputa
    });

    fileInput.addEventListener('change', async () => {
        const files = fileInput.files;
        if (files.length > 0) {
            for (let file of files) {
                try {
                    const uploadResult = await uploadFile(file);
                    console.log("Plik przesłany:", uploadResult);
                } catch (e) {
                    console.error("Błąd przesyłania pliku:", e);
                }
            }
        }
    });
}


function initializeChatControls() {
    if (sendButton && chatInput) {
        sendButton.addEventListener('click', async () => {
            const message = chatInput.value.trim();
            if (!message) return;

            try {
                const response = await askAI(message);

                // Tu możesz dodać funkcję renderującą odpowiedź AI do UI
                console.log("AI response:", response);
                showNotification("AI odpowiedziało.", "success"); // Można zamienić na coś lepszego

            } catch (error) {
                showNotification("Błąd podczas wysyłania wiadomości do AI.", "error");
            }

            chatInput.value = "";
        });

        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendButton.click();
            }
        });
    }

    if (attachButton && fileInput) {
        attachButton.addEventListener('click', () => {
            fileInput.click(); // Otwórz dialog wyboru pliku
        });

        fileInput.addEventListener('change', async () => {
            const files = fileInput.files;
            if (files.length > 0) {
                for (let file of files) {
                    try {
                        const uploadResult = await uploadFile(file);
                        console.log("Plik przesłany:", uploadResult);
                        showNotification(`Plik ${file.name} przesłany pomyślnie.`, "success");

                        // Jeśli chcesz, tu możesz wywołać funkcję renderującą plik do UI

                    } catch (e) {
                        console.error("Błąd przesyłania pliku:", e);
                        showNotification(`Nie udało się przesłać pliku ${file.name}.`, "error");
                    }
                }

                // Po przesłaniu plików wyczyść input
                fileInput.value = '';
            }
        });
    }
}

function initializeUI() {
    console.log("Inicjalizacja UI po zalogowaniu");
    
    updateUserInfoUI();
    applyPlanRestrictions();
    
    if (progressBar && progressPercentage) {
        updateProgress();
    }

    if (!currentCategory) {
        if (initialView) initialView.style.display = 'flex';
        if (chatContainer) chatContainer.style.display = 'none';
        if (mainInputContainer) mainInputContainer.style.display = 'block';
    }
}
    initializeChatControls();