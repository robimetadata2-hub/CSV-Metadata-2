document.addEventListener('DOMContentLoaded', () => {
    let currentMode = null;
    let filesToProcess = [];
    let apiKeys = [];
    let currentApiKeyIndex = 0;
    
    // --- Supabase Configuration ---
    const SUPABASE_URL = 'https://clbzukasviiimihwshtk.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYnp1a2FzdmlpaW1paHdzaHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTMyMDUsImV4cCI6MjA3MDk4OTIwNX0.EApf7bcbKwVNBIUIfO0_4BotG-T4aZFb2wHwCMdo3_M';
    
    let supabase;
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.warn("Supabase credentials are not set. Authentication will be disabled.");
        } else {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch (error) {
        console.error("Error initializing Supabase:", error);
    }

    let currentUser = null;

    const elements = {
        uploadArea: document.getElementById('upload-area'),
        fileUpload: document.getElementById('file-upload'),
        resultsArea: document.getElementById('results-area'),
        contentGrid: document.getElementById('generated-content-grid'),
        clearAllBtn: document.getElementById('clear-all-btn'),
        toast: document.getElementById('toast'),
        metadataBtn: document.getElementById('metadata-btn'),
        promptBtn: document.getElementById('prompt-btn'),
        uploadTitle: document.getElementById('upload-title'),
        uploadSubtitle: document.getElementById('upload-subtitle'),
        resultsTitle: document.getElementById('results-title'),
        apiKeyPanel: document.getElementById('api-key-panel'),
        generationControls: document.getElementById('generation-controls'),
        initialGenView: document.getElementById('initial-gen-view'),
        generatingView: document.getElementById('generating-view'),
        fileCount: document.getElementById('file-count'),
        generateNowBtn: document.getElementById('generate-now-btn'),
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        fileTypeSelect: document.getElementById('file-type'),
        settingsBtn: document.getElementById('settings-btn'),
        settingsPanel: document.getElementById('settings-panel'),
        closeSettingsBtn: document.getElementById('close-settings-btn'),
        themeColorSwatches: document.getElementById('theme-color-swatches'),
        bgColorSwatches: document.getElementById('bg-color-swatches'),
        downloadBtn: document.getElementById('download-btn'),
        downloadOptions: document.getElementById('download-options'),
        saveProjectBtn: document.getElementById('save-project-btn'),
        historyBtn: document.getElementById('history-btn'),
        historyPanel: document.getElementById('history-panel'),
        closeHistoryBtn: document.getElementById('close-history-btn'),
        historyList: document.getElementById('history-list'),
        modalOverlay: document.getElementById('modal-overlay'),
        apiKeyList: document.getElementById('api-key-list'),
        addApiKeyBtn: document.getElementById('add-api-key-btn'),
        saveApiKeysBtn: document.getElementById('save-api-keys-btn'),
        customPromptToggle: document.getElementById('custom-prompt-toggle'),
        customPromptContainer: document.getElementById('custom-prompt-container'),
        customPromptTextarea: document.getElementById('custom-prompt-textarea'),
        titleOptions: document.getElementById('title-options'),
        customTitleSuffix: document.getElementById('custom-title-suffix'),
        // Auth elements
        loginBtn: document.getElementById('login-btn'),
        profileSection: document.getElementById('profile-section'),
        profilePicBtn: document.getElementById('profile-pic-btn'),
        profilePicImgNav: document.getElementById('profile-pic-img-nav'),
        profileCard: document.getElementById('profile-card'),
        profilePicImgCard: document.getElementById('profile-pic-img-card'),
        profileEmail: document.getElementById('profile-email'),
        logoutBtnCard: document.getElementById('logout-btn-card'),
        loginModal: document.getElementById('login-modal'),
        closeLoginBtn: document.getElementById('close-login-btn'),
        loginGoogleBtn: document.getElementById('login-google-btn'),
    };

    const THEMES = {
        pink: { primary: '#ec4899', from: '#f97316', to: '#ec4899' },
        blue: { primary: '#3b82f6', from: '#3b82f6', to: '#818cf8' },
        green: { primary: '#22c55e', from: '#4ade80', to: '#22c55e' },
        orange: { primary: '#f97316', from: '#fb923c', to: '#f97316' },
    };
    const BACKGROUNDS = {
        slate: { bg: '#0f172a', panel: '#1e293b', border: '#334155' },
        gray: { bg: '#111827', panel: '#1f2937', border: '#374151' },
        zinc: { bg: '#18181b', panel: '#27272a', border: '#3f3f46' },
        stone: { bg: '#1c1917', panel: '#292524', border: '#44403c' },
        neutral: { bg: '#171717', panel: '#262626', border: '#404040' },
    };
    
    // --- Authentication Functions ---
    async function signInWithGoogle() {
        if (!supabase) return showToast("Authentication is not configured.", true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) {
            console.error('Error logging in with Google:', error);
            showToast(`Error: ${error.message}`, true);
        }
    }

    async function signOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
            showToast(`Error: ${error.message}`, true);
        }
    }

    function updateAuthUI(user) {
        currentUser = user;
        if (user) {
            elements.loginBtn.classList.add('hidden');
            elements.profileSection.classList.remove('hidden');
            
            const avatarUrl = user.user_metadata?.avatar_url || `https://placehold.co/40x40/1e293b/cbd5e1?text=${user.email[0].toUpperCase()}`;
            elements.profilePicImgNav.src = avatarUrl;
            elements.profilePicImgCard.src = avatarUrl.replace('s96-c', 's200-c'); // Higher resolution for card
            elements.profileEmail.textContent = user.email;

        } else {
            elements.loginBtn.classList.remove('hidden');
            elements.profileSection.classList.add('hidden');
            elements.profileCard.classList.add('hidden'); // Ensure card is hidden on logout
        }
    }
    
    function setupAuthListeners() {
        if (!supabase) return;
        supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user ?? null;
            updateAuthUI(user);
            if (user) {
                closeModal(elements.loginModal, elements.modalOverlay);
            }
        });
    }

    function applyTheme(themeName) {
        const theme = THEMES[themeName];
        if (!theme) return;
        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.primary);
        root.style.setProperty('--gradient-from', theme.from);
        root.style.setProperty('--gradient-to', theme.to);
        localStorage.setItem('appTheme', themeName);
        updateSelectedSwatch(elements.themeColorSwatches, `[data-theme="${themeName}"]`);
        // Update all sliders to reflect the new theme color
        document.querySelectorAll('.custom-slider').forEach(updateSliderFill);
    }

    function applyBackground(bgName) {
        const bg = BACKGROUNDS[bgName];
        if (!bg) return;
        const root = document.documentElement;
        root.style.setProperty('--bg-color', bg.bg);
        root.style.setProperty('--panel-color', bg.panel);
        root.style.setProperty('--border-color', bg.border);
        localStorage.setItem('appBackground', bgName);
        updateSelectedSwatch(elements.bgColorSwatches, `[data-bg="${bgName}"]`);
    }
    
    function updateSelectedSwatch(container, selector) {
        container.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));
        container.querySelector(selector)?.classList.add('selected');
    }

    function switchMode(newMode) {
        if (currentMode === newMode) return;
        currentMode = newMode;
        elements.metadataBtn.classList.toggle('active', newMode === 'metadata');
        elements.metadataBtn.classList.toggle('inactive', newMode !== 'metadata');
        elements.promptBtn.classList.toggle('active', newMode === 'prompt');
        elements.promptBtn.classList.toggle('inactive', newMode !== 'prompt');
        
        document.querySelectorAll('[data-mode]').forEach(el => {
            if (el.dataset.mode === newMode) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });

        elements.uploadTitle.textContent = newMode === 'metadata' ? 'Click to upload or drag and drop' : 'Upload Images to Generate Prompts';
        elements.uploadSubtitle.textContent = newMode === 'metadata' ? 'Upload multiple images for metadata generation' : 'Multiple JPG, PNG, or SVG files (max 5MB each)';
        elements.resultsTitle.textContent = newMode === 'metadata' ? 'Generated Data' : 'Generated Prompts';
        clearResults();
    }

    function clearResults() {
        filesToProcess = [];
        elements.resultsArea.classList.add('hidden');
        elements.uploadArea.classList.remove('hidden');
        elements.generationControls.classList.add('hidden');
        elements.fileUpload.value = ''; 
        elements.contentGrid.innerHTML = '';
        elements.saveProjectBtn.classList.add('hidden');
        updateProgressBar(0, 0, 0, 0, 0);
    }

    function handleFileSelect(event) {
        // Check for login before handling files
        if (!currentUser) {
            openModal(elements.loginModal, elements.modalOverlay);
            showToast("Please login to upload images.", true);
            return;
        }

        const files = event.target?.files || event.dataTransfer?.files;
        if (!files) return;

        filesToProcess = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (filesToProcess.length === 0) return;

        elements.uploadArea.classList.add('hidden');
        elements.resultsArea.classList.remove('hidden');
        elements.generationControls.classList.remove('hidden');
        elements.initialGenView.classList.remove('hidden');
        elements.generatingView.classList.add('hidden');
        elements.contentGrid.innerHTML = '';
        elements.fileCount.textContent = filesToProcess.length;
        elements.generateNowBtn.disabled = false;
        updateProgressBar(0, 0, filesToProcess.length, 0, 0);

        renderAllPlaceholders();
    }

    function renderAllPlaceholders() {
        elements.contentGrid.innerHTML = '';
        filesToProcess.forEach((file, index) => createPlaceholderCard(file, index));
    }

    function createPlaceholderCard(file, index) {
        const card = document.createElement('div');
        card.className = 'result-card relative p-4 bg-slate-800 rounded-lg border border-slate-700';
        card.dataset.id = `file-${index}`;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            card.innerHTML = `
                <button class="delete-btn" data-index="${index}">
                    <svg class="w-5 h-5 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div class="flex-grow">
                    <h4 class="font-semibold text-slate-300 truncate mb-1" title="${file.name}">${file.name}</h4>
                    <div class="size-info-placeholder text-xs text-gray-500 mb-2 h-4"></div> <!-- Placeholder for size info -->
                    <img src="${e.target.result}" alt="${file.name}" class="rounded-lg w-full h-48 object-cover shadow-lg mb-4">
                </div>
                <div class="card-dynamic-content text-center text-gray-400">Waiting to generate...</div>
            `;
        }
        reader.readAsDataURL(file);
        elements.contentGrid.appendChild(card);
    }
    
    async function startGeneration() {
        elements.initialGenView.classList.add('hidden');
        elements.generatingView.classList.remove('hidden');

        let processedCount = 0;
        const totalFiles = filesToProcess.length;
        updateProgressBar(0, processedCount, totalFiles, 0, 0);

        for (const [index, file] of filesToProcess.entries()) {
            await processSingleFile(file, index); // This will hang until it succeeds
            processedCount++;
            // Update progress bar with success count, failed count is always 0 in this logic
            updateProgressBar((processedCount / totalFiles) * 100, processedCount, totalFiles, processedCount, 0);
        }

        showToast("Generation complete!");
        elements.generationControls.classList.add('hidden');
        elements.saveProjectBtn.classList.remove('hidden');
    }
    
    async function processSingleFile(file, index) {
        const card = document.querySelector(`[data-id="file-${index}"]`);
        if (!card) return;
        const cardContentEl = card.querySelector('.card-dynamic-content');
        
        let attempt = 1;
        while (true) { // Infinite loop until success
            try {
                cardContentEl.innerHTML = `<div class="flex items-center justify-center text-pink-400"><div class="w-5 h-5 rounded-full animate-spin border-2 border-solid border-slate-500 card-loading-spinner mr-2"></div>Generating... (Attempt ${attempt})</div>`;

                const { base64Data, mimeType, compressedSize } = await processFileForApi(file);
                
                const originalSize = file.size;
                const sizeInfoPlaceholder = card.querySelector('.size-info-placeholder');
                if (sizeInfoPlaceholder) {
                    sizeInfoPlaceholder.innerHTML = `Size: ${formatBytes(originalSize)} &rarr; ${formatBytes(compressedSize)}`;
                }

                const data = currentMode === 'metadata'
                    ? await getMetadataFromGemini(base64Data, mimeType, file.name, file.type)
                    : await getPromptFromGemini(base64Data, mimeType, file.name);
                
                if (currentMode === 'metadata') {
                    renderMetadataCard(cardContentEl, data, index);
                } else {
                    if (data && data.prompt) {
                        let promptText = data.prompt.trim();
                        if (promptText.endsWith('.')) {
                            promptText = promptText.slice(0, -1);
                        }

                        const isSilhouette = document.getElementById('silhouette-toggle').checked;
                        const isWhiteBackground = document.getElementById('white-background-toggle').checked;
                        const isTransparentBackground = document.getElementById('transparent-background-toggle').checked;
                        
                        if (isSilhouette) promptText += ' silhoutte style';
                        if (isWhiteBackground) promptText += ' white background';
                        if (isTransparentBackground) promptText += ' transparent background';
                        data.prompt = promptText.trim();
                    }
                    renderPromptCard(cardContentEl, data, index);
                }
                return; // Success, exit the while loop and the function
            } catch (error) {
                console.error(`Attempt ${attempt} failed for file ${file.name}:`, error);
                attempt++;
                cardContentEl.innerHTML = `<div class="text-center text-amber-400 p-2 bg-amber-900/20 rounded-md"><strong>API Error:</strong> ${error.message}. Retrying...</div>`;
                // Wait 5 seconds before the next attempt
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }


    function updateProgressBar(percentage, count, total, success, failed) {
        elements.progressBar.style.width = `${percentage}%`;
        elements.progressText.textContent = `Processing: ${count}/${total} | Success: ${success}, Failed: ${failed}`;
    }
    
    function filterForbiddenPhrases(text) {
        if (typeof text !== 'string') return text;
        const forbiddenPhrases = [
            /against a black background/gi,
            /on black background/gi,
            /dark background/gi,
            /black backround/gi, // handles typo
            /white background/gi
        ];
        let cleanedText = text;
        forbiddenPhrases.forEach(phraseRegex => {
            cleanedText = cleanedText.replace(phraseRegex, '');
        });
        return cleanedText.replace(/, ,/g, ',').replace(/,$/, '').replace(/  +/g, ' ').trim();
    }

    function renderMetadataCard(cardContentEl, data, index) {
        const filteredTitle = filterForbiddenPhrases(data.title || 'N/A');
         const filteredKeywords = (data.keywords && Array.isArray(data.keywords))
            ? data.keywords.flatMap(kw => filterForbiddenPhrases(kw).split(/\s+/)).filter(Boolean)
            : [];

        let finalTitle = filteredTitle.charAt(0).toUpperCase() + filteredTitle.slice(1).toLowerCase();
        finalTitle = finalTitle.replace(/[,:]/g, '');

        const titleOptionsSelect = document.getElementById('title-options');
        const selectedOptionValue = titleOptionsSelect.value;
        const customSuffix = document.getElementById('custom-title-suffix').value.trim();
        
        if (selectedOptionValue.startsWith('suffix_')) {
            const suffix = titleOptionsSelect.selectedOptions[0].text.replace('Append: ', '').trim();
            finalTitle += ` ${suffix}`;
        }
        if (customSuffix) {
            finalTitle += ` ${customSuffix}`;
        }

        cardContentEl.innerHTML = `
            <div class="space-y-4">
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="font-semibold text-sm" style="color: var(--primary-color);">Title</label>
                        <button class="copy-btn" data-type="title">
                            <svg class="w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        </button>
                    </div>
                    <p class="generated-title text-slate-300 p-2 text-sm rounded-md bg-slate-900">${finalTitle}</p>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="font-semibold text-sm" style="color: var(--primary-color);">Description</label>
                        <button class="copy-btn" data-type="description">
                            <svg class="w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        </button>
                    </div>
                    <p class="generated-description text-slate-400 p-2 rounded-md bg-slate-900 text-xs h-20 overflow-y-auto">${data.description || 'N/A'}</p>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="font-semibold text-sm" style="color: var(--primary-color);">Keywords</label>
                        <button class="copy-btn" data-type="keywords">
                            <svg class="w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        </button>
                    </div>
                    <div class="generated-keywords flex flex-wrap gap-2 p-2 bg-slate-900 rounded-md h-24 overflow-y-auto">
                        ${filteredKeywords.length > 0 ? filteredKeywords.map(kw => `<span class="keyword-tag bg-pink-600 text-white text-xs font-semibold px-2 py-1 rounded-full">${kw}<button class="delete-keyword-btn">×</button></span>`).join(' ') : 'No keywords generated.'}
                    </div>
                </div>
                <div>
                    <label class="font-semibold text-sm" style="color: var(--primary-color);">Category</label>
                    <div class="generated-category flex flex-wrap gap-2 mt-1">
                        <span class="bg-indigo-600 text-white text-sm font-bold px-4 py-1 rounded-full">${data.category || 'N/A'}</span>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-700 text-center">
                    <div class="relative inline-block text-left">
                        <div>
                            <button type="button" class="individual-download-btn inline-flex items-center" data-index="${index}">
                                Download
                                <svg class="ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                            </button>
                        </div>
                        <div class="individual-download-options origin-top-right absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-slate-600 ring-1 ring-black ring-opacity-5 hidden z-10">
                            <div class="py-1">
                                <a href="#" class="block px-4 py-2 text-sm text-gray-200 hover:bg-slate-500" data-format="csv" data-index="${index}">CSV</a>
                                <a href="#" class="block px-4 py-2 text-sm text-gray-200 hover:bg-slate-500" data-format="json" data-index="${index}">JSON</a>
                                <a href="#" class="block px-4 py-2 text-sm text-gray-200 hover:bg-slate-500" data-format="xml" data-index="${index}">XML</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderPromptCard(cardContentEl, data, index) {
        cardContentEl.innerHTML = `
            <div>
                <div class="flex justify-between items-center mb-1">
                    <label class="font-semibold text-sm" style="color: var(--primary-color);">Generated Prompt</label>
                    <button class="copy-btn" data-type="prompt">
                        <svg class="w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                </div>
                <p class="generated-prompt text-slate-300 p-2 text-sm rounded-md bg-slate-900 mt-1 h-48 overflow-y-auto">${data.prompt || 'N/A'}</p>
            </div>
        `;
    }

    function renderErrorCard(cardContentEl, error, index) {
         cardContentEl.innerHTML = `
              <div class="text-center text-red-400 p-2 bg-red-900/20 rounded-md">
                  <strong>Error:</strong> Auto-regeneration failed. ${error.message}
              </div>
              <button class="regenerate-btn action-btn w-full" data-index="${index}">RETRY MANUALLY</button>
         `;
    }

    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function resizeImage(file, maxSize = 256) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.1);
                    const base64Data = dataUrl.split(',')[1];
                    const byteString = atob(base64Data);
                    const compressedSize = byteString.length;
                    resolve({ base64Data, compressedSize });
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async function processFileForApi(file) {
        const { base64Data, compressedSize } = await resizeImage(file, 256);
        return { base64Data, mimeType: 'image/jpeg', compressedSize };
    }

    async function getMetadataFromGemini(base64Data, mimeType, fileName, originalMimeType) {
        const titleWords = document.getElementById('title-words').value;
        const keywordsCount = document.getElementById('keywords-count').value;
        const descWords = document.getElementById('desc-words').value;
        const fileType = elements.fileTypeSelect.value;
        const platform = document.getElementById('platforms').value;
        const useCustomPrompt = elements.customPromptToggle.checked;
        const customPromptText = elements.customPromptTextarea.value.trim();
        const titleOptionValue = elements.titleOptions.value;
        let titleStyle = titleOptionValue.startsWith('suffix_') ? 'declarative' : titleOptionValue;

        let prompt;

        if (useCustomPrompt && customPromptText) {
            // Logic for custom prompt
            prompt = `Based on the user's request: "${customPromptText}", and using the provided image as visual context, generate metadata. The response must be a valid JSON object with keys "title", "description", "keywords", and "category".
- "title": A title of about ${titleWords} words, based on the user's request.
- "description": A description of about ${descWords} words, based on the user's request.
- "keywords": An array of exactly ${keywordsCount} keywords, relevant to the user's request.
- "category": The most relevant category for the user's request.
Ensure the entire response is only the JSON object, without markdown formatting. Do not include forbidden phrases like 'black background' or 'white background'. Title should not contain commas or colons.`;
        } else {
            // Original logic for image analysis
            let fileTypeContext = originalMimeType === 'image/svg+xml' 
                ? 'The original image is an SVG. Please generate keywords suitable for vector graphics, such as "vector", "illustration", "scalable", "eps", "icon".'
                : 'The original image is a raster file (JPG/PNG). Avoid vector-specific keywords like "vector", "eps", "illustration", or "scalable" unless the image content itself is clearly an illustration.';

            prompt = `Analyze this image (${fileName}). ${fileTypeContext} Context: - Target Platform: ${platform} - Requested File Type: ${fileType} - Title Style: ${titleStyle}. Generate metadata in a valid JSON object format. Your entire response must be only the JSON object, without any markdown formatting. The JSON object must have these exact keys: "title", "description", "keywords", "category". - "title": An SEO-friendly title of about ${titleWords} words. - "description": A compelling description of about ${descWords} words. - "keywords": An array of exactly ${keywordsCount} relevant string keywords. - "category": A single, most relevant category string. IMPORTANT: Do NOT include phrases like 'against a black background', 'on black background', 'dark background', 'black backround', or 'white background' in the title or keywords. Also, do not include commas (,) or colons (:) in the title.`;
        }

        return callGeminiAPI(prompt, base64Data, mimeType);
    }
    
    async function getPromptFromGemini(base64Data, mimeType, fileName) {
        const promptWords = document.getElementById('prompt-words').value;
        const prompt = `Based on the content of this image (${fileName}), generate a highly detailed and descriptive prompt of about ${promptWords} words. This prompt will be used for an image generation AI (like Midjourney or DALL-E). The prompt should be a single string without a period at the end. Respond with a valid JSON object with a single key "prompt". Your entire response must be only the JSON object. IMPORTANT: Do NOT include phrases like 'isolated on a pure white background', 'against a black background', or 'dark background' in the generated prompt.`;
        return callGeminiAPI(prompt, base64Data, mimeType);
    }
    
    async function callGeminiAPI(prompt, base64Data, mimeType) {
        if (apiKeys.length === 0) {
            throw new Error("No API Keys available. Please add one in the API Key panel.");
        }

        for (let i = 0; i < apiKeys.length; i++) {
            const apiKey = apiKeys[currentApiKeyIndex];
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            const payload = { contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64Data } }] }] };

            try {
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

                if (response.ok) {
                    const result = await response.json();
                    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!textContent) throw new Error("Received an empty response from the AI.");
                    
                    const cleanedText = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
                    try {
                        return JSON.parse(cleanedText);
                    } catch (e) {
                        throw new Error("Received invalid JSON from the AI.");
                    }
                }

                if (response.status === 429) {
                    console.warn(`API key at index ${currentApiKeyIndex} exceeded quota. Trying next key.`);
                    currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
                    continue; 
                }
                
                const error = await response.json().catch(() => ({ error: { message: `API request failed with status ${response.status}` } }));
                throw new Error(error.error?.message || `An unknown API error occurred.`);

            } catch (error) {
                console.error(`Error with API key at index ${currentApiKeyIndex}:`, error.message);
                currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
            }
        }

        throw new Error("All available API keys failed or have exceeded their quota.");
    }

    function getCardData(card) {
        if (!card) return null;
        const originalFilename = card.querySelector('h4')?.textContent || '';
        const selectedFileType = elements.fileTypeSelect.value;
        let finalFilename = originalFilename;

        if (currentMode === 'metadata' && selectedFileType) {
            const nameWithoutExtension = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename;
            finalFilename = `${nameWithoutExtension}.${selectedFileType}`;
        }

        if (currentMode === 'metadata') {
            if (card.querySelector('.regenerate-btn')) return null;
            return {
                Filename: finalFilename,
                Title: card.querySelector('.generated-title')?.textContent || '',
                Description: card.querySelector('.generated-description')?.textContent || '',
                Keywords: Array.from(card.querySelectorAll('.generated-keywords span.keyword-tag')).map(span => span.firstChild.textContent.trim()),
                Category: card.querySelector('.generated-category span')?.textContent || ''
            };
        } else {
            return {
                Filename: finalFilename,
                Prompt: card.querySelector('.generated-prompt')?.textContent || ''
            };
        }
    }

    function getDataFromAllCards() {
        const resultCards = document.querySelectorAll('.result-card');
        if (resultCards.length === 0) {
            showToast("No data to download!", true);
            return null;
        }
        return Array.from(resultCards).map(getCardData).filter(Boolean);
    }

    function convertToCSV(data) {
        if (!data || data.length === 0) return '';
        const platform = document.getElementById('platforms').value;
        const escapeCsv = (field) => `"${String(field).replace(/"/g, '""')}"`;

        if (platform === 'Adobe Stock') {
            const headers = ['Filename', 'Title', 'Keywords', 'Category', 'Releases'];
            const headerRow = headers.join(',');
            const rows = data.map(item => {
                return [
                    item.Filename || '',
                    escapeCsv(item.Title || ''),
                    escapeCsv(Array.isArray(item.Keywords) ? item.Keywords.join(',') : ''),
                    escapeCsv(item.Category || ''),
                    '' // Releases column is empty
                ].join(',');
            });
            return [headerRow, ...rows].join('\n');
        } else if (platform === 'Shutterstock') {
            const headers = ['Filename', 'Description', 'Keywords', 'Categories', 'Editorial'];
            const headerRow = headers.join(',');
            const rows = data.map(item => {
                return [
                    escapeCsv(item.Filename || ''),
                    escapeCsv(item.Title || ''),
                    escapeCsv(Array.isArray(item.Keywords) ? item.Keywords.join(',') : ''),
                    escapeCsv(item.Category || ''),
                    escapeCsv('no')
                ].join(',');
            });
            return [headerRow, ...rows].join('\n');
        } else if (platform === 'Freepik') {
            const headers = ['File name', 'Title', 'Keywords', 'Prompt', 'Model'];
            const headerRow = headers.join(',');
            const rows = data.map(item => {
                return [
                    escapeCsv(item.Filename || ''),
                    escapeCsv(item.Title || ''),
                    escapeCsv(Array.isArray(item.Keywords) ? item.Keywords.join(',') : ''),
                    escapeCsv(item.Description || ''), // Using Description for Prompt
                    escapeCsv('') // Empty Model column
                ].join(',');
            });
            return [headerRow, ...rows].join('\n');
        }
        else { // Default for "Genaral" and others
            const headers = Object.keys(data[0]);
            const headerRow = headers.join(',');
            const rows = data.map(item => {
                return headers.map(header => {
                    const value = item[header];
                    return escapeCsv(Array.isArray(value) ? value.join(', ') : value);
                }).join(',');
            });
            return [headerRow, ...rows].join('\n');
        }
    }

    function convertToJSON(data) {
        return JSON.stringify(data, null, 4);
    }

    function convertToXML(data) {
        const escapeXml = (unsafe) => typeof unsafe !== 'string' ? unsafe : unsafe.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c]));
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';
        data.forEach(item => {
            xml += '  <image>\n';
            for (const key in item) {
                if (Array.isArray(item[key])) {
                    xml += `    <${escapeXml(key)}>\n`;
                    item[key].forEach(subItem => xml += `      <keyword>${escapeXml(subItem)}</keyword>\n`);
                    xml += `    </${escapeXml(key)}>\n`;
                } else {
                    xml += `    <${escapeXml(key)}>${escapeXml(item[key])}</${escapeXml(key)}>\n`;
                }
            }
            xml += '  </image>\n';
        });
        xml += '</data>';
        return xml;
    }

    function triggerDownload(content, mimeType, filename) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function downloadAllData(format) {
        const data = getDataFromAllCards();
        if (!data || data.length === 0) {
            showToast("No successful items to download.", true);
            return;
        };

        let content, mimeType;
        const filename = `CsvPro_Metadata.${format}`;

        if (format === 'csv') { content = convertToCSV(data); mimeType = 'text/csv;charset=utf-8;'; } 
        else if (format === 'json') { content = convertToJSON(data); mimeType = 'application/json;charset=utf-8;'; }
        else if (format === 'xml') { content = convertToXML(data); mimeType = 'application/xml;charset=utf-8;'; }
        
        triggerDownload(content, mimeType, filename);
        showToast(`${format.toUpperCase()} Downloaded!`);
    }

    function downloadSingleData(index, format) {
        const card = document.querySelector(`[data-id="file-${index}"]`);
        const data = getCardData(card);
        if (!data) {
            showToast("Could not get data for this card.", true);
            return;
        }
        
        let content, mimeType;
        const baseFilename = (data.Filename.substring(0, data.Filename.lastIndexOf('.')) || data.Filename);
        const filename = `${baseFilename}.${format}`;

        if (format === 'csv') { content = convertToCSV([data]); mimeType = 'text/csv;charset=utf-8;'; }
        else if (format === 'json') { content = convertToJSON([data]); mimeType = 'application/json;charset=utf-8;'; }
        else if (format === 'xml') { content = convertToXML([data]); mimeType = 'application/xml;charset=utf-8;'; }

        triggerDownload(content, mimeType, filename);
        showToast(`Downloaded ${filename}`);
    }

    function showToast(message, isError = false) {
        elements.toast.textContent = message;
        elements.toast.className = `fixed bottom-10 right-10 text-white py-2 px-5 rounded-lg shadow-xl transition-all duration-300 ${isError ? 'bg-red-500' : 'bg-green-500'}`;
        elements.toast.classList.remove('opacity-0', 'translate-y-5');
        setTimeout(() => {
            elements.toast.classList.add('opacity-0', 'translate-y-5');
        }, 3000);
    }
    
    function renderApiKeyInputs() {
        elements.apiKeyList.innerHTML = '';
        if (apiKeys.length === 0) {
            addApiKeyInput('');
        } else {
            apiKeys.forEach(key => addApiKeyInput(key));
        }
    }

    function addApiKeyInput(value = '') {
        const keyInputWrapper = document.createElement('div');
        keyInputWrapper.className = 'flex items-center gap-2';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'api-key-input w-full custom-input p-2 rounded-lg';
        input.placeholder = 'Enter Gemini Key';
        input.value = value;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'api-key-delete-btn';
        deleteBtn.innerHTML = `<svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
        
        deleteBtn.addEventListener('click', () => {
            keyInputWrapper.remove();
        });

        keyInputWrapper.appendChild(input);
        keyInputWrapper.appendChild(deleteBtn);
        elements.apiKeyList.appendChild(keyInputWrapper);
    }

    function saveApiKeys() {
        const inputs = elements.apiKeyList.querySelectorAll('.api-key-input');
        const keysFromInputs = Array.from(inputs)
            .map(input => input.value.trim())
            .filter(key => key !== ''); 

        apiKeys = keysFromInputs;
        localStorage.setItem('geminiApiKeys', JSON.stringify(apiKeys));
        currentApiKeyIndex = 0; 
        showToast("API Keys saved successfully!");
        renderApiKeyInputs(); 
    }

    function loadApiKeys() {
        const savedKeys = localStorage.getItem('geminiApiKeys');
        apiKeys = savedKeys ? JSON.parse(savedKeys) : [];
        currentApiKeyIndex = 0;
        renderApiKeyInputs();
        if (apiKeys.length > 0) {
            showToast(`${apiKeys.length} API Key(s) loaded from memory.`);
        }
    }
    
    function handleCopyClick(event) {
        const copyBtn = event.target.closest('.copy-btn');
        if (!copyBtn) return;

        const card = copyBtn.closest('.result-card');
        const type = copyBtn.dataset.type;
        let textToCopy = '';

        if (type === 'title') textToCopy = card.querySelector('.generated-title').textContent;
        else if (type === 'description') textToCopy = card.querySelector('.generated-description').textContent;
        else if (type === 'prompt') textToCopy = card.querySelector('.generated-prompt').textContent;
        else if (type === 'keywords') {
            const keywordSpans = card.querySelectorAll('.generated-keywords span.keyword-tag');
            textToCopy = Array.from(keywordSpans).map(span => span.firstChild.textContent.trim()).join(', ');
        }

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => showToast('Copied to clipboard!'))
                .catch(err => showToast('Failed to copy text.', true));
        }
    }
    
    function openModal(panel, overlay) {
        overlay.classList.remove('hidden');
        panel.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
    }

    function closeModal(panel, overlay) {
        overlay.classList.add('hidden');
        panel.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
    }
    
    function updateSliderFill(slider) {
        const min = slider.min;
        const max = slider.max;
        const val = slider.value;
        const percentage = (val - min) * 100 / (max - min);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
        const bg = `linear-gradient(to right, ${color} ${percentage}%, #334155 ${percentage}%)`;
        slider.style.background = bg;
    }

    // --- Initialize Everything ---
    
    elements.settingsBtn.addEventListener('click', () => openModal(elements.settingsPanel, elements.modalOverlay));
    elements.closeSettingsBtn.addEventListener('click', () => closeModal(elements.settingsPanel, elements.modalOverlay));
    elements.historyBtn.addEventListener('click', () => openModal(elements.historyPanel, elements.modalOverlay));
    elements.closeHistoryBtn.addEventListener('click', () => closeModal(elements.historyPanel, elements.modalOverlay));
    
    // Auth Modals
    elements.loginBtn.addEventListener('click', () => openModal(elements.loginModal, elements.modalOverlay));
    elements.closeLoginBtn.addEventListener('click', () => closeModal(elements.loginModal, elements.modalOverlay));
    elements.logoutBtnCard.addEventListener('click', signOut);
    elements.loginGoogleBtn.addEventListener('click', signInWithGoogle);

    elements.profilePicBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent window click event from firing immediately
        elements.profileCard.classList.toggle('hidden');
    });

    elements.modalOverlay.addEventListener('click', () => {
        closeModal(elements.settingsPanel, elements.modalOverlay);
        closeModal(elements.historyPanel, elements.modalOverlay);
        closeModal(elements.loginModal, elements.modalOverlay);
    });
    
    elements.themeColorSwatches.addEventListener('click', (e) => e.target.dataset.theme && applyTheme(e.target.dataset.theme));
    elements.bgColorSwatches.addEventListener('click', (e) => e.target.dataset.bg && applyBackground(e.target.dataset.bg));

    applyTheme(localStorage.getItem('appTheme') || 'pink');
    applyBackground(localStorage.getItem('appBackground') || 'slate');
    switchMode('metadata'); 
    loadApiKeys(); 
    setupAuthListeners(); // Setup Supabase listeners

    elements.metadataBtn.addEventListener('click', () => switchMode('metadata'));
    elements.promptBtn.addEventListener('click', () => switchMode('prompt'));
    
    elements.addApiKeyBtn.addEventListener('click', () => addApiKeyInput());
    elements.saveApiKeysBtn.addEventListener('click', saveApiKeys);

    elements.uploadArea.addEventListener('click', () => elements.fileUpload.click());
    elements.uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); elements.uploadArea.classList.add('border-primary-color'); });
    elements.uploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); elements.uploadArea.classList.remove('border-primary-color'); });
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('border-primary-color');
        handleFileSelect(e);
    });
    elements.fileUpload.addEventListener('change', handleFileSelect);
    elements.clearAllBtn.addEventListener('click', clearResults);
    elements.generateNowBtn.addEventListener('click', startGeneration);
    
    elements.downloadBtn.addEventListener('click', () => elements.downloadOptions.classList.toggle('hidden'));
    elements.downloadOptions.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.dataset.format) {
            downloadAllData(e.target.dataset.format);
            elements.downloadOptions.classList.add('hidden');
        }
    });
    
    elements.contentGrid.addEventListener('click', (e) => {
        const target = e.target;
        handleCopyClick(e);

        if (target.closest('.delete-keyword-btn')) {
            target.closest('.keyword-tag')?.remove();
        } else if (target.closest('.delete-btn')) {
            target.closest('.result-card')?.remove();
            showToast("Image removed.");
            if (elements.contentGrid.children.length === 0) clearResults();
        } else if (target.closest('.regenerate-btn')) {
            const index = parseInt(target.dataset.index, 10);
            const file = filesToProcess[index];
            if (file) processSingleFile(file, index);
        } else if (target.closest('.individual-download-btn')) {
            const dropdown = target.closest('div').nextElementSibling;
            dropdown?.classList.toggle('hidden');
        } else if (target.closest('.individual-download-options a')) {
            e.preventDefault();
            const index = parseInt(target.dataset.index, 10);
            const format = target.dataset.format;
            downloadSingleData(index, format);
            target.closest('.individual-download-options').classList.add('hidden');
        }
    });
    
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.relative')) {
            document.querySelectorAll('.individual-download-options').forEach(el => el.classList.add('hidden'));
        }
        if (!elements.downloadBtn.contains(e.target) && !elements.downloadOptions.contains(e.target)) {
            elements.downloadOptions.classList.add('hidden');
        }
        // Close profile card if clicked outside
        if (elements.profileSection && !elements.profileSection.contains(e.target)) {
            elements.profileCard.classList.add('hidden');
        }
    });

    document.querySelectorAll('.custom-slider').forEach(slider => {
        const valEl = document.getElementById(`${slider.id}-val`);
        slider.addEventListener('input', () => {
            if (valEl) valEl.textContent = slider.value;
            updateSliderFill(slider);
        });
        // Initial fill
        updateSliderFill(slider);
    });
    
    elements.customPromptToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            elements.customPromptContainer.classList.remove('hidden');
        } else {
            elements.customPromptContainer.classList.add('hidden');
        }
    });
});
