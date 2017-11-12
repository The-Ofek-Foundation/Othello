var docWidth, docHeight;
var squareSize, boardWidth, boardHeight;
var dimensions = [8, 8];
var expansionConstant = 2;
var timeToThink = 10;
var aiTurn = 'first';

var boardui = getElemId("board");
var brush = boardui.getContext("2d");
var analElem = getElemId('anal'), numTrialsElem = getElemId('num-trials');

var board, turnGlobal;
var globalRoot;
var over;

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
	resizeBoard();

	board = new Array(dimensions[0]); // -1 = empty, 0 = black, 1 = white
	for (let i = 0; i < board.length; i++) {
		board[i] = new Array(dimensions[1]);
		for (let a = 0; a < board[i].length; a++)
			board[i][a] = -1;
	}
	board[parseInt(dimensions[0] / 2 - 0.5)][parseInt(dimensions[1] / 2 - 0.5)] = 1;
	board[parseInt(dimensions[0] / 2 + 0.5)][parseInt(dimensions[1] / 2 + 0.5)] = 1;
	board[parseInt(dimensions[0] / 2 - 0.5)][parseInt(dimensions[1] / 2 + 0.5)] = 0;
	board[parseInt(dimensions[0] / 2 + 0.5)][parseInt(dimensions[1] / 2 - 0.5)] = 0;

	turnGlobal = 0;
	over = -2;
	globalRoot = createMctsRoot();

	drawBoard();

	if (over === -2 && aiTurn !== 'null' && ((turnGlobal === 0) === (aiTurn === 'first') || aiTurn === "both"))
		setTimeout(playAiMove, 25);
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

function updateAnalysis() {
	let range = getMctsDepthRange();
	analElem.innerHTML = "Analysis: Depth-" + range[1] + " Result-" +
		range[2] + " Certainty-" + (globalRoot && globalRoot.totalTrials > 0 ?
		(resultCertainty(globalRoot) * 100).toFixed(0):"0") + "%";
	numTrialsElem.innerHTML = "Trials: " + numberWithCommas(globalRoot.totalTrials);
}

function drawBoard(hoverMove) {
	clearBoard();
	updateAnalysis();

	for (let i = 0; i < board.length; i++)
		for (let a = 0; a < board[i].length; a++)
			drawPiece(i, a, false);

	if (hoverMove !== undefined) {
		board[hoverMove[0]][hoverMove[1]] = turnGlobal;
		drawPiece(hoverMove[0], hoverMove[1], true);
		board[hoverMove[0]][hoverMove[1]] = -1;
	}

	drawGrid();
}

function getMove(xloc, yloc) {
	let left = boardui.offsetLeft;
	let top = boardui.offsetTop + contentWrapper.offsetTop;
	if (xloc < left || xloc > left + boardWidth || yloc < top || yloc > boardHeight + top)
		return [-1, -1];
	return [Math.floor((xloc - left) / squareSize), Math.floor((yloc - top) / squareSize)];
}

function moveLegal(tboard, x, y, turn, dx, dy) {
	x += dx;
	y += dy;
	let dissimilarEncounter = false;
	while (x < tboard.length && y < tboard[0].length && x >= 0 && y >= 0) {
		if (tboard[x][y] === -1)
			return false;
		if (tboard[x][y] === turn)
			return dissimilarEncounter;
		dissimilarEncounter = true;
		x += dx;
		y += dy;
	}
	return false;
}

function legalMove(tboard, x, y, turn) {
	if (tboard[x][y] !== -1)
		return -1;
	if (moveLegal(tboard, x, y, turn,  1,  1)) return 0;
	if (moveLegal(tboard, x, y, turn,  1,  0)) return 1;
	if (moveLegal(tboard, x, y, turn,  1, -1)) return 2;
	if (moveLegal(tboard, x, y, turn,  0,  1)) return 3;
	if (moveLegal(tboard, x, y, turn,  0, -1)) return 4;
	if (moveLegal(tboard, x, y, turn, -1,  1)) return 5;
	if (moveLegal(tboard, x, y, turn, -1,  0)) return 6;
	if (moveLegal(tboard, x, y, turn, -1, -1)) return 7;
	return -1;
}

