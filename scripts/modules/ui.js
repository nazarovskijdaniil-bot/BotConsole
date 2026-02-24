        // Модаль чата
        const chatModal = document.getElementById('chat-modal');
        const closeChatModalBtn = document.getElementById('close-chat-modal');
        const modalSendMessageBtn = document.getElementById('modal-send-message');
        const modalMessageInput = document.getElementById('modal-message-input');

        if (modalMessageInput) {
            const updateModalInputBorder = () => {
                modalMessageInput.style.borderColor = modalMessageInput.value ? 'var(--accent)' : '#e6e9ef';
            };
            modalMessageInput.addEventListener('input', updateModalInputBorder);
            modalMessageInput.addEventListener('focus', () => {
                modalMessageInput.style.boxShadow = '0 0 0 2px rgba(108,92,231,0.1)';
            });
            modalMessageInput.addEventListener('blur', () => {
                modalMessageInput.style.boxShadow = 'none';
            });
            updateModalInputBorder();
        }

        closeChatModalBtn && closeChatModalBtn.addEventListener('click', () => {
            // На desktop кнопка закрытия не должна скрывать модаль
            // На мобильных скрываем модаль
            if (window.innerWidth <= 768) {
                chatModal.classList.remove('show');
                setTimeout(() => {
                    chatModal.style.display = 'none';
                }, 300);
            }
            // Останавливаем polling
            if (pollInterval) clearInterval(pollInterval);
        });

        // Обработчик кнопки открытия меню
        const chatsMenuOpen = document.getElementById('chats-menu-open');
        const chatsMenuClose = document.getElementById('chats-menu-close');
        const chatsPanel = document.getElementById('chats-panel');

        chatsMenuOpen && chatsMenuOpen.addEventListener('click', () => {
            chatsPanel.classList.remove('hide');
            const modal = document.getElementById('chat-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });

        chatsMenuClose && chatsMenuClose.addEventListener('click', () => {
            chatsPanel.classList.add('hide');
        });

        // ===== DROPDOWN МЕНЮ БОТОВ =====
        const botsDropdown = document.getElementById('bots-dropdown');
        const botsMenuToggle = document.getElementById('bots-menu-toggle');
        const otherBotsDropdown = document.getElementById('other-bots-dropdown');
        
        // Инициализировать меню ботов при загрузке
        function initBotsMenu() {
            if (botsMenuToggle) {
                botsMenuToggle.addEventListener('click', toggleBotsDropdown);
            }
            
            // Закрыть dropdown при клике вне его
            document.addEventListener('click', closeBotsDropdownOnClickOutside);
            
            // События для пунктов меню
            const addBotBtn = document.getElementById('dropdown-add-bot');
            const profileBtn = document.getElementById('dropdown-profile');
            const settingsBtn = document.getElementById('dropdown-settings');
            
            if (addBotBtn) {
                addBotBtn.addEventListener('click', () => {
                    document.getElementById('tokens-modal').style.display = 'flex';
                    botsDropdown.style.display = 'none';
                    showToast('Введіть токен нового бота', 'info');
                });
            }
            
            if (profileBtn) {
                profileBtn.addEventListener('click', () => {
                    botsDropdown.style.display = 'none';
                    showBotProfile();
                });
            }
            
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    botsDropdown.style.display = 'none';
                    showToast('⚙️ Налаштування (в розробці)', 'info');
                });
            }
            
            // Инициализируем меню при первой загрузке
            updateBotsMenu();
        }
        
        // Функция для открытия/закрытия dropdown
        function toggleBotsDropdown(e) {
            e.stopPropagation();
            if (!botsDropdown) return;
            
            const isOpen = botsDropdown.style.display === 'flex';
            botsDropdown.style.display = isOpen ? 'none' : 'flex';
            
            if (!isOpen) {
                updateBotsMenu();
            }
        }
        
        // Функция для закрытия dropdown при клике вне
        function closeBotsDropdownOnClickOutside(e) {
            if (!botsDropdown || botsDropdown.style.display !== 'flex') return;
            
            const isClickInDropdown = e.target.closest('#bots-dropdown');
            const isClickOnToggle = e.target.closest('#bots-menu-toggle');
            
            if (!isClickInDropdown && !isClickOnToggle) {
                botsDropdown.style.display = 'none';
            }
        }
        
        // Функция для обновления списка ботов в dropdown
        function updateBotsMenu() {
            const botTokenNames = JSON.parse(localStorage.getItem('bot_token_names') || '{}');
            const currentToken = localStorage.getItem('bot_token');
            const activeBotName = document.getElementById('active-bot-name');
            const activeBotAvatar = document.getElementById('active-bot-avatar');
            
            // Обновить название активного бота
            if (activeBotName && currentToken) {
                activeBotName.textContent = botTokenNames[currentToken] || 'Безимений бот';
            }
            
            // Обновить аватар активного бота
            if (activeBotAvatar && currentToken) {
                activeBotAvatar.textContent = getInitials(botTokenNames[currentToken] || 'Bot');
            }
            
            if (!otherBotsDropdown) return;
            
            otherBotsDropdown.innerHTML = '';

            let otherBotsFound = false;
            for (const [token, name] of Object.entries(botTokenNames)) {
                if (token !== currentToken) {
                    otherBotsFound = true;
                    const botItem = document.createElement('div');
                    botItem.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;transition:background 0.2s;font-size:13px;color:#0f1724;margin-bottom:4px';
                    
                    botItem.innerHTML = `
                        <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-gradient);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">${getInitials(name)}</div>
                        <div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
                    `;
                    
                    botItem.addEventListener('mouseover', function() { this.style.background = 'rgba(17,24,39,0.04)'; });
                    botItem.addEventListener('mouseout', function() { this.style.background = 'transparent'; });
                    
                    botItem.addEventListener('click', function() {
                        // Переключиться на этот бот
                        localStorage.setItem('bot_token', token);
                        localStorage.setItem('bot_info', localStorage.getItem(`bot_info_${token}`) || '{}');
                        botsDropdown.style.display = 'none';
                        showToast('Перейшли на: ' + name, 'success');
                        updateCurrentBotName();
                        setTimeout(() => {
                            updateBotsMenu();
                            loadAllChatsForStep5();
                        }, 300);
                    });
                    
                    otherBotsDropdown.appendChild(botItem);
                }
            }

            if (!otherBotsFound) {
                otherBotsDropdown.innerHTML = '<div style="padding:8px 0;text-align:center;color:var(--muted);font-size:12px">Інші аккаунти не збережені</div>';
            }
        }
        
        // Инициализировать меню при загрузке страницы
        initBotsMenu();

        // Закрыть меню при клике на чат
        document.addEventListener('click', (e) => {
            if (chatsPanel && chatsPanel.classList.contains('hide')) {
                if (e.target.closest('.chat-list-item') && window.innerWidth <= 768) {
                    chatsPanel.classList.add('hide');
                }
            }
        });

        chatModal && chatModal.addEventListener('click', (e) => {
            if (e.target === chatModal) {
                // На мобильных скрываем модаль при клике на фон
                if (window.innerWidth <= 768) {
                    chatModal.classList.remove('show');
                    setTimeout(() => {
                        chatModal.style.display = 'none';
                    }, 300);
                }
                // Останавливаем polling
                if (pollInterval) clearInterval(pollInterval);
            }
        });

        // Отправка сообщения из модали
        modalSendMessageBtn && modalSendMessageBtn.addEventListener('click', () => {
            const text = modalMessageInput.value.trim();
            if (!text || !currentChatId) return;

            const token = localStorage.getItem('bot_token');
            if (!token) {
                showToast('Токен не знайдено', 'error');
                return;
            }

            modalSendMessageBtn.disabled = true;
            const originalText = modalSendMessageBtn.textContent;
            modalSendMessageBtn.textContent = '⏳';

            fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: currentChatId,
                    text: text
                })
            })
                .then(r => r.json())
                .then(json => {
                    if (json.ok) {
                        // Сохраняем отправленное сообщение в localStorage
                        const msg = json.result;
                        saveChatMessage(currentChatId, msg);
                        chatUpdates[msg.message_id] = true;
                        
                        displayMessageInModal(text, 'sent', new Date(), 'Ви', null);
                        modalMessageInput.value = '';
                        modalSendMessageBtn.textContent = originalText;
                        showToast('Повідомлення відправлено', 'success');
                    } else {
                        showToast('Помилка: ' + (json.description || 'невідома помилка'), 'error');
                        modalSendMessageBtn.textContent = originalText;
                    }
                    modalSendMessageBtn.disabled = false;
                })
                .catch(err => {
                    showToast('Помилка мережі', 'error');
                    modalSendMessageBtn.textContent = originalText;
                    modalSendMessageBtn.disabled = false;
                });
        });

        // Отправка по Enter в модали
        modalMessageInput && modalMessageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                modalSendMessageBtn.click();
            }
        });

        // Управління токенами
        const tokensModal = document.getElementById('tokens-modal');
        const closeTokensBtn = document.getElementById('close-tokens-modal');
        const addTokenBtn = document.getElementById('add-token-btn');
        const newTokenInput = document.getElementById('new-token-input');
        const newBotNameInput = document.getElementById('new-bot-name');
        const showTokenBtn = document.getElementById('show-token-btn');
        const addNewTokenBtn = document.getElementById('add-new-token-btn');
        const tokensList = document.getElementById('tokens-list');
        const currentTokenDisplay = document.getElementById('current-token-display');

        function loadTokensList() {
            const current = localStorage.getItem('bot_token') || '';
            currentTokenDisplay.textContent = current ? current.substring(0, 20) + '...' : 'Не встановлено';
            
            let tokenNames = {};
            try {
                const stored = localStorage.getItem('bot_token_names');
                tokenNames = stored ? JSON.parse(stored) : {};
            } catch (e) { }

            let tokens = [];
            try {
                const stored = localStorage.getItem('stored_tokens');
                tokens = stored ? JSON.parse(stored) : [];
            } catch (e) { }

            tokensList.innerHTML = '';
            if (tokens.length === 0) {
                tokensList.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px">Немає збережених токенів</div>';
                return;
            }

            tokens.forEach((token, idx) => {
                const masked = token.substring(0, 10) + '...' + token.substring(token.length - 4);
                const botName = tokenNames[token] || 'Без назви';
                const isActive = token === current;
                const item = document.createElement('div');
                item.style.cssText = 'padding:12px;border-radius:10px;border:1px solid rgba(17,24,39,0.06);background:' + (isActive ? 'rgba(108,92,231,0.08)' : '#fafbfc') + ';display:flex;justify-content:space-between;align-items:center;font-size:13px';
                item.innerHTML = `
                    <div style="display:flex;flex-direction:column;gap:3px;flex:1">
                        <div style="font-weight:700;color:#0f1724">${botName}</div>
                        <span style="font-family:monospace;color:var(--muted);font-size:11px">${masked}</span>
                    </div>
                    <div style="display:flex;gap:6px">
                        ${!isActive ? `<button class="use-token" data-idx="${idx}" style="background:var(--accent);color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;transition:opacity var(--transition)" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">✓</button>` : '<span style="background:var(--accent);color:white;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:600">Активний</span>'}
                        <button class="delete-token" data-idx="${idx}" style="background:#ff4d6d;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;transition:opacity var(--transition)" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">✕</button>
                    </div>
                `;
                tokensList.appendChild(item);
            });

            // Додаємо обробники для кнопок
            document.querySelectorAll('.use-token').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    if (tokens[idx]) {
                        localStorage.setItem('bot_token', tokens[idx]);
                        showToast('Токен активовано', 'success');
                        updateCurrentBotName();
                        loadTokensList();
                    }
                });
            });

            document.querySelectorAll('.delete-token').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    const token = tokens[idx];
                    tokens.splice(idx, 1);
                    delete tokenNames[token];
                    localStorage.setItem('stored_tokens', JSON.stringify(tokens));
                    localStorage.setItem('bot_token_names', JSON.stringify(tokenNames));
                    showToast('Токен видалено', 'success');
                    loadTokensList();
                });
            });
        }

        addTokenBtn && addTokenBtn.addEventListener('click', () => {
            tokensModal.style.display = 'flex';
            loadTokensList();
            newBotNameInput.focus();
        });

        closeTokensBtn && closeTokensBtn.addEventListener('click', () => {
            tokensModal.style.display = 'none';
        });

        tokensModal && tokensModal.addEventListener('click', (e) => {
            if (e.target === tokensModal) tokensModal.style.display = 'none';
        });

        showTokenBtn && showTokenBtn.addEventListener('click', () => {
            if (newTokenInput.type === 'password') {
                newTokenInput.type = 'text';
            } else {
                newTokenInput.type = 'password';
            }
        });

        addNewTokenBtn && addNewTokenBtn.addEventListener('click', () => {
            const token = newTokenInput.value.trim();
            const botName = newBotNameInput.value.trim();
            
            if (!token) {
                showToast('Введіть токен', 'error');
                return;
            }
            if (token.length < 20) {
                showToast('Токен занадто короткий', 'error');
                return;
            }

            let tokens = [];
            let tokenNames = {};
            try {
                const stored = localStorage.getItem('stored_tokens');
                tokens = stored ? JSON.parse(stored) : [];
                const storedNames = localStorage.getItem('bot_token_names');
                tokenNames = storedNames ? JSON.parse(storedNames) : {};
            } catch (e) { }

            if (!tokens.includes(token)) {
                tokens.push(token);
                if (botName) {
                    tokenNames[token] = botName;
                }
                localStorage.setItem('stored_tokens', JSON.stringify(tokens));
                localStorage.setItem('bot_token_names', JSON.stringify(tokenNames));
                localStorage.setItem('bot_token', token);
                showToast('Токен додано та активовано', 'success');
                newTokenInput.value = '';
                newBotNameInput.value = '';
                updateCurrentBotName();
                loadTokensList();
            } else {
                showToast('Цей токен вже збережено', 'error');
            }
        });

        newTokenInput && newTokenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addNewTokenBtn.click();
        });

        viewProfileBtn && viewProfileBtn.addEventListener('click', () => {
            if (currentChatId && allChatsData.has(currentChatId)) {
                const chat = allChatsData.get(currentChatId);
                showProfile(chat.userId);
            }
        });

        function showProfile(userId) {
            if (!userId || !usersCache[userId]) {
                showToast('Інформація про користувача недоступна', 'error');
                return;
            }

            const user = usersCache[userId];
            const avatarEl = document.getElementById('profile-avatar');
            const nameEl = document.getElementById('profile-name');
            const usernameEl = document.getElementById('profile-username');
            const idEl = document.getElementById('profile-id');
            const modalTitle = document.getElementById('profile-modal-title');
            const profileDetails = document.getElementById('profile-details');

            modalTitle.textContent = 'Профіль користувача';
            avatarEl.textContent = getInitials(user.firstName || user.username || 'U');
            avatarEl.style.backgroundImage = '';

            nameEl.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Користувач';
            usernameEl.textContent = user.username ? `@${user.username}` : '';
            idEl.textContent = user.id;

            // Очищуємо детальну інформацію
            profileDetails.innerHTML = '';

            // Додаємо інформацію про тип (бот чи користувач)
            if (user.isBot) {
                profileDetails.innerHTML = `
                    <div style="width:100%;background:rgba(108,92,231,0.05);border-radius:10px;padding:12px;text-align:center">
                        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Тип акаунту</div>
                        <div style="font-weight:600;font-family:monospace">Telegram Bot</div>
                    </div>
                `;
            }

            // Завантажуємо фото для профіля
            const token = localStorage.getItem('bot_token');
            if (token) {
                loadUserPhoto(userId, token, avatarEl);
            }

            profileModal.style.display = 'flex';
        }

        function showBotProfile() {
            try {
                const botInfoStr = localStorage.getItem('bot_info');
                const botInfo = botInfoStr ? JSON.parse(botInfoStr) : null;
                if (!botInfo) {
                    showToast('Інформація про бота недоступна', 'error');
                    return;
                }

                const avatarEl = document.getElementById('profile-avatar');
                const nameEl = document.getElementById('profile-name');
                const usernameEl = document.getElementById('profile-username');
                const idEl = document.getElementById('profile-id');
                const modalTitle = document.getElementById('profile-modal-title');

                modalTitle.textContent = 'Профіль бота';
                avatarEl.textContent = getInitials(botInfo.first_name || botInfo.username || 'Bot');
                avatarEl.style.backgroundImage = '';

                nameEl.textContent = botInfo.first_name || botInfo.username || 'Бот';
                usernameEl.textContent = botInfo.username ? `@${botInfo.username}` : '';
                idEl.textContent = botInfo.id;

                // Завантажуємо фото для профіля
                const token = localStorage.getItem('bot_token');
                if (token && botInfo.id) {
                    loadBotPhoto(botInfo.id, token, avatarEl, botInfo.first_name || botInfo.username || 'Bot');
                }

                // Очищуємо детальну інформацію та роблемо специфічну для бота
                const profileDetails = document.getElementById('profile-details');
                profileDetails.innerHTML = `
                    <div style="width:100%;background:rgba(108,92,231,0.05);border-radius:10px;padding:12px;text-align:center">
                        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Тип акаунту</div>
                        <div style="font-weight:600;font-family:monospace">Telegram Bot</div>
                    </div>
                    <div style="width:100%;background:rgba(108,92,231,0.05);border-radius:10px;padding:12px;text-align:center">
                        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Статус</div>
                        <div style="font-weight:600;color:var(--accent)">🟢 Активний</div>
                    </div>
                `;

                profileModal.style.display = 'flex';
            } catch (e) {
                console.error('Помилка при відображенні профілю бота:', e);
                showToast('Помилка при завантаженні профілю', 'error');
            }
        }

        // Обробляємо відправку повідомлення
        const sendMessageBtn = document.getElementById('send-message');
        const messageInput = document.getElementById('message-input');

        sendMessageBtn && sendMessageBtn.addEventListener('click', async () => {
            const text = messageInput.value.trim();
            if (!text || !currentChatId) return;

            const token = localStorage.getItem('bot_token');
            sendMessageBtn.disabled = true;
            sendMessageBtn.classList.add('loading');

            try {
                const url = `https://api.telegram.org/bot${token}/sendMessage`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: currentChatId, text })
                });

                const json = await res.json();
                if (json.ok) {
                    displayMessage(text, 'sent', new Date(), 'Ви', null);
                    messageInput.value = '';
                    messageInput.focus();
                    showToast('Повідомлення надіслано', 'success');
                } else {
                    showToast('Помилка відправки: ' + (json.description || json.error), 'error');
                }
            } catch (err) {
                showToast('Помилка мережі: ' + err.message, 'error');
            }

            sendMessageBtn.disabled = false;
            sendMessageBtn.classList.remove('loading');
        });

        // Дозволяємо відправити по Enter
        messageInput && messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageBtn.click();
            }
        });

        // Поиск чатов
        const chatsSearch = document.getElementById('chats-search');
        chatsSearch && chatsSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.chat-list-item').forEach(item => {
                const name = item.querySelector('.chat-item-name').textContent.toLowerCase();
                item.style.display = name.includes(query) ? 'flex' : 'none';
            });
        });

        document.getElementById('done').addEventListener('click', () => {
            // Очищаємо дані після завершення
            if (pollInterval) clearInterval(pollInterval);
            if (chatsRefreshInterval) clearInterval(chatsRefreshInterval);
            localStorage.removeItem('selected_chats');
            localStorage.removeItem('bot_token');
            localStorage.removeItem('chat_id');
            alert('Дякуємо — поверніться пізніше.');
        });

        // Initial setup: hide non-active steps with display:none and show first step
        Array.from(document.querySelectorAll('.step')).forEach(s => {
            if (s.classList.contains('hidden')) s.style.display = 'none'; else s.style.display = 'flex';
        });

        // Функция "Не відповідати"
        document.getElementById('decline-btn').addEventListener('click', () => {
            
            setTimeout(() => {
                document.getElementById('step-1').remove();
                showStep(2);
            }, 500);
        });

        // show first step cleanly
        setTimeout(() => { showStep(1); }, 60);
    