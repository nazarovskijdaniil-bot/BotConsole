        // Функции для сохранения и загрузки сообщений из localStorage
        function saveChatMessage(chatId, msg) {
            const key = `chat_messages_${chatId}`;
            let messages = [];
            try {
                const stored = localStorage.getItem(key);
                messages = stored ? JSON.parse(stored) : [];
            } catch (e) { }

            // Проверяем что сообщение еще не сохранено
            if (!messages.find(m => m.message_id === msg.message_id)) {
                messages.push({
                    message_id: msg.message_id,
                    text: msg.text,
                    date: msg.date,
                    from: msg.from,
                    chat: msg.chat
                });
                // Ограничиваем 500 сообщений в локальном хранилище
                if (messages.length > 500) {
                    messages = messages.slice(-500);
                }
                try {
                    localStorage.setItem(key, JSON.stringify(messages));
                } catch (e) { console.error('Error saving messages:', e); }
            }
        }

        function getCachedChatMessages(chatId) {
            const key = `chat_messages_${chatId}`;
            try {
                const stored = localStorage.getItem(key);
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                return [];
            }
        }

        function openChat(chat) {
            currentChatId = chat.id;

            // Оновлюємо активний чат у списку
            document.querySelectorAll('.chat-list-item').forEach(el => {
                el.classList.remove('active');
            });
            document.querySelector(`[data-chat-id="${chat.id}"]`)?.classList.add('active');

            // Оновлюємо заголовок
            const headerAvatar = document.getElementById('chat-header-avatar');
            headerAvatar.textContent = getInitials(chat.title || chat.firstName || 'U');
            headerAvatar.style.backgroundImage = '';

            document.getElementById('chat-header-name').textContent = chat.title || chat.firstName || `Чат ${chat.id}`;

            // Завантажуємо фото для заголовка
            const token = localStorage.getItem('bot_token');
            if (token) {
                if (chat.userId && chat.type === 'private') {
                    // Для приватних чатов - фото користувача
                    loadUserPhoto(chat.userId, token, headerAvatar);
                } else if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
                    // Для груп и каналів - фото чату
                    loadChatPhoto(chat.id, token, headerAvatar);
                }
            }

            const statusText = chat.type === 'private'
                ? (usersCache[chat.userId]?.isBot ? 'Бот' : 'Активний')
                : chat.type === 'group' ? 'Група'
                    : 'Канал';
            document.getElementById('chat-header-status').textContent = statusText;

            // Завантажуємо повідомлення
            loadChatMessages(chat.id);

            // Запускаємо polling
            startPolling(chat.id);
        }

        // Обработчик long press для чатов
        function handleChatItemLongPress(element, chat) {
            let pressStartTime = null;
            let pressed = false;

            element.addEventListener('pointerdown', (e) => {
                pressStartTime = Date.now();
                pressed = true;
            });

            element.addEventListener('pointerup', (e) => {
                if (!pressed || !pressStartTime) return;
                const pressDuration = Date.now() - pressStartTime;
                pressed = false;

                if (pressDuration > 500) {
                    // Long press — открыть в новой вкладке
                    openChatInNewTab(chat);
                } else {
                    // Обычный клик — открыть модальное окно
                    openChatInModal(chat);
                }
            });

            element.addEventListener('pointercancel', () => {
                pressed = false;
            });
        }

        // Открыть чат в модальном окне
        function openChatInModal(chat) {
            const modal = document.getElementById('chat-modal');
            if (!modal) {
                console.error('Chat modal not found');
                return;
            }

            // Устанавливаем данные чата
            currentChatId = chat.id;
            
            // Показываем модальное окно
            modal.classList.add('show');
            
            // Загружаем сообщения в модаль
            loadChatMessagesInModal(chat.id);
            
            // Запускаем полинг для обновления сообщений в реальном времени
            startPolling(chat.id);
            
            // Обновляем заголовок
            const headerAvatar = document.getElementById('modal-chat-header-avatar');
            const headerName = document.getElementById('modal-chat-header-name');
            const headerStatus = document.getElementById('modal-chat-header-status');
            const token = localStorage.getItem('bot_token');

            headerAvatar.textContent = getInitials(chat.title || chat.firstName || 'U');
            headerAvatar.style.backgroundImage = '';
            headerName.textContent = chat.title || chat.firstName || `Чат ${chat.id}`;

            // Загружаем фото
            if (token) {
                if (chat.userId && chat.type === 'private') {
                    loadUserPhoto(chat.userId, token, headerAvatar);
                } else if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
                    loadChatPhoto(chat.id, token, headerAvatar);
                }
            }

            const statusText = chat.type === 'private'
                ? (usersCache[chat.userId]?.isBot ? 'Бот' : 'Активний')
                : chat.type === 'group' ? 'Група'
                    : 'Канал';
            headerStatus.textContent = statusText;

            // Загружаємо сообщения
            loadChatMessagesInModal(chat.id);

            // Показываем модаль только на мобильных устройствах
            // На desktop модаль всегда видна как flex-item благодаря CSS
            if (window.innerWidth <= 768) {
                // Скрываем панель чатов при открытии чата на мобильных
                const chatsPanel = document.getElementById('chats-panel');
                if (chatsPanel) {
                    chatsPanel.classList.add('hide');
                }
                modal.style.display = 'flex';
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            }

            // Запускаем polling
            startPolling(chat.id);
        }

        // Открыть чат в новой вкладке
        function openChatInNewTab(chat) {
            const chatData = encodeURIComponent(JSON.stringify({
                id: chat.id,
                title: chat.title || chat.firstName,
                type: chat.type,
                userId: chat.userId,
                lastMessage: chat.lastMessage
            }));

            const url = `${window.location.pathname}?chatmode=1&chat=${chatData}`;
            window.open(url, '_blank');
        }

        // Загрузить сообщения в модальное окно
        function loadChatMessagesInModal(chatId) {
            const messagesContainer = document.getElementById('modal-messages-container');
            const token = localStorage.getItem('bot_token');
            const botInfo = JSON.parse(localStorage.getItem('bot_info') || '{}');
            const botId = botInfo.id;

            console.log('loadChatMessagesInModal called for chatId:', chatId, 'botId:', botId);

            if (!messagesContainer) {
                console.error('modal-messages-container not found!');
                return;
            }

            messagesContainer.innerHTML = '';
            chatUpdates = {};

            // Спочатку показуємо кэшировані сообщения
            const cachedMessages = getCachedChatMessages(chatId);
            console.log('Cached messages:', cachedMessages.length);
            
            cachedMessages.forEach(msg => {
                if (msg && msg.text) {
                    chatUpdates[msg.message_id] = true;
                    const isBotMessage = msg.from && msg.from.id === botId;
                    const userName = msg.from ? (msg.from.first_name || msg.from.username || 'Користувач') : 'Система';
                    console.log('Adding message:', msg.text.substring(0, 30), 'from:', msg.from?.id, 'botId:', botId, 'type:', isBotMessage ? 'sent' : 'received');
                    displayMessageInModal(msg.text, isBotMessage ? 'sent' : 'received', new Date(msg.date * 1000), userName, msg.from?.id);
                }
            });

            // Завантажуємо більше обновлень щоб отримати старіші сообщения
            if (token) {
                fetch(`https://api.telegram.org/bot${token}/getUpdates`)
                    .then(r => r.json())
                    .then(json => {
                        if (json.ok && Array.isArray(json.result)) {
                            console.log('Fetched updates:', json.result.length);
                            json.result.forEach(update => {
                                if (update.message && update.message.chat && update.message.chat.id === chatId) {
                                    const msg = update.message;
                                    if (!chatUpdates[msg.message_id] && msg.text) {
                                        chatUpdates[msg.message_id] = true;
                                        // Сохраняем сообщение в localStorage
                                        saveChatMessage(chatId, msg);
                                        const isBotMessage = msg.from && msg.from.id === botId;
                                        const userName = msg.from ? (msg.from.first_name || msg.from.username || 'Користувач') : 'Система';
                                        console.log('Adding fetched message:', msg.text.substring(0, 30), 'from:', msg.from?.id, 'botId:', botId, 'type:', isBotMessage ? 'sent' : 'received');
                                        displayMessageInModal(msg.text, isBotMessage ? 'sent' : 'received', new Date(msg.date * 1000), userName, msg.from?.id);
                                    }
                                }
                            });
                        }
                    });
            }
        }

        // Показать сообщение в модальном окне
        function displayMessageInModal(text, type, time, userName, userId) {
            const messagesContainer = document.getElementById('modal-messages-container');
            if (!messagesContainer) {
                console.error('modal-messages-container not found');
                return;
            }

            console.log('displayMessageInModal:', text, type);

            const messageDiv = document.createElement('div');
            messageDiv.style.display = 'flex';
            messageDiv.style.gap = '8px';
            messageDiv.style.marginBottom = '12px';
            messageDiv.style.alignItems = 'flex-end';
            
            if (type === 'sent') {
                messageDiv.style.justifyContent = 'flex-end';
            }

            const contentDiv = document.createElement('div');
            contentDiv.style.maxWidth = '70%';
            contentDiv.style.padding = '12px 16px';
            contentDiv.style.borderRadius = '14px';
            contentDiv.style.wordWrap = 'break-word';
            contentDiv.style.wordBreak = 'break-word';
            contentDiv.style.lineHeight = '1.4';
            contentDiv.style.cursor = 'pointer';
            contentDiv.style.fontSize = '14px';
            contentDiv.style.transition = 'all 0.2s ease';
            contentDiv.textContent = text;
            
            if (type === 'received') {
                // Сообщение от пользователя - светлый серый СЛЕВА
                contentDiv.style.background = '#e4e6eb';
                contentDiv.style.color = '#0a0a0a';
                contentDiv.style.fontWeight = '500';
                contentDiv.style.border = 'none';
                contentDiv.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
            } else {
                // Сообщение от бота - яркий голубой СПРАВА
                contentDiv.style.background = '#0084ff';
                contentDiv.style.color = 'white';
                contentDiv.style.fontWeight = '600';
                contentDiv.style.boxShadow = '0 2px 8px rgba(0, 132, 255, 0.3)';
            }
            
            // Добавляем обработку копирования при клике
            contentDiv.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(text);
                    showToast('Скопировано ✓', 'success');
                } catch (err) {
                    showToast('Ошибка копирования', 'error');
                }
            });

            contentDiv.addEventListener('mouseover', () => {
                contentDiv.style.transform = 'translateY(-2px)';
                if (type === 'received') {
                    contentDiv.style.background = '#d8e6f0';
                } else {
                    contentDiv.style.filter = 'brightness(1.1)';
                }
            });

            contentDiv.addEventListener('mouseout', () => {
                contentDiv.style.transform = 'translateY(0)';
                if (type === 'received') {
                    contentDiv.style.background = '#e8eef5';
                } else {
                    contentDiv.style.filter = 'brightness(1)';
                }
            });

            messageDiv.appendChild(contentDiv);

            const timeDiv = document.createElement('div');
            timeDiv.style.fontSize = '11px';
            timeDiv.style.color = '#999';
            timeDiv.style.alignSelf = 'flex-end';
            timeDiv.style.padding = '0 4px';
            timeDiv.style.minWidth = '30px';
            timeDiv.textContent = time.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

            messageDiv.appendChild(timeDiv);
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function loadChatMessages(chatId) {
            const messagesContainer = document.getElementById('messages-container');
            const token = localStorage.getItem('bot_token');

            messagesContainer.innerHTML = '';
            chatUpdates = {};

            // Спочатку показуємо кэшировані сообщения
            const cachedMessages = getCachedChatMessages(chatId);
            cachedMessages.forEach(msg => {
                if (msg && msg.text) {
                    chatUpdates[msg.message_id] = true;
                    const isUserMessage = msg.from && msg.from.id !== chatId;
                    const userName = msg.from ? (msg.from.first_name || msg.from.username || 'Користувач') : 'Система';
                    displayMessage(msg.text, isUserMessage ? 'received' : 'sent', new Date(msg.date * 1000), userName, msg.from?.id);
                }
            });

            // Завантажуємо більше обновлень щоб отримати старіші сообщения
            fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&allowed_updates=message,channel_post`)
                .then(r => r.json())
                .then(json => {
                    if (!json.ok || !json.result) return;

                    const chatMessages = json.result.filter(u => {
                        if (u.message && u.message.chat && u.message.chat.id === chatId) return true;
                        if (u.channel_post && u.channel_post.chat && u.channel_post.chat.id === chatId) return true;
                        return false;
                    });

                    chatMessages.sort((a, b) => {
                        const timeA = (a.message || a.channel_post)?.date || 0;
                        const timeB = (b.message || b.channel_post)?.date || 0;
                        return timeA - timeB;
                    });

                    // Очищаємо контейнер и перезавантажуємо все сообщения
                    messagesContainer.innerHTML = '';
                    chatUpdates = {};

                    chatMessages.forEach(update => {
                        const msg = update.message || update.channel_post;
                        if (msg && msg.text) {
                            chatUpdates[msg.message_id] = true;
                            // Зберігаємо сообщение в localStorage
                            saveChatMessage(chatId, msg);
                            const isUserMessage = msg.from && msg.from.id !== chatId;
                            const userName = msg.from ? (msg.from.first_name || msg.from.username || 'Користувач') : 'Система';
                            displayMessage(msg.text, isUserMessage ? 'received' : 'sent', new Date(msg.date * 1000), userName, msg.from?.id);
                        }
                    });

                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                })
                .catch(err => {
                    console.error('Помилка завантаження сообщений:', err);
                });
        }

        function displayMessage(text, type, time, userName, userId) {
            const messagesContainer = document.getElementById('messages-container');

            const msgWrapper = document.createElement('div');
            msgWrapper.style.display = 'flex';
            msgWrapper.style.gap = '10px';
            msgWrapper.style.marginBottom = '4px';
            msgWrapper.style.alignItems = 'flex-end';
            msgWrapper.style.animation = 'slideIn 0.3s ease-out';

            if (type === 'received') {
                msgWrapper.style.justifyContent = 'flex-start';
            } else {
                msgWrapper.style.justifyContent = 'flex-end';
            }

            if (type === 'received') {
                const avatar = document.createElement('div');
                avatar.style.cssText = 'width:36px;height:36px;border-radius:50%;background:var(--accent-gradient);color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;cursor:pointer;background-size:cover;background-position:center;box-shadow:0 2px 8px rgba(108,92,231,0.15);transition:transform var(--transition)';
                avatar.textContent = getInitials(userName);
                avatar.addEventListener('click', () => showProfile(userId));
                avatar.addEventListener('mouseover', () => { avatar.style.transform = 'scale(1.1)'; });
                avatar.addEventListener('mouseout', () => { avatar.style.transform = 'scale(1)'; });

                // Завантажуємо фото користувача
                const token = localStorage.getItem('bot_token');
                if (userId && token) {
                    loadUserPhoto(userId, token, avatar);
                }

                msgWrapper.appendChild(avatar);
            }

            const contentWrapper = document.createElement('div');
            contentWrapper.style.display = 'flex';
            contentWrapper.style.flexDirection = 'column';
            contentWrapper.style.gap = '4px';
            contentWrapper.style.maxWidth = type === 'received' ? '65%' : '60%';

            const nameEl = document.createElement('div');
            if (type === 'received') {
                nameEl.style.cssText = 'font-size:11px;font-weight:700;color:var(--accent);padding:0 2px;text-transform:uppercase;letter-spacing:0.3px;opacity:0.8';
                nameEl.textContent = userName;
                contentWrapper.appendChild(nameEl);
            }

            const msgContent = document.createElement('div');
            msgContent.className = 'message-content';
            msgContent.style.padding = type === 'received' ? '10px 14px' : '12px 16px';
            msgContent.style.borderRadius = type === 'received' ? '16px 16px 16px 4px' : '16px 4px 16px 16px';
            msgContent.style.background = type === 'received' ? '#e4e6eb' : '#0084ff';
            msgContent.style.color = type === 'received' ? '#0a0a0a' : 'white';
            msgContent.style.border = 'none';
            msgContent.style.boxShadow = type === 'received' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 132, 255, 0.3)';
            msgContent.style.lineHeight = '1.4';
            msgContent.style.wordWrap = 'break-word';
            msgContent.style.fontSize = '14px';
            msgContent.textContent = text;
            
            // Добавляем обработку копирования при клике
            msgContent.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(text);
                    showToast('Сообщение скопировано', 'success');
                } catch (err) {
                    showToast('Ошибка копирования', 'error');
                }
            });

            contentWrapper.appendChild(msgContent);

            const timeEl = document.createElement('div');
            timeEl.style.cssText = 'font-size:11px;color:var(--muted);padding:0 2px;padding-top:2px;text-align:' + (type === 'received' ? 'left' : 'right') + ';opacity:0.7';
            timeEl.textContent = time.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            contentWrapper.appendChild(timeEl);

            msgWrapper.appendChild(contentWrapper);
            messagesContainer.appendChild(msgWrapper);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function startChatsRefresh() {
            if (chatsRefreshInterval) clearInterval(chatsRefreshInterval);

            chatsRefreshInterval = setInterval(() => {
                const token = localStorage.getItem('bot_token');
                if (!token) return;

                fetch(`https://api.telegram.org/bot${token}/getUpdates`)
                    .then(r => r.json())
                    .then(json => {
                        if (!json.ok || !json.result) return;

                        const chats = new Map();
                        let hasNewChats = false;

                        // Збираємо інформацію про чати та користувачів
                        json.result.forEach(update => {
                            if (update.message) {
                                const msg = update.message;
                                const chat = msg.chat;
                                if (!chats.has(chat.id)) {
                                    chats.set(chat.id, {
                                        id: chat.id,
                                        title: chat.title || chat.first_name || chat.username || `Чат ${chat.id}`,
                                        type: chat.type,
                                        firstName: chat.first_name,
                                        lastName: chat.last_name,
                                        username: chat.username,
                                        photo: chat.photo,
                                        lastMessage: msg.text,
                                        lastMessageDate: msg.date,
                                        userId: msg.from?.id
                                    });

                                    // Перевіряємо чи це новий чат
                                    if (!allChatsData.has(chat.id)) {
                                        hasNewChats = true;
                                    }

                                    // Зберігаємо інформацію про користувача
                                    if (msg.from) {
                                        usersCache[msg.from.id] = {
                                            id: msg.from.id,
                                            firstName: msg.from.first_name,
                                            lastName: msg.from.last_name,
                                            username: msg.from.username,
                                            isBot: msg.from.is_bot
                                        };
                                    }
                                }
                            }
                        });

                        // Якщо є нові чати, оновлюємо список
                        if (hasNewChats) {
                            allChatsData = chats;
                            displayChatsList(Array.from(chats.values()));
                        }
                    })
                    .catch(err => console.error('Помилка при оновленні чатів:', err));
            }, 2000);
        }

        function startPolling(chatId) {
            if (pollInterval) clearInterval(pollInterval);

            pollInterval = setInterval(() => {
                const token = localStorage.getItem('bot_token');
                const botInfo = JSON.parse(localStorage.getItem('bot_info') || '{}');
                const botId = botInfo.id;
                
                fetch(`https://api.telegram.org/bot${token}/getUpdates`)
                    .then(r => r.json())
                    .then(json => {
                        if (!json.ok || !json.result) return;

                        const updates = json.result.filter(u => {
                            if (u.message && u.message.chat && u.message.chat.id === chatId) return true;
                            if (u.channel_post && u.channel_post.chat && u.channel_post.chat.id === chatId) return true;
                            return false;
                        });

                        const modalContainer = document.getElementById('modal-messages-container');
                        const isModalOpen = modalContainer && modalContainer.closest('#chat-modal')?.classList.contains('show');

                        updates.forEach(update => {
                            const msg = update.message || update.channel_post;
                            if (msg && msg.text && msg.message_id && !chatUpdates[msg.message_id]) {
                                chatUpdates[msg.message_id] = true;
                                // Зберігаємо нове сообщение в localStorage
                                saveChatMessage(chatId, msg);
                                const isBotMessage = msg.from && msg.from.id === botId;
                                const userName = msg.from ? (msg.from.first_name || msg.from.username || 'Користувач') : 'Система';
                                
                                // Обновляем оба представления
                                if (isModalOpen) {
                                    // Если модальное окно открыто - обновляем его
                                    displayMessageInModal(msg.text, isBotMessage ? 'sent' : 'received', new Date(msg.date * 1000), userName, msg.from?.id);
                                } else {
                                    // Если основное представление открыто - обновляем его
                                    displayMessage(msg.text, isBotMessage ? 'sent' : 'received', new Date(msg.date * 1000), userName, msg.from?.id);
                                }
                            }
                        });
                    })
                    .catch(err => console.error('Помилка polling:', err));
            }, 2000);
        }

        // Модаль з інструкціями отримання токена
        const tokenInstructionsModal = document.getElementById('token-instructions-modal');
        const noTokenBtn = document.getElementById('no-token-btn');
        const closeTokenInstructionsBtn = document.getElementById('close-token-instructions');
        const openBotfatherBtn = document.getElementById('open-botfather');

        noTokenBtn && noTokenBtn.addEventListener('click', () => {
            tokenInstructionsModal.style.display = 'flex';
        });

        closeTokenInstructionsBtn && closeTokenInstructionsBtn.addEventListener('click', () => {
            tokenInstructionsModal.style.display = 'none';
        });

        tokenInstructionsModal && tokenInstructionsModal.addEventListener('click', (e) => {
            if (e.target === tokenInstructionsModal) tokenInstructionsModal.style.display = 'none';
        });

        openBotfatherBtn && openBotfatherBtn.addEventListener('click', () => {
            window.open('https://t.me/BotFather', '_blank');
        });

        // Профіль користувача
        const profileModal = document.getElementById('profile-modal');
        const closeProfileBtn = document.getElementById('close-profile');
        const viewProfileBtn = document.getElementById('view-profile');

        closeProfileBtn && closeProfileBtn.addEventListener('click', () => {
            profileModal.style.display = 'none';
        });

        profileModal && profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) profileModal.style.display = 'none';
        });

        // Обработчик удаления бота
        const deleteBotBtn = document.getElementById('delete-bot-btn');
        deleteBotBtn && deleteBotBtn.addEventListener('click', () => {
            const botInfo = JSON.parse(localStorage.getItem('bot_info') || '{}');
            const botName = botInfo.first_name || botInfo.username || 'Бот';
            
            if (confirm(`Дійсно видалити бота "${botName}"?`)) {
                const currentToken = localStorage.getItem('bot_token');
                let tokenNames = {};
                
                try {
                    const stored = localStorage.getItem('bot_token_names');
                    tokenNames = stored ? JSON.parse(stored) : {};
                } catch (e) {}
                
                // Видаляємо поточного бота
                delete tokenNames[currentToken];
                localStorage.setItem('bot_token_names', JSON.stringify(tokenNames));
                
                // Видаляємо закеш інформацію про бота
                localStorage.removeItem('bot_info_' + currentToken);
                
                // Видаляємо закеш фото
                if (botInfo.id) {
                    localStorage.removeItem('bot_photo_cache_' + botInfo.id);
                }
                
                // Перевіряємо чи є інші боти
                const botTokens = Object.keys(tokenNames);
                if (botTokens.length > 0) {
                    // Переключаємось на перший доступний бот
                    const firstToken = botTokens[0];
                    localStorage.setItem('bot_token', firstToken);
                    
                    // Завантажуємо інформацію про нового бота
                    try {
                        const storedBotInfo = localStorage.getItem('bot_info_' + firstToken);
                        if (storedBotInfo) {
                            localStorage.setItem('bot_info', storedBotInfo);
                        }
                    } catch (e) {}
                    
                    showToast(`Переключено на ${tokenNames[firstToken]}`, 'success');
                } else {
                    // Немає більше ботів
                    localStorage.removeItem('bot_token');
                    localStorage.removeItem('bot_info');
                    showToast('Всі боти видалені', 'info');
                }
                
                profileModal.style.display = 'none';
                updateBotsMenu();
                loadAllChatsForStep5();
            }
        });

