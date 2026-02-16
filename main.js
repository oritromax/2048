  // ===== Tile =====
  function Tile(position, value) {
    this.x                = position.x;
    this.y                = position.y;
    this.value            = value || 2;
    this.previousPosition = null;
    this.mergedFrom       = null;
  }

  Tile.prototype.savePosition = function () {
    this.previousPosition = { x: this.x, y: this.y };
  };

  Tile.prototype.updatePosition = function (position) {
    this.x = position.x;
    this.y = position.y;
  };

  Tile.prototype.serialize = function () {
    return { position: { x: this.x, y: this.y }, value: this.value };
  };

  // ===== Grid =====
  function Grid(size, previousState) {
    this.size = size;
    this.cells = previousState ? this.fromState(previousState) : this.empty();
  }

  Grid.prototype.empty = function () {
    var cells = [];
    for (var x = 0; x < this.size; x++) {
      var row = cells[x] = [];
      for (var y = 0; y < this.size; y++) { row.push(null); }
    }
    return cells;
  };

  Grid.prototype.fromState = function (state) {
    var cells = [];
    for (var x = 0; x < this.size; x++) {
      var row = cells[x] = [];
      for (var y = 0; y < this.size; y++) {
        var tile = state[x][y];
        row.push(tile ? new Tile(tile.position, tile.value) : null);
      }
    }
    return cells;
  };

  Grid.prototype.randomAvailableCell = function () {
    var cells = this.availableCells();
    if (cells.length) return cells[Math.floor(Math.random() * cells.length)];
  };

  Grid.prototype.availableCells = function () {
    var cells = [];
    this.eachCell(function (x, y, tile) { if (!tile) cells.push({ x: x, y: y }); });
    return cells;
  };

  Grid.prototype.eachCell = function (callback) {
    for (var x = 0; x < this.size; x++)
      for (var y = 0; y < this.size; y++)
        callback(x, y, this.cells[x][y]);
  };

  Grid.prototype.cellsAvailable = function () { return !!this.availableCells().length; };
  Grid.prototype.cellAvailable = function (cell) { return !this.cellOccupied(cell); };
  Grid.prototype.cellOccupied = function (cell) { return !!this.cellContent(cell); };

  Grid.prototype.cellContent = function (cell) {
    if (this.withinBounds(cell)) return this.cells[cell.x][cell.y];
    return null;
  };

  Grid.prototype.insertTile = function (tile) { this.cells[tile.x][tile.y] = tile; };
  Grid.prototype.removeTile = function (tile) { this.cells[tile.x][tile.y] = null; };

  Grid.prototype.withinBounds = function (position) {
    return position.x >= 0 && position.x < this.size &&
           position.y >= 0 && position.y < this.size;
  };

  Grid.prototype.serialize = function () {
    var cellState = [];
    for (var x = 0; x < this.size; x++) {
      var row = cellState[x] = [];
      for (var y = 0; y < this.size; y++)
        row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
    }
    return { size: this.size, cells: cellState };
  };

  // ===== Local Storage Manager =====
  window.fakeStorage = {
    _data: {},
    setItem: function (id, val) { return this._data[id] = String(val); },
    getItem: function (id) { return this._data.hasOwnProperty(id) ? this._data[id] : undefined; },
    removeItem: function (id) { return delete this._data[id]; },
    clear: function () { return this._data = {}; }
  };

  function LocalStorageManager() {
    this.bestScoreKey = "bestScore";
    this.gameStateKey = "gameState";
    var supported = this.localStorageSupported();
    this.storage = supported ? window.localStorage : window.fakeStorage;
  }

  LocalStorageManager.prototype.localStorageSupported = function () {
    var testKey = "test";
    try {
      var storage = window.localStorage;
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return true;
    } catch (error) { return false; }
  };

  LocalStorageManager.prototype.getBestScore = function () { return this.storage.getItem(this.bestScoreKey) || 0; };
  LocalStorageManager.prototype.setBestScore = function (score) { this.storage.setItem(this.bestScoreKey, score); };
  LocalStorageManager.prototype.getGameState = function () {
    var stateJSON = this.storage.getItem(this.gameStateKey);
    return stateJSON ? JSON.parse(stateJSON) : null;
  };
  LocalStorageManager.prototype.setGameState = function (gameState) { this.storage.setItem(this.gameStateKey, JSON.stringify(gameState)); };
  LocalStorageManager.prototype.clearGameState = function () { this.storage.removeItem(this.gameStateKey); };

  // ===== HTML Actuator =====
  function HTMLActuator() {
    this.tileContainer    = document.querySelector(".tile-container");
    this.scoreContainer   = document.querySelector(".score-container");
    this.bestContainer    = document.querySelector(".best-container");
    this.messageContainer = document.querySelector(".game-message");
    this.score = 0;
  }

  HTMLActuator.prototype.actuate = function (grid, metadata) {
    var self = this;
    window.requestAnimationFrame(function () {
      self.clearContainer(self.tileContainer);
      grid.eachCell(function (x, y, tile) { if (tile) self.addTile(tile); });
      self.updateScore(metadata.score);
      self.updateBestScore(metadata.bestScore);
      if (metadata.terminated) {
        if (metadata.over) self.message(false);
        else if (metadata.won) self.message(true);
      }
    });
  };

  HTMLActuator.prototype.continueGame = function () { this.clearMessage(); };

  HTMLActuator.prototype.clearContainer = function (container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  };

  HTMLActuator.prototype.addTile = function (tile) {
    var self = this;
    var wrapper   = document.createElement("div");
    var inner     = document.createElement("div");
    var position  = tile.previousPosition || { x: tile.x, y: tile.y };
    var positionClass = this.positionClass(position);
    var classes = ["tile", "tile-" + tile.value, positionClass];

    if (tile.value > 2048) classes.push("tile-super");
    this.applyClasses(wrapper, classes);
    inner.classList.add("tile-inner");
    inner.textContent = tile.value;

    if (tile.previousPosition) {
      window.requestAnimationFrame(function () {
        classes[2] = self.positionClass({ x: tile.x, y: tile.y });
        self.applyClasses(wrapper, classes);
      });
    } else if (tile.mergedFrom) {
      classes.push("tile-merged");
      this.applyClasses(wrapper, classes);
      tile.mergedFrom.forEach(function (merged) { self.addTile(merged); });
    } else {
      classes.push("tile-new");
      this.applyClasses(wrapper, classes);
    }

    wrapper.appendChild(inner);
    this.tileContainer.appendChild(wrapper);
  };

  HTMLActuator.prototype.applyClasses = function (element, classes) {
    element.setAttribute("class", classes.join(" "));
  };

  HTMLActuator.prototype.normalizePosition = function (position) {
    return { x: position.x + 1, y: position.y + 1 };
  };

  HTMLActuator.prototype.positionClass = function (position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
  };

  HTMLActuator.prototype.updateScore = function (score) {
    this.clearContainer(this.scoreContainer);
    var difference = score - this.score;
    this.score = score;
    this.scoreContainer.textContent = this.score;
    if (difference > 0) {
      var addition = document.createElement("div");
      addition.classList.add("score-addition");
      addition.textContent = "+" + difference;
      this.scoreContainer.appendChild(addition);
    }
  };

  HTMLActuator.prototype.updateBestScore = function (bestScore) {
    this.bestContainer.textContent = bestScore;
  };

  HTMLActuator.prototype.message = function (won) {
    var type    = won ? "game-won" : "game-over";
    var message = won ? "You win!" : "Game over!";
    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;
  };

  HTMLActuator.prototype.clearMessage = function () {
    this.messageContainer.classList.remove("game-won");
    this.messageContainer.classList.remove("game-over");
  };

  // ===== Keyboard Input Manager =====
  function KeyboardInputManager() {
    this.events = {};
    if (window.navigator.msPointerEnabled) {
      this.eventTouchstart = "MSPointerDown";
      this.eventTouchmove  = "MSPointerMove";
      this.eventTouchend   = "MSPointerUp";
    } else {
      this.eventTouchstart = "touchstart";
      this.eventTouchmove  = "touchmove";
      this.eventTouchend   = "touchend";
    }
    this.listen();
  }

  KeyboardInputManager.prototype.on = function (event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  };

  KeyboardInputManager.prototype.emit = function (event, data) {
    var callbacks = this.events[event];
    if (callbacks) callbacks.forEach(function (callback) { callback(data); });
  };

  KeyboardInputManager.prototype.listen = function () {
    var self = this;
    var map = {
      38: 0, 39: 1, 40: 2, 37: 3,
      75: 0, 76: 1, 74: 2, 72: 3,
      87: 0, 68: 1, 83: 2, 65: 3
    };

    document.addEventListener("keydown", function (event) {
      var modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
      var mapped = map[event.which];
      if (!modifiers) {
        if (mapped !== undefined) { event.preventDefault(); self.emit("move", mapped); }
      }
      if (!modifiers && event.which === 82) self.restart.call(self, event);
      // Z = undo
      if ((event.ctrlKey || event.metaKey) && event.which === 90) {
        event.preventDefault();
        self.emit("undo");
      }
    });

    this.bindButtonPress(".retry-button", this.restart);
    this.bindButtonPress(".restart-button", this.restart);
    this.bindButtonPress(".keep-playing-button", this.keepPlaying);

    var touchStartClientX, touchStartClientY;
    var gameContainer = document.getElementsByClassName("game-container")[0];

    gameContainer.addEventListener(this.eventTouchstart, function (event) {
      if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
          event.targetTouches > 1) return;
      if (window.navigator.msPointerEnabled) {
        touchStartClientX = event.pageX; touchStartClientY = event.pageY;
      } else {
        touchStartClientX = event.touches[0].clientX; touchStartClientY = event.touches[0].clientY;
      }
      event.preventDefault();
    });

    gameContainer.addEventListener(this.eventTouchmove, function (event) { event.preventDefault(); });

    gameContainer.addEventListener(this.eventTouchend, function (event) {
      // Skip swipe handling when in power-up mode (tile clicks handle it)
      if (gameContainer.classList.contains("swap-mode") ||
          gameContainer.classList.contains("remove-mode")) return;
      if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
          event.targetTouches > 0) return;
      var touchEndClientX, touchEndClientY;
      if (window.navigator.msPointerEnabled) {
        touchEndClientX = event.pageX; touchEndClientY = event.pageY;
      } else {
        touchEndClientX = event.changedTouches[0].clientX;
        touchEndClientY = event.changedTouches[0].clientY;
      }
      var dx = touchEndClientX - touchStartClientX;
      var absDx = Math.abs(dx);
      var dy = touchEndClientY - touchStartClientY;
      var absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) > 10) {
        self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
      }
    });
  };

  KeyboardInputManager.prototype.restart = function (event) { event.preventDefault(); this.emit("restart"); };
  KeyboardInputManager.prototype.keepPlaying = function (event) { event.preventDefault(); this.emit("keepPlaying"); };
  KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
    var button = document.querySelector(selector);
    button.addEventListener("click", fn.bind(this));
    button.addEventListener(this.eventTouchend, fn.bind(this));
  };

  // ===== Game Manager =====
  function GameManager(size, InputManager, Actuator, StorageManager) {
    this.size           = size;
    this.inputManager   = new InputManager;
    this.storageManager = new StorageManager;
    this.actuator       = new Actuator;
    this.startTiles     = 2;
    this.previousState  = null; // For undo

    // Power-up modes
    this.swapMode       = false;
    this.swapFirst      = null;
    this.removeMode     = false;

    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));
    this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
    this.inputManager.on("undo", this.undo.bind(this));

    this.setupPowerButtons();
    this.setupTileClick();
    this.setup();
  }

  GameManager.prototype.restart = function () {
    this.storageManager.clearGameState();
    this.actuator.continueGame();
    this.previousState = null;
    this.cancelModes();
    this.setup();
    this.updateUndoButton();
  };

  GameManager.prototype.keepPlaying = function () {
    this.keepPlayingFlag = true;
    this.actuator.continueGame();
  };

  GameManager.prototype.isGameTerminated = function () {
    return this.over || (this.won && !this.keepPlayingFlag);
  };

  GameManager.prototype.setup = function () {
    var previousState = this.storageManager.getGameState();
    if (previousState) {
      this.grid            = new Grid(previousState.grid.size, previousState.grid.cells);
      this.score           = previousState.score;
      this.over            = previousState.over;
      this.won             = previousState.won;
      this.keepPlayingFlag = previousState.keepPlaying;
    } else {
      this.grid            = new Grid(this.size);
      this.score           = 0;
      this.over            = false;
      this.won             = false;
      this.keepPlayingFlag = false;
      this.addStartTiles();
    }
    this.actuate();
    this.updateUndoButton();
  };

  GameManager.prototype.addStartTiles = function () {
    for (var i = 0; i < this.startTiles; i++) this.addRandomTile();
  };

  GameManager.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
      var value = Math.random() < 0.9 ? 2 : 4;
      var tile = new Tile(this.grid.randomAvailableCell(), value);
      this.grid.insertTile(tile);
    }
  };

  GameManager.prototype.actuate = function () {
    if (this.storageManager.getBestScore() < this.score)
      this.storageManager.setBestScore(this.score);
    if (this.over) this.storageManager.clearGameState();
    else this.storageManager.setGameState(this.serialize());
    this.actuator.actuate(this.grid, {
      score: this.score, over: this.over, won: this.won,
      bestScore: this.storageManager.getBestScore(),
      terminated: this.isGameTerminated()
    });
  };

  GameManager.prototype.serialize = function () {
    return {
      grid: this.grid.serialize(), score: this.score,
      over: this.over, won: this.won, keepPlaying: this.keepPlayingFlag
    };
  };

  // ===== Save/Restore for Undo =====
  GameManager.prototype.saveStateForUndo = function () {
    this.previousState = {
      grid: this.grid.serialize(),
      score: this.score,
      over: this.over,
      won: this.won,
      keepPlaying: this.keepPlayingFlag
    };
    this.updateUndoButton();
  };

  GameManager.prototype.undo = function () {
    if (!this.previousState) return;
    this.cancelModes();
    this.grid            = new Grid(this.previousState.grid.size, this.previousState.grid.cells);
    this.score           = this.previousState.score;
    this.over            = this.previousState.over;
    this.won             = this.previousState.won;
    this.keepPlayingFlag = this.previousState.keepPlaying;
    this.previousState   = null;
    this.actuator.continueGame();
    this.actuate();
    this.updateUndoButton();
  };

  GameManager.prototype.updateUndoButton = function () {
    var btn = document.getElementById("btn-undo");
    if (this.previousState) btn.classList.remove("disabled");
    else btn.classList.add("disabled");
  };

  // ===== Power-up Buttons =====
  GameManager.prototype.setupPowerButtons = function () {
    var self = this;
    document.getElementById("btn-undo").addEventListener("click", function () {
      self.undo();
    });
    document.getElementById("btn-swap").addEventListener("click", function () {
      if (self.isGameTerminated()) return;
      if (self.swapMode) { self.cancelModes(); return; }
      self.cancelModes();
      self.swapMode = true;
      self.swapFirst = null;
      document.getElementById("btn-swap").classList.add("active");
      document.querySelector(".game-container").classList.add("swap-mode");
    });
    document.getElementById("btn-remove").addEventListener("click", function () {
      if (self.isGameTerminated()) return;
      if (self.removeMode) { self.cancelModes(); return; }
      self.cancelModes();
      self.removeMode = true;
      document.getElementById("btn-remove").classList.add("remove-active");
      document.querySelector(".game-container").classList.add("remove-mode");
    });
  };

  GameManager.prototype.cancelModes = function () {
    this.swapMode = false;
    this.swapFirst = null;
    this.removeMode = false;
    document.getElementById("btn-swap").classList.remove("active");
    document.getElementById("btn-remove").classList.remove("remove-active");
    var gc = document.querySelector(".game-container");
    gc.classList.remove("swap-mode");
    gc.classList.remove("remove-mode");
    // Remove highlights
    var highlighted = document.querySelectorAll(".tile-swap-selected, .tile-remove-target");
    highlighted.forEach(function (el) {
      el.classList.remove("tile-swap-selected");
      el.classList.remove("tile-remove-target");
    });
  };

  // ===== Tile Click for Swap/Remove =====
  GameManager.prototype.setupTileClick = function () {
    var self = this;
    // Use game-container for delegation since tile-container children are rebuilt
    var gameContainer = document.querySelector(".game-container");

    // Helper: find which tile was hit from a point
    function getTileAtPoint(clientX, clientY) {
      var gcRect = gameContainer.getBoundingClientRect();
      var padding = 15; // game container padding
      var cellSize = 107;
      var gap = 14; // 121 - 107
      var relX = clientX - gcRect.left - padding;
      var relY = clientY - gcRect.top - padding;

      // Responsive: check if mobile
      if (gcRect.width <= 290) {
        padding = 10;
        cellSize = 58;
        gap = 9; // 67 - 58
        relX = clientX - gcRect.left - padding;
        relY = clientY - gcRect.top - padding;
      }

      var step = cellSize + gap;
      var col = Math.floor(relX / step);
      var row = Math.floor(relY / step);

      if (col < 0 || col > 3 || row < 0 || row > 3) return null;

      // Check click is within the tile area (not in the gap)
      var inCellX = relX - col * step;
      var inCellY = relY - row * step;
      if (inCellX < 0 || inCellX > cellSize || inCellY < 0 || inCellY > cellSize) return null;

      return { x: col, y: row };
    }

    // Helper: find DOM tile element by grid position
    function findTileElement(x, y) {
      var posClass = "tile-position-" + (x + 1) + "-" + (y + 1);
      var all = document.querySelectorAll(".tile." + posClass);
      // Return the last match (topmost tile if stacked from merge)
      return all.length ? all[all.length - 1] : null;
    }

    // Mouse click handler
    gameContainer.addEventListener("click", function (e) {
      if (!self.swapMode && !self.removeMode) return;
      var pos = getTileAtPoint(e.clientX, e.clientY);
      if (!pos) return;
      var tileEl = findTileElement(pos.x, pos.y);
      if (!tileEl) return;
      if (self.swapMode) self.handleSwapClick(pos.x, pos.y, tileEl);
      else if (self.removeMode) self.handleRemoveClick(pos.x, pos.y, tileEl);
    });

    // Touch tap handler (since touchstart preventDefault kills click on touch)
    var tapStartX = 0, tapStartY = 0, tapStartTime = 0;
    gameContainer.addEventListener("touchstart", function (e) {
      if (!self.swapMode && !self.removeMode) return;
      if (e.touches.length === 1) {
        tapStartX = e.touches[0].clientX;
        tapStartY = e.touches[0].clientY;
        tapStartTime = Date.now();
      }
    });
    gameContainer.addEventListener("touchend", function (e) {
      if (!self.swapMode && !self.removeMode) return;
      if (e.changedTouches.length !== 1) return;
      var dx = e.changedTouches[0].clientX - tapStartX;
      var dy = e.changedTouches[0].clientY - tapStartY;
      var elapsed = Date.now() - tapStartTime;
      // Only treat as a tap if short distance and short time
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && elapsed < 400) {
        var pos = getTileAtPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        if (!pos) return;
        var tileEl = findTileElement(pos.x, pos.y);
        if (!tileEl) return;
        e.stopPropagation(); // prevent swipe handler from firing
        if (self.swapMode) self.handleSwapClick(pos.x, pos.y, tileEl);
        else if (self.removeMode) self.handleRemoveClick(pos.x, pos.y, tileEl);
      }
    });
  };

  GameManager.prototype.handleSwapClick = function (x, y, tileEl) {
    var tile = this.grid.cellContent({ x: x, y: y });
    if (!tile) return;

    if (!this.swapFirst) {
      this.swapFirst = { x: x, y: y };
      tileEl.classList.add("tile-swap-selected");
    } else {
      if (this.swapFirst.x === x && this.swapFirst.y === y) {
        this.cancelModes();
        return;
      }
      var tile2 = this.grid.cellContent({ x: x, y: y });
      // Allow swap even if second cell is empty - but we need a tile
      // Both must be tiles for swap
      this.saveStateForUndo();
      var tileA = this.grid.cellContent(this.swapFirst);
      var tileB = tile2;

      // Swap in grid
      this.grid.cells[this.swapFirst.x][this.swapFirst.y] = tileB;
      this.grid.cells[x][y] = tileA;

      if (tileA) { tileA.x = x; tileA.y = y; tileA.previousPosition = null; tileA.mergedFrom = null; }
      if (tileB) { tileB.x = this.swapFirst.x; tileB.y = this.swapFirst.y; tileB.previousPosition = null; tileB.mergedFrom = null; }

      this.cancelModes();
      this.actuate();
    }
  };

  GameManager.prototype.handleRemoveClick = function (x, y, tileEl) {
    var tile = this.grid.cellContent({ x: x, y: y });
    if (!tile) return;

    var targetValue = tile.value;
    this.saveStateForUndo();

    // Highlight all matching tiles briefly, then remove
    var self = this;
    var allTileEls = document.querySelectorAll(".tile");
    var toRemove = [];

    // Find matching tiles in grid
    this.grid.eachCell(function (cx, cy, t) {
      if (t && t.value === targetValue) {
        toRemove.push({ x: cx, y: cy });
      }
    });

    // Highlight matching tile elements
    allTileEls.forEach(function (el) {
      var valMatch = el.className.match(/tile-(\d+)\b/);
      if (valMatch && parseInt(valMatch[1]) === targetValue) {
        // Only highlight top-level positioned tiles (not merged ghosts)
        if (el.className.match(/tile-position-/)) {
          el.classList.add("tile-remove-target");
        }
      }
    });

    // After a short delay, remove them
    setTimeout(function () {
      // Add vanish animation
      allTileEls.forEach(function (el) {
        if (el.classList.contains("tile-remove-target")) {
          el.classList.add("tile-vanishing");
        }
      });

      setTimeout(function () {
        toRemove.forEach(function (pos) {
          self.grid.cells[pos.x][pos.y] = null;
        });

        self.cancelModes();

        // Check game over
        if (!self.movesAvailable()) {
          self.over = true;
        }

        self.actuate();
      }, 200);
    }, 250);
  };

  // ===== Core Game Logic =====
  GameManager.prototype.prepareTiles = function () {
    this.grid.eachCell(function (x, y, tile) {
      if (tile) { tile.mergedFrom = null; tile.savePosition(); }
    });
  };

  GameManager.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  };

  GameManager.prototype.move = function (direction) {
    var self = this;
    if (this.isGameTerminated()) return;

    // Cancel power-up modes on regular move
    if (this.swapMode || this.removeMode) { this.cancelModes(); return; }

    var cell, tile;
    var vector     = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved      = false;

    this.prepareTiles();

    // Save state before move for undo
    var preMoveSerialized = this.serialize();

    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        cell = { x: x, y: y };
        tile = self.grid.cellContent(cell);
        if (tile) {
          var positions = self.findFarthestPosition(cell, vector);
          var next      = self.grid.cellContent(positions.next);
          if (next && next.value === tile.value && !next.mergedFrom) {
            var merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];
            self.grid.insertTile(merged);
            self.grid.removeTile(tile);
            tile.updatePosition(positions.next);
            self.score += merged.value;
            if (merged.value === 2048) self.won = true;
          } else {
            self.moveTile(tile, positions.farthest);
          }
          if (!self.positionsEqual(cell, tile)) moved = true;
        }
      });
    });

    if (moved) {
      // Save undo state (the state BEFORE this move)
      this.previousState = preMoveSerialized;
      this.updateUndoButton();

      this.addRandomTile();
      if (!this.movesAvailable()) this.over = true;
      this.actuate();
    }
  };

  GameManager.prototype.getVector = function (direction) {
    var map = { 0: { x: 0, y: -1 }, 1: { x: 1, y: 0 }, 2: { x: 0, y: 1 }, 3: { x: -1, y: 0 } };
    return map[direction];
  };

  GameManager.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };
    for (var pos = 0; pos < this.size; pos++) { traversals.x.push(pos); traversals.y.push(pos); }
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();
    return traversals;
  };

  GameManager.prototype.findFarthestPosition = function (cell, vector) {
    var previous;
    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));
    return { farthest: previous, next: cell };
  };

  GameManager.prototype.movesAvailable = function () {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
  };

  GameManager.prototype.tileMatchesAvailable = function () {
    var self = this;
    for (var x = 0; x < this.size; x++) {
      for (var y = 0; y < this.size; y++) {
        var tile = this.grid.cellContent({ x: x, y: y });
        if (tile) {
          for (var direction = 0; direction < 4; direction++) {
            var vector = self.getVector(direction);
            var cell   = { x: x + vector.x, y: y + vector.y };
            var other  = self.grid.cellContent(cell);
            if (other && other.value === tile.value) return true;
          }
        }
      }
    }
    return false;
  };

  GameManager.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
  };

  // ===== Dark Mode Toggle =====
  (function() {
    var themeToggle = document.getElementById("theme-toggle");
    var savedTheme = localStorage.getItem("2048-theme");
    if (savedTheme === "dark") document.documentElement.setAttribute("data-theme", "dark");

    themeToggle.addEventListener("click", function() {
      var currentTheme = document.documentElement.getAttribute("data-theme");
      if (currentTheme === "dark") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("2048-theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("2048-theme", "dark");
      }
    });
  })();

  // ===== Initialize Game =====
  new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
