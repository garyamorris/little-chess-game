const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetButton = document.getElementById('resetButton');

const files = 'abcdefgh';
let selectedSquare = null;
let legalMoves = [];
let currentState = null;

function squareColor(row, col) {
  return (row + col) % 2 === 0 ? 'light' : 'dark';
}

function pieceIcon(piece) {
  if (!piece) return '';
  return {
    wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
    bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
  }[`${piece.color}${piece.type}`] || '';
}

function updateStatus(state) {
  statusEl.textContent = state.status;
}

function renderBoard(state) {
  boardEl.innerHTML = '';
  const board = state.board;

  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `square ${squareColor(rowIndex, colIndex)}`;
      button.dataset.square = cell.square;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${cell.square}${cell.piece ? ` ${cell.piece.color === 'w' ? 'white' : 'black'} ${cell.piece.type}` : ''}`);

      if (selectedSquare === cell.square) {
        button.classList.add('selected');
      }

      const legal = legalMoves.find((move) => move.to === cell.square);
      if (legal) {
        button.classList.add(legal.flags.includes('c') ? 'capture' : 'legal');
      }

      if (cell.piece) {
        button.textContent = pieceIcon(cell.piece);
      }

      const isTop = rowIndex === 0;
      const isLeft = colIndex === 0;
      if (isTop || isLeft) {
        const label = document.createElement('span');
        label.className = 'square-label';
        label.textContent = `${isLeft ? 8 - rowIndex : ''}${isTop ? files[colIndex] : ''}`.trim();
        button.appendChild(label);
      }

      button.addEventListener('click', () => onSquareClick(cell.square, cell.piece));
      boardEl.appendChild(button);
    });
  });
}

async function fetchState() {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error('Failed to load game state');
  currentState = await res.json();
  selectedSquare = null;
  legalMoves = [];
  updateStatus(currentState);
  renderBoard(currentState);
}

async function fetchLegalMoves(square) {
  const res = await fetch(`/api/legal-moves?square=${encodeURIComponent(square)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.moves || [];
}

async function onSquareClick(square, piece) {
  if (!currentState) return;

  if (selectedSquare && square === selectedSquare) {
    selectedSquare = null;
    legalMoves = [];
    renderBoard(currentState);
    return;
  }

  if (selectedSquare && legalMoves.some((move) => move.to === square)) {
    const moveRes = await fetch('/api/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: selectedSquare, to: square }),
    });

    const result = await moveRes.json();
    if (!moveRes.ok) {
      statusEl.textContent = result.error || 'Illegal move.';
      selectedSquare = null;
      legalMoves = [];
      renderBoard(currentState);
      return;
    }

    currentState = result;
    selectedSquare = null;
    legalMoves = [];
    updateStatus(currentState);
    renderBoard(currentState);
    return;
  }

  if (piece) {
    const isWhiteToMove = currentState.turn === 'w';
    const isOwnPiece = piece.color === (isWhiteToMove ? 'w' : 'b');
    if (!isOwnPiece) {
      return;
    }

    selectedSquare = square;
    legalMoves = await fetchLegalMoves(square);
    renderBoard(currentState);
  }
}

resetButton.addEventListener('click', async () => {
  const res = await fetch('/api/reset', { method: 'POST' });
  const data = await res.json();
  currentState = data;
  selectedSquare = null;
  legalMoves = [];
  updateStatus(currentState);
  renderBoard(currentState);
});

fetchState().catch((err) => {
  statusEl.textContent = err.message;
});
