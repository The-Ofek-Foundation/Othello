var docWidth, docHeight;
var squareSize, boardWidth, boardHeight;
var dimensions = [8, 8];

var boardui = getElemId("board");
var brush = boardui.getContext("2d");

var board, turnGlobal;

function pageReady() {
	resizeBoard();
	setTimeout(resizeSettingsTable, 0);

	newGame();
}

function resizeBoard() {
	docWidth = getElemWidth(contentWrapper);
	docHeight = getElemHeight(contentWrapper);

	let sizeW = docWidth / dimensions[0] | 0;
	let sizeH = docHeight / dimensions[1] | 0;

	squareSize = sizeW < sizeH ? sizeW:sizeH;
	boardWidth = squareSize * dimensions[0];
	boardHeight = squareSize * dimensions[1];

	setElemWidth(boardui, boardWidth);
	setElemHeight(boardui, boardHeight);
	boardui.setAttribute('width', boardWidth);
	boardui.setAttribute('height', boardHeight);
	setElemStyle(boardui, 'left', (docWidth - boardWidth) / 2 + "px")
	setElemStyle(boardui, 'top', (docHeight - boardHeight) / 2 + "px")

	resizeSettingsTable();
}

function onResize() {
	resizeBoard();
	drawBoard();
}

function newGame() {
	getSettings();
	populateSettingsForm(gameSettings.getSettings());

	board = new Array(dimensions[0]); // -1 = empty, 0 = black, 1 = white
	for (let i = 0; i < board.length; i++) {
		board[i] = new Array(dimensions[1]);
		for (let a = 0; a < board[i].length; a++)
			board[i][a] = -1;
	}
	board[parseInt(dimensions[0] / 2 - 0.5)][parseInt(dimensions[1] / 2 - 0.5)] = 0;
	board[parseInt(dimensions[0] / 2 + 0.5)][parseInt(dimensions[1] / 2 + 0.5)] = 0;
	board[parseInt(dimensions[0] / 2 - 0.5)][parseInt(dimensions[1] / 2 + 0.5)] = 1;
	board[parseInt(dimensions[0] / 2 + 0.5)][parseInt(dimensions[1] / 2 - 0.5)] = 1;

	turnGlobal = 0;

	drawBoard();
}

function getSettings() {
	dimensions = gameSettings.getOrSet('dimensions', [8, 8]);
}

function populateSettingsForm(settings) {
	setInputValue('d-width', settings.dimensions[0]);
	setInputValue('d-height', settings.dimensions[1]);
}

function clearBoard() {
	brush.clearRect(0, 0, boardWidth, boardHeight);
}

function drawGrid() {
	brush.lineWidth = 2;
	brush.strokeStyle = "black";

	brush.beginPath();
	for (let i = 1; i < dimensions[0]; i++) {
		brush.moveTo(i * squareSize, 0);
		brush.lineTo(i * squareSize, boardHeight);
	}
	for (let a = 1; a < dimensions[1]; a++) {
		brush.moveTo(0, a * squareSize);
		brush.lineTo(boardWidth, a * squareSize);
	}
	brush.stroke();
	brush.closePath();
}

function drawPiece(x, y, hover) {
	if (board[x][y] === -1)
		return;
	opacity = hover ? 0.5:1;
	let black = `rgba(0, 0, 0, ${opacity})`;
	let white = `rgba(255, 255, 255, ${opacity})`;
	switch (board[x][y]) {
		case 0: // black
			brush.fillStyle = black;
			brush.strokeStyle = 'transparent';
			break;
		case 1:
			brush.fillStyle = white;
			brush.strokeStyle = black;
			break;
	}
	brush.lineWidth = 4;
	brush.beginPath();
	brush.arc((x + 0.5) * squareSize, (y + 0.5) * squareSize,
		squareSize * 0.5 * 0.6, 0, Math.PI * 2);
	brush.fill();
	brush.stroke();
	brush.closePath();
}

function drawBoard(hoverMove) {
	clearBoard();

	for (var i = 0; i < board.length; i++)
		for (var a = 0; a < board[i].length; a++)
			drawPiece(i, a, false);

	if (hoverMove !== undefined) {
		board[hoverMove[0]][hoverMove[1]] = turnGlobal;
		drawPiece(hoverMove[0], hoverMove[1], true);
		board[hoverMove[0]][hoverMove[1]] = -1;
	}

	drawGrid();
}

function getMove(xloc, yloc) {
	var left = boardui.offsetLeft;
	var top = boardui.offsetTop + contentWrapper.offsetTop;
	if (xloc < left || xloc > left + boardWidth || yloc < top || yloc > boardHeight + top)
		return [-1, -1];
	return [Math.floor((xloc - left) / squareSize), Math.floor((yloc - top) / squareSize)];
}

function legalMove(tboard, x, y) {
	if (tboard[x][y] !== -1)
		return -1;
	return 0;
}

function playMove(tboard, x, y, turn, startWith) {
	tboard[x][y] = turn;
}

function setTurn(newTurn) {
	turnGlobal = newTurn;
	drawBoard();
}

boardui.addEventListener('mousedown', function (e) {
	if (e.which === 3)
		return;
	let move = getMove(e.pageX, e.pageY);
	let legality = legalMove(board, move[0], move[1]);
	if (legality === -1)
		return;

	playMove(board, move[0], move[1], turnGlobal, legality);

	setTurn((turnGlobal + 1) % 2);
});

boardui.addEventListener('mousemove', function (e) {
	if (e.which === 3)
		return;
	let move = getMove(e.pageX, e.pageY);
	if (legalMove(board, move[0], move[1]) === -1)
		return;

	drawBoard(move);
});

