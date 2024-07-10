const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    const lobbyContainer = document.getElementById('lobby');
    const setupContainer = document.getElementById('setup');
    const waitingContainer = document.getElementById('waiting');
    const gameContainer = document.getElementById('game');
    const cardContainer = document.getElementById('cards');
    const handContainers = {
        hand1: document.getElementById('hand1Container'),
        hand2: document.getElementById('hand2Container'),
        hand3: document.getElementById('hand3Container'),
        hand4: document.getElementById('hand4Container'),
        hand5: document.getElementById('hand5Container')
    };
    const handSums = {
        hand1: document.getElementById('hand1Sum'),
        hand2: document.getElementById('hand2Sum'),
        hand3: document.getElementById('hand3Sum'),
        hand4: document.getElementById('hand4Sum'),
        hand5: document.getElementById('hand5Sum')
    };

    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const chatMessages = document.getElementById('chatMessages');

    function openModal() {
        const modal = document.getElementById('checkrulesModal');
        //console.log('Opening modal:', modal); // デバッグログ
        modal.style.display = 'block';
    }
    // モーダルを閉じるための関数
    function closeModal() {
        const modal = document.getElementById('checkrulesModal');
        modal.style.display = 'none';
    }
    // ボタンにクリックイベントを追加
    const openModalBtn = document.getElementById('checkrules');
    openModalBtn.addEventListener('click', openModal);
    // 閉じるボタンにクリックイベントを追加
    const closeModalBtn = document.getElementsByClassName('close')[0];
    closeModalBtn.addEventListener('click', closeModal);
    // モーダル外の背景をクリックしても閉じる
    window.addEventListener('click', function (event) {
        const modal = document.getElementById('checkrulesModal');
        if (event.target == modal) {
            closeModal();
        }
    });

    const cardValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', '0', '0'];
    cardValues.forEach(value => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.textContent = value;
        card.dataset.value = value === 'A' ? '1' : value;
        if (['J', 'Q', 'K'].includes(value)) card.dataset.value = '10';
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
            console.log(`Card ${value} selected`);
        });
        cardContainer.appendChild(card);
    });

    Object.keys(handContainers).forEach(hand => {
        document.getElementById(hand).addEventListener('click', () => {
            const selectedCards = document.querySelectorAll('.card.selected');
            if (selectedCards.length === 3) {
                let sum = 0;
                const newCards = [];
                selectedCards.forEach(card => {
                    if (card.textContent === 'A') {
                        const aceValue = prompt('Aを1としてカウントしますか？11としてカウントしますか？(1または11を入力)');
                        card.dataset.value = aceValue === '11' ? '11' : '1';
                    }
                    newCards.push(card);
                    sum += parseInt(card.dataset.value);
                });

                if (sum <= 21) {
                    newCards.forEach(card => {
                        card.classList.remove('selected');
                        handContainers[hand].appendChild(card);
                        console.log(`Card added to ${hand}:`, card.textContent);
                    });
                    updateHandSum(hand);
                } else {
                    alert('選択されたカードの合計が21を超えています。再度選択してください。');
                }
            } else {
                alert('3枚のカードを選択してください');
            }
        });
    });

    function updateHandSum(hand) {
        const cards = Array.from(handContainers[hand].children);
        let sum = 0;
        cards.forEach(card => {
            sum += parseInt(card.dataset.value);
        });
        handSums[hand].textContent = `合計: ${sum}`;
    }

    document.getElementById('startgame').addEventListener('click', () => {
        const name = prompt('名前を入力してください:');
        if (name) {
            console.log(`${name}がゲームに参加しました`);
            socket.emit('joinGame', name);
            socket.on('waiting', (message) => {
                console.log('Waiting for another player...');
                document.getElementById('waitingMessage').textContent = message;
                lobbyContainer.style.display = 'none';
                waitingContainer.style.display = 'block';
            });
        }
    });

    document.getElementById('start').addEventListener('click', () => {
        const handsCompleted = Object.values(handContainers).every(container => container.children.length === 3);
        if (handsCompleted) {
            console.log('Starting game...');
            const hands = {};
            Object.keys(handContainers).forEach(hand => {
                hands[hand] = Array.from(handContainers[hand].children).map(card => card.textContent);
            });
            socket.emit('readyToStart', hands); // ゲーム開始準備完了をサーバーに通知
            socket.on('waiting', (message) => {
                document.getElementById('waitingMessage').textContent = message;
                setupContainer.style.display = 'none';
                waitingContainer.style.display = 'block';
            });
        } else {
            alert('すべてのハンドに3枚のカードを割り当ててください');
        }
    });

    chatSend.addEventListener('click', () => {
        const message = chatInput.value;
        if (message.trim() !== '') {
            socket.emit('sendMessage', message);
            chatInput.value = '';
        }
    });

    socket.on('showdown', (opponentHand) => {
        console.log('対戦結果:', opponentHand);
        // 選択されたハンドを新しい画面に表示
        const yourHandContainer = document.getElementById('yourSelectedHandContainer');
        yourHandContainer.innerHTML = '';
        selectedHand.forEach(cardValue => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.textContent = cardValue;
            yourHandContainer.appendChild(card);
        });
        // 相手のハンドを新しい画面に表示
        const opponentHandContainer = document.getElementById('opponentHandContainer');
        opponentHandContainer.innerHTML = '';
        opponentHand.forEach(cardValue => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.textContent = cardValue;
            opponentHandContainer.appendChild(card);
        });

        // 新しい画面を表示
        document.getElementById('showdown').style.display = 'block';
        document.getElementById('game').style.display = 'none';
    });

    socket.on('gameStart', (gameState) => {
        console.log('ゲームが開始されました:', gameState);
        lobbyContainer.style.display = 'none';
        waitingContainer.style.display = 'none';
        setupContainer.style.display = 'block';
    });

    socket.on('bothReady', (gameState) => {
        console.log('両プレイヤーが準備完了:', gameState);
        const hands = gameState.hands[socket.id];
        if (hands) {
            Object.keys(hands).forEach((hand, index) => {
                const container = handContainers[`hand${index + 1}Container`];
                hands[hand].forEach(cardValue => {
                    const card = document.createElement('div');
                    card.classList.add('card');
                    card.textContent = cardValue;
                    container.appendChild(card);
                });
                updateHandSum(`hand${index + 1}`);
            });
        }
        waitingContainer.style.display = 'none';
        setupContainer.style.display = 'none';
        gameContainer.style.display = 'block';
        displayYourHands();
    });

    socket.on('receiveMessage', ({ sender, message }) => {
        console.log('Received message:', sender, message);
        const messageDiv = document.createElement('div');
        messageDiv.textContent = `${sender}: ${message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    socket.on('updateState', (gameState) => {
        console.log('ゲームの状態が更新されました:', gameState);
    });

    socket.on('opponentDisconnected', () => {
        alert('対戦相手が切断しました。');
        setupContainer.style.display = 'block';
        gameContainer.style.display = 'none';
    });

    // 勝負開始後のゲーム画面ロジック
    const yourHandsContainer = document.getElementById('yourHandsContainer');
    const chipsDisplay = document.getElementById('chips');
    const betButton = document.getElementById('bet');
    const foldButton = document.getElementById('fold');

    let currentHandIndex = 0;
    let chips = 5;
    let opponentFolded = false;

    function displayYourHands() {
        yourHandsContainer.innerHTML = '';
        Object.keys(handContainers).forEach(hand => {
            const handWrapper = document.createElement('div');
            handWrapper.classList.add('handWrapper');

            const handButton = document.createElement('button');
            handButton.textContent = `${hand}`;
            //handButton.id = hand;
            handButton.type = 'button';
            handWrapper.appendChild(handButton);

            const handContainer = document.createElement('div');
            handContainer.classList.add('handContainer');
            handContainers[hand].querySelectorAll('.card').forEach(card => {
                const cardCopy = card.cloneNode(true);
                handContainer.appendChild(cardCopy);
            });
            handWrapper.appendChild(handContainer);

            const handSum = document.createElement('p');
            handSum.textContent = `合計: ${handSums[hand].textContent}`;
            handWrapper.appendChild(handSum);

            yourHandsContainer.appendChild(handWrapper);

            // ハンドボタンにクリックイベントを追加
            handButton.addEventListener('click', () => {
                const selectedHandIndex = hand;  // ハンドの識別子として使用する
                const selectedHandCards = Array.from(handContainers[hand].querySelectorAll('.card'))
                    .map(card => card.textContent);
                console.log(`${hand} のカード情報:`, selectedHandCards);
                if (confirm(`${hand} で勝負しますか？`)) {
                    /*const cardsInHand = Array.from(handContainer.querySelectorAll('.card'));
                    const cardInfo = cardsInHand.map(card => card.textContent);
                    console.log(`${hand} のカード情報:`, cardInfo);*/
                    socket.emit('handSelected', selectedHandIndex, selectedHandCards);
                    console.log('ハンド確定:', selectedHandIndex, selectedHandCards);
                    // 待機画面を表示する
                    waitingContainer.style.display = 'block';
                    gameContainer.style.display = 'none';
                    setupContainer.style.display = 'none';
                    // ここでハンドを確定させる処理を追加する場合はここに記述する
                    // 例: socket.emit('handSelected', selectedHandIndex, cards);
                    /*document.getElementById('hand').addEventListener('click', () => {
                        const selectedHandIndex = currentHandIndex;  // 選択したハンドのインデックス
                        const selectedHand = Object.values(handContainers)[selectedHandIndex].querySelectorAll('.card');
                        const cards = Array.from(selectedHand).map(card => card.textContent);
                        socket.emit('handSelected', selectedHandIndex, cards);
                        console.log('ハンド確定:', selectedHandIndex, cards);

                        // 待機画面を表示する
                        waitingContainer.style.display = 'block';
                        setupContainer.style.display = 'none';
                    });*/

                    /*document.getElementById('hand').addEventListener('click', () => {
                        const selectedHandIndex = currentHandIndex;  // 選択したハンドのインデックス
                        const selectedHand = Object.values(handContainers)[selectedHandIndex].querySelectorAll('.card');
                        const cards = Array.from(selectedHand).map(card => card.textContent);
                        socket.emit('handSelected', selectedHandIndex, cards);
                        console.log('ハンド確定:', selectedHandIndex, cards);
                
                        // 待機画面を表示する
                        waitingContainer.style.display = 'block';
                        setupContainer.style.display = 'none';
                    });*/
                }
            });
        });
    }

    socket.on('bothReady', (gameState) => {
        console.log('両プレイヤーが準備完了:', gameState);
        waitingContainer.style.display = 'none';
        gameContainer.style.display = 'block';
        displayYourHands();
    });

    socket.on('showdown', (opponentHand) => {
        console.log('対戦結果:', opponentHand);
        // 選択されたハンドを新しい画面に表示
        const yourHandContainer = document.getElementById('yourSelectedHandContainer');
        yourHandContainer.innerHTML = '';
        selectedHand.forEach(cardValue => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.textContent = cardValue;
            yourHandContainer.appendChild(card);
        });
        // 相手のハンドを新しい画面に表示
        const opponentHandContainer = document.getElementById('opponentHandContainer');
        opponentHandContainer.innerHTML = '';
        opponentHand.forEach(cardValue => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.textContent = cardValue;
            opponentHandContainer.appendChild(card);
        });

        // 新しい画面を表示
        document.getElementById('showdown').style.display = 'block';
        document.getElementById('game').style.display = 'none';
    });



    betButton.addEventListener('click', () => {
        if (chips > 0) {
            chips -= 1;
            chipsDisplay.textContent = chips;
            socket.emit('bet', currentHandIndex);
            checkRoundCompletion();
        } else {
            alert('これ以上ベットできません');
        }
    });

    foldButton.addEventListener('click', () => {
        socket.emit('fold', currentHandIndex);
        checkRoundCompletion();
    });

    function checkRoundCompletion() {
        if (currentHandIndex < 4) {
            currentHandIndex += 1;
            displayYourHands();
        } else {
            socket.emit('roundComplete');
            alert('全てのラウンドが完了しました。結果を待っています...');
        }
    }

    socket.on('opponentBet', (handIndex) => {
        console.log(`相手がベットしました。ハンド: ${handIndex}`);
    });

    socket.on('opponentFold', (handIndex) => {
        opponentFolded = true;
        console.log(`相手がフォールドしました。ハンド: ${handIndex}`);
    });

    socket.on('roundResult', (result) => {
        if (result.winner === socket.id) {
            chips += result.chipsWon;
        }
        alert(`ラウンドの結果: ${result.message}`);
        chipsDisplay.textContent = chips;
    });
});
