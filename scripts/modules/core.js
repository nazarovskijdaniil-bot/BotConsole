
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
