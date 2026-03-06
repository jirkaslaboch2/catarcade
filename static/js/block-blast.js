const boardElement = document.getElementById("board");
const pieceTrayElement = document.getElementById("piece-tray");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const statusMessageElement = document.getElementById("status-message");
const trayStatusElement = document.getElementById("tray-status");
const restartButton = document.getElementById("restart-button");

const BOARD_SIZE = 8;
const BEST_KEY = "block-blast-lite-best";
const COLORS = ["#f6bd60", "#84dcc6", "#ff6f59", "#9b89ff", "#4cc9f0", "#f28482"];

const SHAPES = [
    { name: "Single", cells: [[0, 0]] },
    { name: "Domino", cells: [[0, 0], [1, 0]] },
    { name: "Tall Domino", cells: [[0, 0], [0, 1]] },
    { name: "Triple", cells: [[0, 0], [1, 0], [2, 0]] },
    { name: "Tall Triple", cells: [[0, 0], [0, 1], [0, 2]] },
    { name: "Square", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { name: "L", cells: [[0, 0], [0, 1], [1, 1]] },
    { name: "J", cells: [[1, 0], [1, 1], [0, 1]] },
    { name: "Long Four", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { name: "Tall Four", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { name: "Tee", cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
    { name: "Step", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    { name: "Big L", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { name: "Chunk", cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]] },
];

const state = {
    board: createEmptyBoard(),
    score: 0,
    bestScore: Number.parseInt(window.localStorage.getItem(BEST_KEY) || "0", 10),
    tray: [],
    selectedPieceId: null,
    hoverCell: null,
    gameOver: false,
};

bestScoreElement.textContent = String(state.bestScore);

function createEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function createBoardMarkup() {
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let column = 0; column < BOARD_SIZE; column += 1) {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "board-cell";
            cell.dataset.row = String(row);
            cell.dataset.column = String(column);
            cell.setAttribute("aria-label", `Board cell ${row + 1}, ${column + 1}`);
            fragment.appendChild(cell);
        }
    }

    boardElement.replaceChildren(fragment);
}

function resetGame() {
    state.board = createEmptyBoard();
    state.score = 0;
    state.tray = buildTray();
    state.selectedPieceId = state.tray[0].id;
    state.hoverCell = null;
    state.gameOver = false;
    scoreElement.textContent = "0";
    statusMessageElement.textContent = "Select a piece, then place it on the board.";
    render();
    evaluateGameOver();
}

function buildTray() {
    return Array.from({ length: 3 }, (_, index) => {
        const shape = SHAPES[randomInt(0, SHAPES.length - 1)];
        return {
            id: crypto.randomUUID?.() || `${Date.now()}-${index}-${Math.random()}`,
            name: shape.name,
            cells: shape.cells,
            color: COLORS[randomInt(0, COLORS.length - 1)],
            used: false,
        };
    });
}

function render() {
    renderBoard();
    renderTray();
    trayStatusElement.textContent = `${availablePieces().length} pieces ready`;
}

function renderBoard() {
    const preview = getPreviewData();

    for (const cell of boardElement.children) {
        const row = Number.parseInt(cell.dataset.row, 10);
        const column = Number.parseInt(cell.dataset.column, 10);
        const filled = state.board[row][column];
        const previewState = preview.map.get(`${row},${column}`);

        cell.className = "board-cell";
        cell.style.backgroundColor = filled ? filled : "";

        if (filled) {
            cell.classList.add("filled");
        }

        if (previewState === "valid") {
            cell.classList.add("preview-valid");
        }

        if (previewState === "invalid") {
            cell.classList.add("preview-invalid");
        }
    }
}

function renderTray() {
    pieceTrayElement.replaceChildren();

    for (const piece of state.tray) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "piece-card";
        button.dataset.pieceId = piece.id;

        if (piece.used) {
            button.classList.add("used");
            button.disabled = true;
        }

        if (piece.id === state.selectedPieceId && !piece.used) {
            button.classList.add("selected");
        }

        const preview = buildPiecePreview(piece);
        const label = document.createElement("span");
        label.className = "piece-label";
        label.textContent = piece.name;

        button.append(preview, label);
        pieceTrayElement.appendChild(button);
    }
}

function buildPiecePreview(piece) {
    const wrapper = document.createElement("div");
    wrapper.className = "piece-preview";

    const width = Math.max(...piece.cells.map(([column]) => column)) + 1;
    const height = Math.max(...piece.cells.map(([, row]) => row)) + 1;

    for (let row = 0; row < height; row += 1) {
        const rowElement = document.createElement("div");
        rowElement.className = "piece-preview-row";

        for (let column = 0; column < width; column += 1) {
            const cell = document.createElement("span");
            cell.className = "piece-preview-cell";

            if (piece.cells.some(([pieceColumn, pieceRow]) => pieceColumn === column && pieceRow === row)) {
                cell.classList.add("filled");
                cell.style.backgroundColor = piece.color;
            }

            rowElement.appendChild(cell);
        }

        wrapper.appendChild(rowElement);
    }

    return wrapper;
}

function getSelectedPiece() {
    return state.tray.find((piece) => piece.id === state.selectedPieceId && !piece.used) || null;
}

function availablePieces() {
    return state.tray.filter((piece) => !piece.used);
}

function getPreviewData() {
    const map = new Map();
    const piece = getSelectedPiece();

    if (!piece || !state.hoverCell) {
        return { map };
    }

    const placement = piece.cells.map(([columnOffset, rowOffset]) => [
        state.hoverCell.row + rowOffset,
        state.hoverCell.column + columnOffset,
    ]);
    const valid = canPlacePiece(piece, state.hoverCell.row, state.hoverCell.column);

    for (const [row, column] of placement) {
        if (row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE) {
            map.set(`${row},${column}`, valid ? "valid" : "invalid");
        }
    }

    return { map };
}

function canPlacePiece(piece, startRow, startColumn) {
    return piece.cells.every(([columnOffset, rowOffset]) => {
        const row = startRow + rowOffset;
        const column = startColumn + columnOffset;
        return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE && !state.board[row][column];
    });
}

function placeSelectedPiece(startRow, startColumn) {
    const piece = getSelectedPiece();

    if (!piece || state.gameOver || !canPlacePiece(piece, startRow, startColumn)) {
        statusMessageElement.textContent = "That piece does not fit there.";
        renderBoard();
        return;
    }

    for (const [columnOffset, rowOffset] of piece.cells) {
        const row = startRow + rowOffset;
        const column = startColumn + columnOffset;
        state.board[row][column] = piece.color;
    }

    piece.used = true;
    addScore(piece.cells.length);

    const cleared = clearCompletedLines();

    if (cleared.total > 0) {
        addScore(cleared.total * 10);
        statusMessageElement.textContent = `Cleared ${cleared.total} line${cleared.total === 1 ? "" : "s"}.`;
    } else {
        statusMessageElement.textContent = "Good placement. Keep the board open.";
    }

    if (availablePieces().length === 0) {
        state.tray = buildTray();
        statusMessageElement.textContent = "Fresh tray. Plan two moves ahead.";
    }

    const nextPiece = availablePieces()[0];
    state.selectedPieceId = nextPiece ? nextPiece.id : null;
    state.hoverCell = null;
    render();
    evaluateGameOver();
}

function clearCompletedLines() {
    const rowsToClear = [];
    const columnsToClear = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        if (state.board[row].every(Boolean)) {
            rowsToClear.push(row);
        }
    }

    for (let column = 0; column < BOARD_SIZE; column += 1) {
        let full = true;

        for (let row = 0; row < BOARD_SIZE; row += 1) {
            if (!state.board[row][column]) {
                full = false;
                break;
            }
        }

        if (full) {
            columnsToClear.push(column);
        }
    }

    if (rowsToClear.length === 0 && columnsToClear.length === 0) {
        return { total: 0 };
    }

    const clearedCoordinates = [];

    for (const row of rowsToClear) {
        for (let column = 0; column < BOARD_SIZE; column += 1) {
            state.board[row][column] = null;
            clearedCoordinates.push([row, column]);
        }
    }

    for (const column of columnsToClear) {
        for (let row = 0; row < BOARD_SIZE; row += 1) {
            state.board[row][column] = null;
            clearedCoordinates.push([row, column]);
        }
    }

    flashClearedCells(clearedCoordinates);
    return { total: rowsToClear.length + columnsToClear.length };
}