function getLegalMoves(tboard, turn) {
	let legalMoves = [], legality;
	for (let i = 0; i < tboard.length; i++)
		for (let a = 0; a < tboard[0].length; a++) {
			legality = legalMove(tboard, i, a, turn);
			if (legality !== -1)
				legalMoves.push([i, a, legality]);
		}
	return legalMoves;
}

function playMoveD(tboard, x, y, turn, dx, dy) { // D -> dx, dy
	while (true) {
		x += dx;
		y += dy;
		if (tboard[x][y] === turn)
			return;
		tboard[x][y] = turn;
	}
}

function playMove(tboard, x, y, turn, startsWith) {
	tboard[x][y] = turn;
	if (startsWith === 0)
		playMoveD(tboard, x, y, turn,  1,  1);
	if (startsWith === 1
		|| (startsWith < 1 && moveLegal(tboard, x, y, turn,  1,  0)))
		playMoveD(tboard, x, y, turn,  1,  0);
	if (startsWith === 2
		|| (startsWith < 2 && moveLegal(tboard, x, y, turn,  1, -1)))
		playMoveD(tboard, x, y, turn,  1, -1);
	if (startsWith === 3
		|| (startsWith < 3 && moveLegal(tboard, x, y, turn,  0,  1)))
		playMoveD(tboard, x, y, turn,  0,  1);
	if (startsWith === 4
		|| (startsWith < 4 && moveLegal(tboard, x, y, turn,  0, -1)))
		playMoveD(tboard, x, y, turn,  0, -1);
	if (startsWith === 5
		|| (startsWith < 5 && moveLegal(tboard, x, y, turn, -1,  1)))
		playMoveD(tboard, x, y, turn, -1,  1);
	if (startsWith === 6
		|| (startsWith < 6 && moveLegal(tboard, x, y, turn, -1,  0)))
		playMoveD(tboard, x, y, turn, -1,  0);
	if (startsWith === 7
		|| (moveLegal(tboard, x, y, turn, -1, -1)))
		playMoveD(tboard, x, y, turn, -1, -1);
}

function getWinner(tboard) { // -1 tie, 0 black, 1 white
	let count = 0;
	for (let i = 0; i < tboard.length; i++)
		for (let a = 0; a < tboard[0].length; a++)
			if (tboard[i][a] === 0)
				count--;
			else if (tboard[i][a] === 1)
				count++;
	if (count < 0)
		return 0;
	if (count === 0)
		return -1;
	return 1;
}

function setTurn(newTurn, move) {
	turnGlobal = newTurn;

	globalRoot = mctsGetNextRoot(move);
	if (globalRoot)
		globalRoot.parent = null;
	else globalRoot = createMctsRoot();

	let legalMoves = getLegalMoves(board, turnGlobal);
	if (legalMoves.length === 0) {
		turnGlobal = (newTurn + 1) % 2;

		globalRoot = mctsGetNextRoot([-1]);
		if (globalRoot)
			globalRoot.parent = null;
		else globalRoot = createMctsRoot();

		legalMoves = getLegalMoves(board, turnGlobal);
		if (legalMoves.length === 0)
			over = getWinner(board);
	}
	if (over !== -2)
		alert("The game is over, " + over);
	drawBoard();

	if (over === -2 && aiTurn !== 'null' && ((turnGlobal === 0) === (aiTurn === 'first') || aiTurn === "both"))
		setTimeout(playAiMove, 25);
}

function mctsGetNextRoot(move) {
	if (!globalRoot || !globalRoot.children)
		return null;
	if (globalRoot.children.length === 1 && move[0] === -1) // in case of pass
		return globalRoot.children[0];
	for (var i = 0; i < globalRoot.children.length; i++)
		if (globalRoot.children[i].lastMove[0] === move[0] && globalRoot.children[i].lastMove[1] === move[1])
			return globalRoot.children[i];
	return null;
}

