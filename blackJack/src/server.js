const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let waitingPlayer = null;
let games = {};
let readyPlayers = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    socket.on('joinGame', (name) => {
        socket.username = name;  // ユーザー名を保存

        if (waitingPlayer === null) {
            waitingPlayer = { id: socket.id, name: name, chips: 5 };
            socket.emit('waiting', '他のプレーヤーの参加を待っています');
        } else {
            const gameId = `game-${waitingPlayer.id}-${socket.id}`;
            games[gameId] = {
                player1: waitingPlayer,
                player2: { id: socket.id, name: name, chips: 5 },
                hands: [[], []],
                currentBet: [0, 0],
            };

            io.to(waitingPlayer.id).emit('gameStart', games[gameId]);
            io.to(socket.id).emit('gameStart', games[gameId]);

            waitingPlayer = null;
        }
    });

    socket.on('readyToStart', (hands) => {
        const gameId = getGameIdByPlayerId(socket.id);
        if (gameId) {
            readyPlayers[socket.id] = true;
            games[gameId].hands[socket.id] = hands;

            const game = games[gameId];
            const player1Ready = readyPlayers[game.player1.id];
            const player2Ready = readyPlayers[game.player2.id];

            if (player1Ready && player2Ready) {
                io.to(game.player1.id).emit('bothReady', games[gameId]);
                io.to(game.player2.id).emit('bothReady', games[gameId]);
                delete readyPlayers[game.player1.id];
                delete readyPlayers[game.player2.id];
            } else {
                socket.emit('waiting', '相手が準備完了するのを待っています');
                const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
                //io.to(opponentId).emit('waiting', '相手が準備完了するのを待っています');
            }
        }
    });

    socket.on('bet', (handIndex) => {
        const gameId = getGameIdByPlayerId(socket.id);
        if (gameId) {
            const game = games[gameId];
            game.currentBet[handIndex] += 1;
            const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
            io.to(opponentId).emit('opponentBet', handIndex);
        }
    });

    socket.on('fold', (handIndex) => {
        const gameId = getGameIdByPlayerId(socket.id);
        if (gameId) {
            const game = games[gameId];
            const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
            io.to(opponentId).emit('opponentFold', handIndex);
        }
    });

    socket.on('roundComplete', () => {
        const gameId = getGameIdByPlayerId(socket.id);
        if (gameId) {
            const game = games[gameId];
            // ラウンドの勝敗判定ロジックをここに追加します
            const result = {
                winner: game.player1.id, // 仮にプレイヤー1が勝者とします
                chipsWon: game.currentBet.reduce((a, b) => a + b, 0),
                message: 'ラウンドの勝者が決定しました'
            };
            io.to(game.player1.id).emit('roundResult', result);
            io.to(game.player2.id).emit('roundResult', result);
        }
    });

    socket.on('sendMessage', (message) => {
        const gameId = getGameIdByPlayerId(socket.id);
        if (gameId) {
            const game = games[gameId];
            const sender = socket.username; // ユーザー名を取得
            io.to(game.player1.id).emit('receiveMessage', { sender, message });
            io.to(game.player2.id).emit('receiveMessage', { sender, message });
        }
    });

    socket.on('startGame', () => {
        const gameId = getGameIdByPlayerId(socket.id);
        if (gameId) {
            io.to(gameId).emit('gameStart', games[gameId]);
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        } else {
            const gameId = getGameIdByPlayerId(socket.id);
            if (gameId) {
                const game = games[gameId];
                const opponentId = game.player1.id === socket.id ? game.player2.id : game.player1.id;
                io.to(opponentId).emit('opponentDisconnected');

                delete games[gameId];
            }
        }
    });
});

function getGameIdByPlayerId(playerId) {
    for (let gameId in games) {
        if (games[gameId].player1.id === playerId || games[gameId].player2.id === playerId) {
            return gameId;
        }
    }
    return null;
}

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});