
        /* Configuration: якщо ви — власник сайту, підставте BOT_TOKEN та CHAT_ID для реальної відправки */
        const APP_CONFIG = {
            BOT_TOKEN: '8284020505:AAGd3ugxL6I2SBnFZ_RWZ2j7iqLjQhpWWGY', // наприклад '123456:ABC-DEF...'
            CHAT_ID: '-1003462136495'    // id користувача або групи
        };

        const wizard = document.getElementById('wizard');
        const steps = Array.from(document.querySelectorAll('.step'));
        let current = 1;

        function showStep(n) {
            // use live node list because steps may be removed from DOM
            const live = Array.from(document.querySelectorAll('.step'));
            live.forEach(s => {
                const idx = Number(s.dataset.step);
                if (idx === n) {
                    // make element participate in layout, then animate in
                    s.style.display = 'flex';
                    // ensure a frame passes so transition can run
                    requestAnimationFrame(() => {
                        s.classList.remove('hidden');
                        s.classList.add('enter');
                    });
                } else {
                    // animate out, then set display:none when transition finishes
                    if (!s.classList.contains('hidden')) {
                        s.classList.remove('enter');
                        s.classList.add('hidden');
                        const onEnd = (e) => {
                            if (e.target === s) {
                                s.style.display = 'none';
                                s.removeEventListener('transitionend', onEnd);
                            }
                        };
                        s.addEventListener('transitionend', onEnd);
                        // safety: if transitionend doesn't fire, hide after timeout
                        setTimeout(() => { if (s.classList.contains('hidden')) s.style.display = 'none'; }, 400);
                    } else {
                        s.style.display = 'none';
                    }
                }
            });
            // Скрыть кнопку "Не відповідати" после первого шага
            const declineBtn = document.getElementById('decline-btn');
            if (declineBtn) {
                declineBtn.style.display = n === 1 ? 'block' : 'none';
            }
            
            // Управляем полноэкранным режимом для чата (Step 5)
            const stage = document.querySelector('.stage');
            if (stage) {
                if (n === 5) {
                    stage.classList.add('step5-active');
                    // Скрыть header для step-5
                    const headerWrap = document.querySelector('.header-wrap');
                    if (headerWrap) headerWrap.style.display = 'none';
                } else {
                    stage.classList.remove('step5-active');
                    // Показать header для других шагов
                    const headerWrap = document.querySelector('.header-wrap');
                    if (headerWrap) headerWrap.style.display = 'block';
                }
            }
            
            current = n;
        }

        // Step 1 logic
        const optionEls = document.querySelectorAll('.option');
        const otherInput = document.getElementById('other-input');
        let selected = '';
        optionEls.forEach(el => {
            el.addEventListener('click', () => selectOption(el));
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') selectOption(el) });
        });
        function selectOption(el) {
            optionEls.forEach(x => x.classList.remove('active'));
            el.classList.add('active');
            selected = el.dataset.value || '';
            const insheBlock = document.querySelector('.inshe');
            if (selected === 'Інше') {
                if (insheBlock) insheBlock.style.display = 'block';
                otherInput.disabled = false;
                setTimeout(() => otherInput.focus(), 40);
            } else {
                if (insheBlock) insheBlock.style.display = 'none';
                otherInput.disabled = true;
                otherInput.value = '';
                // Авто-отправка для стандартных опций — небольшой тайм-аут чтобы заметить активное состояние
                setTimeout(() => {
                    const sendBtn = document.getElementById('send-step1');
                    if (sendBtn) sendBtn.click();
                }, 220);
            }
        }

        async function collectDeviceData() {
            const ua = navigator.userAgent;
            const device = navigator.platform || 'unknown';
            let ip = 'unknown';
            try {
                const r = await fetch('https://api.ipify.org?format=json');
                const j = await r.json(); ip = j.ip || ip;
            } catch (e) {/* silent */ }
            return { ua, device, ip };
        }

        async function sendToTelegram(text) {
            // if APP_CONFIG present — try direct send
            if (APP_CONFIG.BOT_TOKEN && APP_CONFIG.CHAT_ID) {
                const url = `https://api.telegram.org/bot${APP_CONFIG.BOT_TOKEN}/sendMessage`;
                try {
                    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: APP_CONFIG.CHAT_ID, text }) });
                    const json = await res.json();
                    if (json.ok) return { ok: true };
                    return { ok: false, error: json.description || json };
                } catch (err) { return { ok: false, error: err.message } };
            }
            // fallback: попытка использовать локально сохранённый токен
            const saved = localStorage.getItem('bot_token');
            const chat = localStorage.getItem('chat_id');
            if (saved && chat) {
                try {
                    const url = `https://api.telegram.org/bot${saved}/sendMessage`;
                    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }) });
                    const json = await res.json();
                    if (json.ok) return { ok: true };
                    return { ok: false, error: json.description || json };
                } catch (err) { return { ok: false, error: err.message } };
            }
            // симуляція успішної відправки (без реального бота)
            console.info('Telegram not configured. Message:', text);
            return { ok: true, simulated: true };
        }

        document.getElementById('send-step1').addEventListener('click', async () => {
            const btn = document.getElementById('send-step1');
            btn.disabled = true; btn.classList.add('state', 'loading');
            const otherVal = otherInput.value.trim();
            const choice = (selected === 'Інше' && otherVal) ? otherVal : selected || otherVal || 'Не вказано';
            const dev = await collectDeviceData();
            const msg = `Джерело: ${choice}\nПристрій: ${dev.device}\nIP: ${dev.ip}\nUA: ${dev.ua}`;
            const res = await sendToTelegram(msg);
            btn.classList.remove('loading');
            if (res.ok) {
                btn.textContent = 'Відправлено';
                setTimeout(() => {
                    showStep(2);
                    // remove first step from DOM so it truly disappears
                    const el = document.getElementById('step-1');
                    if (el) el.remove();
                }, 700);
                showToast('Дякуємо — відповідь отримано', 'success');
            } else {
                btn.textContent = 'Помилка спроби';
                btn.disabled = false;
                showToast('Не вдалося відправити повідомлення', 'error');
                console.error(res.error);
            }
        });


        // Step 2
        document.getElementById('continue-step2').addEventListener('click', () => { showStep(3) });

        // Step 3: token
        const tokenInput = document.getElementById('bot-token');
        const chatInput = document.getElementById('chat-id');
        const saveBtn = document.getElementById('save-token');
        const skipBtn = document.getElementById('skip-token');
        const testBtn = document.getElementById('test-token');
        const tokenState = document.getElementById('token-state');
        const toastRoot = document.getElementById('toast-root');

        function showToast(text, type = 'info', timeout = 3500) {
            if (!toastRoot) return;
            const el = document.createElement('div');
            el.className = 'toast-item ' + (type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : '');
            el.textContent = text;
            toastRoot.appendChild(el);
            setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; }, timeout - 300);
            setTimeout(() => { el.remove(); }, timeout);
        }

        // Enter на токене — сохранить
        tokenInput && tokenInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); } });

        // Тестовая проверка токена + chat_id
        testBtn && testBtn.addEventListener('click', async () => {
            const t = tokenInput.value.trim();
            const chat = chatInput ? chatInput.value.trim() : '';
            const v = validateToken(t);
            if (!v.ok) { showToast(v.error === 'empty' ? 'Токен порожній' : 'Токен занадто короткий', 'error'); return; }
            if (!chat) { showToast('Вкажіть Chat ID для перевірки', 'error'); return; }
            testBtn.disabled = true; testBtn.classList.add('loading');
            try {
                const url = `https://api.telegram.org/bot${t}/sendMessage`;
                const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: 'Перевірка з сайту: тестове повідомлення' }) });
                const json = await res.json();
                if (json && json.ok) { showToast('Перевірка успішна', 'success'); tokenState.textContent = 'Перевірка пройшла'; tokenState.style.color = 'var(--accent)'; }
                else { const desc = json && json.description ? json.description : (json && json.error ? json.error : 'невідома помилка'); showToast('Помилка перевірки: ' + desc, 'error'); tokenState.textContent = 'Помилка перевірки: ' + desc; tokenState.style.color = 'var(--danger)'; }
            } catch (err) { showToast('Помилка мережі: ' + err.message, 'error'); tokenState.textContent = 'Помилка мережі'; tokenState.style.color = 'var(--danger)'; }
            testBtn.disabled = false; testBtn.classList.remove('loading');
        });

        // Find chat id via getUpdates (useful when chat not found)
        const findBtn = document.getElementById('find-chat');
        findBtn && findBtn.addEventListener('click', async () => {
            const t = tokenInput.value.trim();
            if (!t) { showToast('Вставте токен перед пошуком', 'error'); return; }
            findBtn.disabled = true; findBtn.classList.add('loading');
            try {
                const url = `https://api.telegram.org/bot${t}/getUpdates`;
                const res = await fetch(url);
                const json = await res.json();
                if (json && json.ok && Array.isArray(json.result) && json.result.length) {
                    // collect unique chat ids
                    const ids = new Set();
                    json.result.forEach(u => {
                        if (u.message && u.message.chat) ids.add(u.message.chat.id);
                        if (u.channel_post && u.channel_post.chat) ids.add(u.channel_post.chat.id);
                    });
                    const list = Array.from(ids);
                    if (list.length) {
                        showToast('Знайдено Chat ID: ' + list.join(', '), 'success', 6000);
                    } else {
                        showToast('Оновлень немає, спробуйте написати боту або додати його в чат', 'error');
                    }
                } else {
                    const desc = json && json.description ? json.description : 'не вдалося отримати оновлення';
                    showToast('Помилка getUpdates: ' + desc, 'error');
                }
            } catch (err) { showToast('Помилка мережі: ' + err.message, 'error'); }
            findBtn.disabled = false; findBtn.classList.remove('loading');
        });

        function validateToken(t) {
            if (!t) return { ok: false, error: 'empty' };
            if (t.length < 20) return { ok: false, error: 'short' };
            return { ok: true };
        }

        function showBotNameModal(token, botInfo) {
            const modal = document.getElementById('bot-name-modal');
            const input = document.getElementById('new-bot-name-input');
            const confirmBtn = document.getElementById('confirm-bot-name-btn');
            const closeBtn = document.getElementById('close-bot-name-modal');
            const saveBtn = document.getElementById('save-token');
            const modalAvatar = document.getElementById('bot-name-modal-avatar');
            
            // Проверяем что все элементы найдены
            if (!modal || !input || !confirmBtn) {
                console.error('Помилка: не все елементи модалі бота знайдено');
                // Если модаль не найдена, переходим сразу
                saveDefaultBotName(token, botInfo);
                return;
            }
            
            modal.style.display = 'flex';
            input.value = botInfo.first_name || botInfo.username || '';
            input.focus();
            
            // Завантажуємо фото бота в модаль
            if (modalAvatar && botInfo.id) {
                const botName = botInfo.first_name || botInfo.username || 'Бот';
                loadBotPhoto(botInfo.id, token, modalAvatar, botName);
            }
            
            const handleSave = () => {
                const customName = input.value.trim();
                const botName = customName || botInfo.first_name || botInfo.username || 'Бот';
                
                // Зберігаємо власне ім'я
                let tokenNames = {};
                try {
                    const stored = localStorage.getItem('bot_token_names');
                    tokenNames = stored ? JSON.parse(stored) : {};
                } catch (e) {}
                
                tokenNames[token] = botName;
                localStorage.setItem('bot_token_names', JSON.stringify(tokenNames));
                
                modal.style.display = 'none';
                // Включаємо кнопку зберегти одразу
                if (saveBtn) {
                    saveBtn.disabled = false;
                }
                updateBotsMenu();
                showStep(5);
                loadAllChatsForStep5();
            };
            
            // Очищуємо старі обробники
            confirmBtn.onclick = null;
            confirmBtn.onclick = handleSave;
            
            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.style.display = 'none';
                    // Включаємо кнопку зберегти одразу
                    if (saveBtn) {
                        saveBtn.disabled = false;
                    }
                    updateBotsMenu();
                    showStep(5);
                    loadAllChatsForStep5();
                };
            }
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                }
            }, { once: true });
        }

        function saveDefaultBotName(token, botInfo) {
            let tokenNames = {};
            try {
                const stored = localStorage.getItem('bot_token_names');
                tokenNames = stored ? JSON.parse(stored) : {};
            } catch (e) {}
            
            const botName = botInfo.first_name || botInfo.username || 'Бот';
            tokenNames[token] = botName;
            localStorage.setItem('bot_token_names', JSON.stringify(tokenNames));
            
            updateBotsMenu();
            showStep(5);
            loadAllChatsForStep5();
        }

        saveBtn.addEventListener('click', async () => {
            const t = tokenInput.value.trim();
            const chat = chatInput ? chatInput.value.trim() : '';
            const v = validateToken(t);
            
            if (!v.ok) {
                tokenState.textContent = v.error === 'empty' ? 'Токен порожній' : 'Токен занадто короткий';
                tokenState.style.color = 'var(--danger)';
                showToast(v.error === 'empty' ? 'Токен порожній' : 'Токен занадто короткий', 'error');
                return;
            }
            
            // Показываем loader на кнопке
            saveBtn.disabled = true;
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '⏳';
            saveBtn.style.fontSize = '18px';
            
            try {
                // Проверяем токен через API
                const res = await fetch(`https://api.telegram.org/bot${t}/getMe`);
                const json = await res.json();
                
                if (!json.ok) {
                    let errorMsg = 'Токен невалидний';
                    
                    // Určujeme konkrétní chybu na základě odpovědi
                    if (res.status === 404 || json.description?.includes('Not found')) {
                        errorMsg = 'Токен невалидний - бот не знайдено';
                    } else if (json.description?.includes('Unauthorized')) {
                        errorMsg = 'Токен невалидний - помилка авторизації';
                    } else if (json.description?.includes('Invalid')) {
                        errorMsg = 'Токен невалидний - неправильний формат';
                    } else if (json.description) {
                        errorMsg = 'Помилка: ' + json.description;
                    }
                    
                    tokenState.textContent = errorMsg;
                    tokenState.style.color = 'var(--danger)';
                    showToast(errorMsg, 'error');
                    saveBtn.textContent = originalText;
                    saveBtn.style.fontSize = 'inherit';
                    saveBtn.style.animation = 'none';
                    saveBtn.disabled = false;
                    return;
                }
                
                // Токен валидний - сохраняем бота
                const botInfo = json.result;
                localStorage.setItem('bot_token', t);
                localStorage.setItem('bot_info', JSON.stringify(botInfo));
                localStorage.setItem(`bot_info_${t}`, JSON.stringify(botInfo));
                if (chat) localStorage.setItem('chat_id', chat);
                
                // Обновляем список имен ботов
                let tokenNames = {};
                try {
                    const stored = localStorage.getItem('bot_token_names');
                    tokenNames = stored ? JSON.parse(stored) : {};
                } catch (e) {}
                const botName = botInfo.first_name || botInfo.username || 'Бот';
                tokenNames[t] = botName;
                localStorage.setItem('bot_token_names', JSON.stringify(tokenNames));
                
                // Обновляем меню ботов сразу
                updateBotsMenu();
                
                tokenState.textContent = 'Токен збережено'; 
                tokenState.style.color = 'var(--accent)';
                showToast('Токен збережено', 'success');
                
                saveBtn.textContent = originalText;
                saveBtn.style.fontSize = 'inherit';
                saveBtn.style.animation = 'none';
                
                // Показуємо модаль для введення імені бота
                const newBotNameInput = document.getElementById('new-bot-name-input');
                newBotNameInput.value = botInfo.first_name || botInfo.username || '';
                showBotNameModal(t, botInfo);
                
            } catch (err) {
                tokenState.textContent = 'Помилка мережі: ' + err.message;
                tokenState.style.color = 'var(--danger)';
                showToast('Помилка мережі: ' + err.message, 'error');
                saveBtn.textContent = originalText;
                saveBtn.style.fontSize = 'inherit';
                saveBtn.style.animation = 'none';
                saveBtn.disabled = false;
            }
        });

        // Step 5: Chat Interface - Telegram-like
        let currentChatId = null;
        let allChatsData = new Map();
        let chatUpdates = {};
        let pollInterval = null;
        let chatsRefreshInterval = null;
        let usersCache = {};

        function updateCurrentBotName() {
            const token = localStorage.getItem('bot_token');
            let tokenNames = {};
            try {
                const stored = localStorage.getItem('bot_token_names');
                tokenNames = stored ? JSON.parse(stored) : {};
            } catch (e) { }
            const botName = tokenNames[token] || 'Бот';
            const botNameEl = document.getElementById('current-bot-name');
            if (botNameEl) {
                botNameEl.textContent = botName;
            }
            
            // Инициализируем avatar с инициалами по умолчанию
            const botAvatarEl = document.getElementById('bot-avatar');
            if (botAvatarEl) {
                botAvatarEl.textContent = getInitials(botName);
            }

            // Завантажуємо фото бота та роблемо аватарку кліклива
            if (botAvatarEl && token) {
                try {
                    const botInfoStr = localStorage.getItem('bot_info');
                    const botInfo = botInfoStr ? JSON.parse(botInfoStr) : null;
                    if (botInfo && botInfo.id) {
                        const botInfoName = botInfo.first_name || botInfo.username || 'Бот';
                        loadBotPhoto(botInfo.id, token, botAvatarEl, botInfoName);
                        
                        // Видаляємо старих listener
                        botAvatarEl.removeEventListener('click', botAvatarClickHandler);
                        botAvatarEl.removeEventListener('mouseover', botAvatarHoverHandler);
                        botAvatarEl.removeEventListener('mouseout', botAvatarOutHandler);
                        
                        // Додаємо нові обробники
                        botAvatarEl.addEventListener('click', botAvatarClickHandler);
                        botAvatarEl.addEventListener('mouseover', botAvatarHoverHandler);
                        botAvatarEl.addEventListener('mouseout', botAvatarOutHandler);
                    }
                } catch (e) {
                    console.error('Помилка при завантаженні фото бота:', e);
                }
            }
        }

        // Обробники для аватари
        function botAvatarClickHandler() {
            showBotProfile();
        }

        function botAvatarHoverHandler() {
            const avatar = document.getElementById('bot-avatar');
            if (avatar) {
                avatar.style.transform = 'scale(1.1)';
                avatar.style.boxShadow = '0 6px 16px rgba(108,92,231,0.3)';
            }
        }

        function botAvatarOutHandler() {
            const avatar = document.getElementById('bot-avatar');
            if (avatar) {
                avatar.style.transform = 'scale(1)';
                avatar.style.boxShadow = 'none';
            }
        }

        function loadAllChatsForStep5() {
            const token = localStorage.getItem('bot_token');
            if (!token) {
                showToast('Токен не знайдено', 'error');
                return;
            }

            // Оновлюємо назву поточного бота
            updateCurrentBotName();
            
            // Оновлюємо список ботів у dropdown
            updateBotsMenu();

            const chatsList = document.getElementById('chats-list');
            chatsList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">Завантаження...</div>';

            fetch(`https://api.telegram.org/bot${token}/getUpdates`)
                .then(r => r.json())
                .then(json => {
                    if (!json.ok || !json.result) return;

                    const chats = new Map();

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

                    if (chats.size === 0) {
                        chatsList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:15px;">📭 Вашому боту еще ніхто не писав</div>';
                        return;
                    }

                    allChatsData = chats;
                    const chatsArray = Array.from(chats.values());
                    displayChatsList(chatsArray);
                })
                .catch(err => {
                    chatsList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger)">Помилка завантаження</div>';
                    console.error(err);
                });

            // Запускаємо полинг для нових чатов
            startChatsRefresh();
        }

        function displayChatsList(chats) {
            const chatsList = document.getElementById('chats-list');
            chatsList.innerHTML = '';

            // Сортуємо за часом останнього повідомлення
            chats.sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0));

            const token = localStorage.getItem('bot_token');

            chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-list-item';
                chatItem.dataset.chatId = chat.id;

                const avatar = document.createElement('div');
                avatar.className = 'chat-avatar';
                avatar.textContent = getInitials(chat.title || chat.firstName || 'U');
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';

                // Завантажуємо фото
                if (chat.userId && chat.type === 'private' && token) {
                    // Для приватних чатів - фото користувача
                    loadUserPhoto(chat.userId, token, avatar);
                } else if ((chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') && token) {
                    // Для груп и каналів - фото чату
                    loadChatPhoto(chat.id, token, avatar);
                }

                const info = document.createElement('div');
                info.className = 'chat-item-info';

                const name = document.createElement('div');
                name.className = 'chat-item-name';
                name.textContent = chat.title || chat.firstName || `Чат ${chat.id}`;

                const preview = document.createElement('div');
                preview.className = 'chat-item-preview';
                preview.textContent = chat.lastMessage ? chat.lastMessage.substring(0, 50) : 'Немає повідомлень';

                info.appendChild(name);
                info.appendChild(preview);

                chatItem.appendChild(avatar);
                chatItem.appendChild(info);

                // Обработчик long press để открыть в новой вкладке
                handleChatItemLongPress(chatItem, chat);

                chatsList.appendChild(chatItem);
            });
        }

        function loadChatPhoto(chatId, token, avatarElement) {
            if (!token || !avatarElement) return;

            // Для груп и каналів загружуємо фото чату
            fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`)
                .then(r => r.json())
                .then(json => {
                    if (json.ok && json.result && json.result.photo && json.result.photo.small_file_id) {
                        fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${json.result.photo.small_file_id}`)
                            .then(r => r.json())
                            .then(fileJson => {
                                if (fileJson.ok && fileJson.result && fileJson.result.file_path) {
                                    const photoUrl = `https://api.telegram.org/file/bot${token}/${fileJson.result.file_path}`;
                                    avatarElement.style.backgroundImage = `url('${photoUrl}')`;
                                    avatarElement.textContent = '';
                                }
                            })
                            .catch(err => console.error('Помилка завантаження фото чату:', err));
                    }
                })
                .catch(err => console.error('Помилка отримання інформації чату:', err));
        }

        let photosCache = {};

        function loadUserPhoto(userId, token, avatarElement) {
            if (!token || !avatarElement) return;

            // Проверяем кэш
            if (photosCache[userId]) {
                if (photosCache[userId].photoUrl) {
                    avatarElement.style.backgroundImage = `url('${photosCache[userId].photoUrl}')`;
                    avatarElement.textContent = '';
                }
                return;
            }

            // Отмечаем что пытаемся загрузить
            photosCache[userId] = { loading: true };

            fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${userId}&limit=1`)
                .then(r => r.json())
                .then(json => {
                    if (json.ok && json.result && json.result.total_count > 0) {
                        const photo = json.result.photos[0][0];
                        // Отримуємо URL файлу
                        fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${photo.file_id}`)
                            .then(r => r.json())
                            .then(fileJson => {
                                if (fileJson.ok && fileJson.result && fileJson.result.file_path) {
                                    const photoUrl = `https://api.telegram.org/file/bot${token}/${fileJson.result.file_path}`;
                                    photosCache[userId] = { photoUrl };
                                    avatarElement.style.backgroundImage = `url('${photoUrl}')`;
                                    avatarElement.textContent = '';
                                } else {
                                    photosCache[userId] = { photoUrl: null };
                                }
                            })
                            .catch(err => {
                                console.error('Помилка завантаження файлу:', err);
                                photosCache[userId] = { photoUrl: null };
                            });
                    } else {
                        photosCache[userId] = { photoUrl: null };
                    }
                })
                .catch(err => {
                    console.error('Помилка завантаження фото:', err);
                    photosCache[userId] = { photoUrl: null };
                });
        }

        let botPhotosCache = {};

        function loadBotPhoto(botId, token, avatarElement, botName) {
            if (!token || !avatarElement) return;
            
            const displayName = botName || 'Bot';

            // Проверяем кэш
            if (botPhotosCache[botId]) {
                if (botPhotosCache[botId].photoUrl) {
                    avatarElement.style.backgroundImage = `url('${botPhotosCache[botId].photoUrl}')`;
                    avatarElement.textContent = '';
                } else {
                    // Если фото нет, показываем инициалы
                    avatarElement.style.backgroundImage = '';
                    avatarElement.textContent = getInitials(displayName);
                }
                return;
            }

            // Отмечаем что пытаемся загрузить
            botPhotosCache[botId] = { loading: true };

            fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${botId}&limit=1`)
                .then(r => r.json())
                .then(json => {
                    if (json.ok && json.result && json.result.total_count > 0) {
                        const photo = json.result.photos[0][0];
                        fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${photo.file_id}`)
                            .then(r => r.json())
                            .then(fileJson => {
                                if (fileJson.ok && fileJson.result && fileJson.result.file_path) {
                                    const photoUrl = `https://api.telegram.org/file/bot${token}/${fileJson.result.file_path}`;
                                    botPhotosCache[botId] = { photoUrl };
                                    avatarElement.style.backgroundImage = `url('${photoUrl}')`;
                                    avatarElement.textContent = '';
                                } else {
                                    botPhotosCache[botId] = { photoUrl: null };
                                    avatarElement.style.backgroundImage = '';
                                    avatarElement.textContent = getInitials(displayName);
                                }
                            })
                            .catch(err => {
                                console.error('Помилка завантаження фото бота:', err);
                                botPhotosCache[botId] = { photoUrl: null };
                                avatarElement.style.backgroundImage = '';
                                avatarElement.textContent = getInitials(displayName);
                            });
                    } else {
                        botPhotosCache[botId] = { photoUrl: null };
                        avatarElement.style.backgroundImage = '';
                        avatarElement.textContent = getInitials(displayName);
                    }
                })
                .catch(err => {
                    console.error('Помилка завантаження інформації про бота:', err);
                    botPhotosCache[botId] = { photoUrl: null };
                    avatarElement.style.backgroundImage = '';
                    avatarElement.textContent = getInitials(displayName);
                });
        }

        function escapeHtml(text) {
            if (!text) return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return String(text).replace(/[&<>"']/g, m => map[m]);
        }

        function getInitials(name) {
            if (!name) return 'U';
            return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        }

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
    