function resultCertainty(root) {
	let turn = root.turn, antiturn = (root.turn + 1) % 2;
	if (root.totalTrials > (root.results[0] + root.results[1]) * 2)
		return 1 - (root.results[turn] + root.results[antiturn]) / root.totalTrials;
	else if (root.results[turn] > root.results[antiturn])
		return (root.results[turn] - root.results[antiturn]) / root.totalTrials;
	else if (root.results[turn] < root.results[antiturn])
		return (root.results[antiturn] - root.results[turn]) / root.totalTrials;
	else return 1 - (root.results[turn] + root.results[antiturn]) / root.totalTrials;
}

boardui.addEventListener('mousedown', function (e) {
	if (e.which === 3 || over !== -2)
		return;
	let move = getMove(e.pageX, e.pageY);
	let legality = legalMove(board, move[0], move[1], turnGlobal);
	if (legality === -1)
		return;

	playMove(board, move[0], move[1], turnGlobal, legality);

	setTurn((turnGlobal + 1) % 2, move);
});

boardui.addEventListener('mousemove', function (e) {
	if (e.which === 3 || over !== -2)
		return;
	let move = getMove(e.pageX, e.pageY);
	if (legalMove(board, move[0], move[1], turnGlobal) === -1)
		return;

	drawBoard(move);
});


function playAiMove() {
	runMCTS(timeToThink);
	fpaim();
}

function fpaim() {
	let bestMove = getBestMoveMCTS();
	playMove(board, bestMove[0], bestMove[1], turnGlobal, bestMove[2]);
	setTurn((turnGlobal + 1) % 2, bestMove);
}

function getBestMoveMCTS() {
	let bestChild = mostTriedChild(globalRoot, null);
	if (!bestChild)
		return -1;
	return bestChild.lastMove;
}

function mostTriedChild(root, exclude) {
	let mostTrials = 0, child = null;
	if (!root.children)
		return null;
	if (root.children.length === 1)
		return root.children[0];
	for (let i = 0; i < root.children.length; i++)
		if (root.children[i] !== exclude && root.children[i].totalTrials > mostTrials) {
			mostTrials = root.children[i].totalTrials;
			child = root.children[i];
		}
	return child;
}

function leastTriedChild(root) {
	var leastTrials = root.totalTrials + 1, child = null;
	if (!root.children)
		return null;
	for (var i = 0; i < root.children.length; i++)
		if (root.children[i].totalTrials < leastTrials) {
			leastTrials = root.children[i].totalTrials;
			child = root.children[i];
		}
	return child;
}

function getMctsDepthRange() {
	var root, range = new Array(3);
	for (range[0] = -1, root = globalRoot; root && root.children; range[0]++, root = leastTriedChild(root));
	for (range[1] = -1, root = globalRoot; root && root.children; range[1]++, root = mostTriedChild(root));
	if (globalRoot.totalTrials > (globalRoot.results[0] + globalRoot.results[1]) * 3)
		range[2] = "Tie";
	else if (globalRoot.results[0] > globalRoot.results[1])
		range[2] = "B";
	else if (globalRoot.results[0] < globalRoot.results[1])
		range[2] = "W";
	else range[2] = "Tie";
	return range;
}

function runMCTS(time) {
	// if (!globalRoot)
		globalRoot = createMctsRoot();
	let startTime = new Date().getTime();
	while ((new Date().getTime() - startTime) / 1E3 < time) {
		for (let i = 0; i < 2000; i++)
			globalRoot.chooseChild(boardCopy(board));
		if (globalRoot.children.length < 2)
			return;
	}
	while (globalRoot.totalTrials < dimensions[0] * dimensions[1])
		globalRoot.chooseChild(boardCopy(board));
	console.log("Total Simulations: " + globalRoot.totalTrials);
}

function mctsGetChildren(father, tboard) {
	if (father.gameOver !== -2) {
		console.log("AHHHH");
		return [];
	}

	let legalMoves = getLegalMoves(tboard, father.turn);

	if (legalMoves.length === 0) { // no legal moves
		if (father.lastMove[0] === -1) { // father passed
			father.gameOver = getWinner(tboard);
			return [];
		}
		return [new MctsNode((father.turn + 1) % 2, father, [-1])];
	}

	let children = new Array(legalMoves.length);

	for (let i = 0; i < legalMoves.length; i++)
		children[i] = new MctsNode((father.turn + 1) % 2, father, legalMoves[i]);

	return children; // if ransom is paid
}