function flashClearedCells(coordinates) {
    const seen = new Set();

    for (const [row, column] of coordinates) {
        const key = `${row},${column}`;

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        const cell = boardElement.querySelector(`[data-row="${row}"][data-column="${column}"]`);

        if (!cell) {
            continue;
        }

        cell.classList.add("clear-flash");
        window.setTimeout(() => cell.classList.remove("clear-flash"), 220);
    }
}

function addScore(points) {
    state.score += points;
    scoreElement.textContent = String(state.score);

    if (state.score > state.bestScore) {
        state.bestScore = state.score;
        window.localStorage.setItem(BEST_KEY, String(state.bestScore));
        bestScoreElement.textContent = String(state.bestScore);
    }
}

function evaluateGameOver() {
    const stillFits = availablePieces().some((piece) => boardHasFit(piece));

    if (stillFits) {
        return;
    }

    state.gameOver = true;
    state.selectedPieceId = null;
    trayStatusElement.textContent = "No moves left";
    statusMessageElement.textContent = "No pieces fit. Press restart to begin again.";
    renderTray();
}

function boardHasFit(piece) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let column = 0; column < BOARD_SIZE; column += 1) {
            if (canPlacePiece(piece, row, column)) {
                return true;
            }
        }
    }

    return false;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

pieceTrayElement.addEventListener("click", (event) => {
    const button = event.target.closest(".piece-card");

    if (!button) {
        return;
    }

    const piece = state.tray.find((entry) => entry.id === button.dataset.pieceId);

    if (!piece || piece.used || state.gameOver) {
        return;
    }

    state.selectedPieceId = piece.id;
    statusMessageElement.textContent = `${piece.name} selected. Place it on the board.`;
    render();
});

boardElement.addEventListener("pointerover", (event) => {
    const cell = event.target.closest(".board-cell");

    if (!cell) {
        return;
    }

    state.hoverCell = {
        row: Number.parseInt(cell.dataset.row, 10),
        column: Number.parseInt(cell.dataset.column, 10),
    };
    renderBoard();
});

boardElement.addEventListener("pointerleave", () => {
    state.hoverCell = null;
    renderBoard();
});

boardElement.addEventListener("click", (event) => {
    const cell = event.target.closest(".board-cell");

    if (!cell) {
        return;
    }

    placeSelectedPiece(Number.parseInt(cell.dataset.row, 10), Number.parseInt(cell.dataset.column, 10));
});

restartButton.addEventListener("click", resetGame);

window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") {
        resetGame();
    }
});

createBoardMarkup();
resetGame();