function mctsSimulate(father, tboard) {
	let passed = false;

	let legalMoves, turn = father.turn, move;
	// printBoard(tboard);
	while (true) {
		legalMoves = getLegalMoves(tboard, turn);
		if (legalMoves.length === 0) { // no legal moves
			if (passed) {
				// console.log(getWinner(tboard));
				return getWinner(tboard);
			}
			passed = true;
			turn = (turn + 1) % 2;
			continue;
		}
		passed = false;
		move = legalMoves[Math.random() * legalMoves.length | 0];
		playMove(tboard, move[0], move[1], turn, move[2]);
		turn = (turn + 1) % 2;
		// console.log(move);
		// printBoard(tboard);
	}
}

function createMctsRoot() {
	return new MctsNode(turnGlobal, null, []);
}

var DEBUG = false;

class MctsNode {
	constructor(turn, parent, lastMove) {
		this.turn = turn;
		this.parent = parent;
		this.lastMove = lastMove;
		this.results = new Array(2);
		this.results[0] = this.results[1] = 0;
		this.totalTrials = 0;
		this.countUnexplored = 0;
		this.gameOver = -2;
	}

	chooseChild(tboard) {
		if (this.lastMove.length > 0 && this.lastMove[0] !== -1)
			playMove(tboard, this.lastMove[0], this.lastMove[1], this.parent.turn,
				this.lastMove[2]);
		if (DEBUG)
			printBoard(tboard);
		if (this.children === undefined) {
			this.children = mctsGetChildren(this, tboard);
			if (this.gameOver === -2)
				this.countUnexplored = this.children.length;
		}
		if (this.gameOver !== -2)
			this.backPropogate(this.gameOver);
		else {
			let i, unexplored = this.countUnexplored;

			if (unexplored > 0) {
				this.countUnexplored--;
				let ran = Math.floor(Math.random() * unexplored);
				for (i = 0; i < this.children.length; i++)
					if (this.children[i].totalTrials === 0) {
						if (ran === 0) {
							if (this.children[i].lastMove[0] !== -1)
								playMove(tboard, this.children[i].lastMove[0],
									this.children[i].lastMove[1], this.turn,
									this.children[i].lastMove[2]);
							this.children[i].runSimulation(tboard);
							return;
						}
						ran--;
					}
			} else {
				let lt = Math.log(this.totalTrials); // log tries
				let bestChild = this.children[0],
					bestPotential = mctsChildPotential(this.children[0], lt),
					potential;
				for (i = 1; i < this.children.length; i++) {
					potential = mctsChildPotential(this.children[i], lt);
					if (potential > bestPotential) {
						bestPotential = potential;
						bestChild = this.children[i];
					}
				}
				bestChild.chooseChild(tboard);
			}
		}
	}

	runSimulation(tboard) {
		this.backPropogate(mctsSimulate(this, tboard));
	}

	backPropogate(result) {
		this.totalTrials++;
		if (result === -1);
		else this.results[result]++;
		if (this.parent !== null)
			this.parent.backPropogate(result);
	}
}

function mctsChildPotential(child, lt) {
	var w = child.results[(child.turn + 1) % 2];
	var n = child.totalTrials;
	var c = expansionConstant;

	return w / n + c * Math.sqrt(lt / n);
}

function boardCopy(tboard) {
	let newBoard = new Array(tboard.length);
	for (let i = 0; i < newBoard.length; i++) {
		newBoard[i] = new Array(tboard[0].length);
		for (let a = 0; a < newBoard[0].length; a++)
			newBoard[i][a] = tboard[i][a];
	}
	return newBoard;
}

function printBoard(tboard) {
	console.log();
	for (let i = 0; i < tboard[0].length; i++) {
		let str = i + ' ';
		for (let a = 0; a < tboard.length; a++)
			if (tboard[a][i] === -1)
				str += '. ';
			else if (tboard[a][i] === 0)
				str += 'B ';
			else if (tboard[a][i] === 1)
				str += 'W '
		console.log(str);
	}
	console.log();
}

