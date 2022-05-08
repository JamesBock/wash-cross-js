/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
/* eslint-disable linebreak-style */
const CellMap = require('./cell-map.js');
const { removeClass, addClass } = require('./helpers');

Array.prototype.equals = function (array) {
  // if the other array is a falsy value, return
  if (!array)
    return false;

  // compare lengths - can save a lot of time 
  if (this.length != array.length)
    return false;

  for (var i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i]))
        return false;
    }
    else if (this[i] != array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });
//  Last element of an array.
function last(arr) {
  return arr.length === 0 ? arr[0] : arr[arr.length - 1];
}

//  Create a single global instance of a cell map.
const cellMap = new CellMap();

const highlights = [[0, 4], [1, 4], [2, 4], [3, 4], [0, 9], [1, 9], [2, 9], [3, 12], [4, 12], [5, 12], [6, 12], [7, 12], [11, 12], [12, 12]];
function CrosswordDOM(window, crossword, parentElement) {
  const { document } = window;
  this.crossword = crossword;
  this.parentElement = parentElement;

  //  Now build the DOM for the crossword.
  const container = document.createElement('div');
  container.className = 'crossword';

  //  Create each cell.
  for (let y = 0; y < crossword.height; y++) {
    const row = document.createElement('div');
    row.className = 'cwrow';
    container.appendChild(row);
    for (let x = 0; x < crossword.width; x++) {
      const cell = crossword.cells[x][y];

      //  Build the cell element and add it to the row.
      const cellElement = this._createCellDOM(document, cell);
      row.appendChild(cellElement);
      if (highlights.some(a => a.equals([x, y]))) {
        addClass(cellElement.children[0], 'highlight');
      }
      //  Update the map of cells
      cellMap.add(cell, cellElement);
    }
  }

  //  For a given crossword object, this function sets the appropriate font
  //  size based on the current crossword size.
  const updateCrosswordFontSize = (crosswordContainer) => {
    //  Get the width of a cell (first child of first row).
    const cellWidth = crosswordContainer.children[0].children[0].clientWidth;
    crosswordContainer.style.fontSize = `${cellWidth * 0.6}px`;
  };

  //  Update the fontsize when the window changes size, add the crossword, set
  //  the correct fontsize right away.
  window.addEventListener('resize', () => updateCrosswordFontSize(container));
  parentElement.appendChild(container);
  updateCrosswordFontSize(container);

  //  Add a helper function to allow the font to be resized programmatically,
  //  useful if something else changes the size of the crossword.
  this.updateFontSize = () => updateCrosswordFontSize(container);

  this.crosswordElement = container;
}

//  Selects a clue.
CrosswordDOM.prototype.selectClue = function selectClue(clue) {
  this.currentClue = clue;
  // Object.entries(clue).map((c) => console.log(`clue ${c}`));
  // clue.map((c) => console.log(`clue ${c}`));
  this._updateDOM();
  cellMap.getCellElement(clue.cells[0]).focus({ preventScroll: true });
  this._stateChange('clueSelected');
};

//  Completely cleans up the crossword.
CrosswordDOM.prototype.destroy = function destroy() {
  //  TODO: we should also clean up the resize listener.
  //  Clear the map, DOM and state change handler.
  cellMap.removeCrosswordCells(this.crossword);
  this.parentElement.removeChild(this.crosswordElement);
  this.onStateChanged = null;
};

//  Sends a state change message.
CrosswordDOM.prototype._stateChange = function _stateChange(message, data) {
  //  TODO: we could probably inherit from EventEmitter as a more standard way
  //  to implement this functionality.
  const eventHandler = this.onStateChanged;
  if (!eventHandler) {
    return;
  }

  //  Send the message.
  eventHandler({
    message,
    data,
  });
};

//  Creates DOM for a cell.
CrosswordDOM.prototype._createCellDOM = function _createCellDOM(document, cell) {
  const self = this;
  const cellElement = document.createElement('div');
  cellElement.className = 'cwcell';
  cell.cellElement = cellElement;

  //  Add a class.
  cellElement.className += cell.light ? ' light' : ' dark';

  //  If the cell is dark, we are done.
  if (!cell.light) {
    return cellElement;
  }

  //  Light cells also need an input.
  const inputElement = document.createElement('input');
  inputElement.maxLength = 1;
  inputElement.type = 'text';
  inputElement.autocomplete = 'new-password';
  if (cell.answer) inputElement.value = cell.answer;
  cellElement.appendChild(inputElement);

  //  We may need to add a clue label.
  if (cell.clueLabel) {
    const clueLabel = document.createElement('div');
    clueLabel.className = 'cwcluelabel';
    clueLabel.innerHTML = cell.clueLabel;
    cellElement.appendChild(clueLabel);
  }

  //  Check to see whether we need to add an across clue answer segment terminator.
  if (cell.acrossTerminator === ',') {
    inputElement.className += ' cw-across-word-separator';
  } else if (cell.acrossTerminator === '-') {
    const acrossTerminator = document.createElement('div');
    acrossTerminator.className = 'cw-across-terminator';
    acrossTerminator.innerHTML = '|';
    cellElement.appendChild(acrossTerminator);
  } else if (cell.downTerminator === ',') {
    inputElement.className += ' cw-down-word-separator';
  } else if (cell.downTerminator === '-') {
    const acrossTerminator = document.createElement('div');
    acrossTerminator.className = 'cw-down-terminator';
    acrossTerminator.innerHTML = '|';
    cellElement.appendChild(acrossTerminator);

  }


  //  Listen for focus events.
  inputElement.addEventListener('focus', (event) => {
    //  Get the cell data.
    const cellElement = event.target.parentNode;
    const cell = cellMap.getCell(cellElement);
    const { crossword } = cell;
    const across = cell.acrossClue;
    const down = cell.downClue;

    //  If we have clicked somewhere which is part of the current clue, we
    //  will not need to change it (we won't toggle either).
    if (self.currentClue
      && (self.currentClue === across
        || self.currentClue === down)) {
      return;
    }

    //  If we have an across clue XOR a down clue, pick the one we have.
    if ((across && !down) || (!across && down)) {
      self.currentClue = across || down;
    } else {
      //  We've got across AND down. If we are moving between clue segments,
      //  prefer to choose the next/previous segment...
      if (across && self.currentClue && (across === self.currentClue.previousClueSegment || across === self.nextClueSegment)) {
        self.currentClue = across;
      } else if (self.currentClue && (down === self.currentClue.previousClueSegment || down === self.nextClueSegment)) {
        self.currentClue = down;
      } else {
        //  ...otherwise, Prefer across, unless we've on the first letter of a down clue only
        self.currentClue = cell.downClueLetterIndex === 0 && cell.acrossClueLetterIndex !== 0 ? down : across;
      }
    }

    //  Update the DOM, inform of state change.
    self._updateDOM();
    self._stateChange('clueSelected');
  });

  //  Listen for keydown events.
  cellElement.addEventListener('keydown', (event) => {

    const eventCell = event.target.parentNode;
    const eventCellCell = cellMap.getCell(eventCell);
    const { crossword } = cell;
    const clue = self.currentClue;

    if (event.keyCode === 8) { // backspace
      //  Blat the contents of the cell. No need to process the backspace.
      event.preventDefault();
      event.target.value = '';
      //  Try and move to the previous cell of the clue.
      const currentIndex = eventCellCell.acrossClue === self.currentClue ? eventCellCell.acrossClueLetterIndex : eventCellCell.downClueLetterIndex;
      const previousIndex = currentIndex - 1;
      if (previousIndex >= 0) {
        self.currentClue.cells[previousIndex].cellElement.querySelector('input').focus({ preventScroll: true });
      }

      //  If the current index is zero, we might need to go to the previous clue
      //  segment (for a non-linear clue).
      if (currentIndex === 0 && self.currentClue.previousClueSegment) {
        last(self.currentClue.previousClueSegment.cells).cellElement.querySelector('input').focus({ preventScroll: true });
        self._updateDOM();
      }
    } else if (event.keyCode === 9) { // tab
      //  We don't want default behaviour.
      event.preventDefault();

      //  Get the cell element and cell data.

      //  Get the next clue.
      const searchClues = clue.across ? crossword.acrossClues : crossword.downClues;
      for (let i = 0; i < searchClues.length; i++) {
        if (clue === searchClues[i]) {
          let newClue = null;
          if (event.shiftKey) {
            if (i > 0) {
              newClue = searchClues[i - 1];
            } else {
              newClue = clue.across ? crossword.downClues[crossword.downClues.length - 1] : crossword.acrossClues[crossword.acrossClues.length - 1];
            }
          } else if (i < (searchClues.length - 1)) {
            newClue = searchClues[i + 1];
          } else {
            newClue = clue.across ? crossword.downClues[0] : crossword.acrossClues[0];
          }
          //  Select the new clue.
          this.currentClue = newClue;
          cellMap.getCellElement(newClue.cells[0]).querySelector('input').focus({ preventScroll: true });
          this._updateDOM();
          self._stateChange('clueSelected');
          break;
        }
      }
    } else if (event.keyCode === 13) { // enter
      //  We don't want default behaviour.
      event.preventDefault();

      //  Get the cell element and cell data.

      //  If we are in a cell with an across clue AND down clue, swap the
      //  selected one.
      if (eventCellCell.acrossClue && eventCellCell.downClue) {
        self.currentClue = eventCellCell.acrossClue === self.currentClue ? eventCellCell.downClue : eventCellCell.acrossClue;
        self._updateDOM();
      }
    }
    if (event.keyCode < 65 || event.keyCode > 90) {
      return;
    }
    //  Move to the next cell in the clue.
    //  No spaces in empty cells.
    if (event.keyCode === 32) {
      event.preventDefault();
    }
    // if (event.target.parentElement.nextElementSibling.children[0]) {
    //   console.log(`has sibling`);
    //   const next = event.target.parentElement.nextElementSibling;
    //   next.children[0].focus();
    // }

    //  Blat current content.
    // event.target.value = '';

    //  Get cell data.

    event.preventDefault();
    //  Sets the letter of a string.
    function setLetter(source, index, newLetter) {
      let sourceNormalised = source === null || source === undefined ? '' : source;
      let result = '';
      while (sourceNormalised.length <= index) sourceNormalised += ' ';
      const seek = Math.max(index, sourceNormalised.length);
      for (let i = 0; i < seek; i++) {
        result += i === index ? newLetter : sourceNormalised[i];
      }
      return result;
    }

    //  We need to update the answer.
    const key = String.fromCharCode(event.keyCode);
    event.target.value = key;
    // if (eventCellCell.acrossClue) eventCellCell.acrossClue.answer = setLetter(eventCellCell.acrossClue.answer, eventCellCell.acrossClueLetterIndex, key);
    // if (eventCellCell.downClue) eventCellCell.downClue.answer = setLetter(eventCellCell.downClue.answer, eventCellCell.downClueLetterIndex, key);
    //  Move to the next eventCellCell in the clue.
    const currentIndex = eventCellCell.acrossClue === clue ? eventCellCell.acrossClueLetterIndex : eventCellCell.downClueLetterIndex;
    const nextIndex = currentIndex + 1;
    if (nextIndex < clue.cells.length) {
      clue.cells[nextIndex].cellElement.querySelector('input').focus({ preventScroll: true });
    }

    //  If we are at the end of the clue and we have a next segment, select it.
    if (nextIndex === clue.cells.length && clue.nextClueSegment) {
      clue.nextClueSegment.cells[0].cellElement.querySelector('input').focus({ preventScroll: true });
    }
    const inputHasValue = (activeCell) => {
      if (activeCell.cellElement) {
        if (activeCell.cellElement.children) {
          if (activeCell.cellElement.children[0]) {

            return (activeCell.cellElement.children[0].value !== '' && activeCell.cellElement.children[0].value !== undefined) || !activeCell.light;
          }
        }
      }
      return true;
    }
    console.log(`this cell has a value: ${inputHasValue(event.target.value)}`);
    console.log(`this cell has a value: ${event.target.value}`);
    // console.log(`this cell has activeCell.light: ${event.target.light}`);
    //TODO:" CHECK IF ALL CELLS HAVE A LETTER IN THEM"
    const allClues = crossword.cells.flatMap(c => c);
    console.log(`zero cell ${allClues[0].cellElement.children[0].value}`);
    if (allClues.every(inputHasValue)) {
      console.log('All cells have a value');
      self._stateChange('finished');
      const containerElement = document.getElementById('container');
      addClass(containerElement, 'finished');
      document.activeElement.blur();
      allClues.forEach((activeCell) => {
        if (activeCell.cellElement) {
          if (activeCell.cellElement.children) {
            if (activeCell.cellElement.children[0]) {
              activeCell.cellElement.children[0].disabled = true;
            }
          }
        }
      })
      // if (highlights.some(a => a.equals([x, y]))) {
      //   console.log('ITS TRUE');
      //   addClass(cellElement, 'highlight');
      // }
    }
    this._updateDOM();
  });

  cellElement.addEventListener('dblclick', (event) => {
    if (event.target) {
      var cellElement = event.target.parentNode;
      var cell = cellMap.getCell(cellElement);

      if (!this.currentClue.across) {
        this.selectClue(cell.acrossClue);
      }
      else {
        this.selectClue(cell.downClue);
      }
    }
  });
  //  Listen for keyup events.
  cellElement.addEventListener('keyup', (event) => {
    // console.log(`event.key ${event.key}`);
    // console.log(`event.code ${event.code}`);
    var cellElement = event.target.parentNode;
    var cell = cellMap.getCell(cellElement);
    var { x, y } = cell;
    var { height } = cell.crossword;


    switch (event.keyCode) {
      case 37: // left
        if (!this.currentClue.across) {
          this.selectClue(cell.acrossClue);
          this._updateDOM();
          break;
        }
        if (cell.x > 0) {
          for (let i = cell.x; i > 0; i--) {
            if (cell.crossword.cells[i - 1][y].light === true) {
              cellMap.getCellElement(cell.crossword.cells[i - 1][y]).querySelector('input').focus({ preventScroll: true });
              this._updateDOM();
              break;
            }
          }
          //  TODO: optimise with children[0]?
        }

        break;
      case 38: // up
        if (this.currentClue.across) {
          if (cell.downClue) {
            this.selectClue(cell.downClue);
            this._updateDOM();
          }
          break;
        }
        //  If we can go up, go up.
        if (cell.y > 0) {
          for (let i = cell.y; i > 0; i--) {
            if (cell.crossword.cells[x][i - 1].light === true) {
              //  TODO: optimise with children[0]?
              // this.selectClue(cell.downClue);
              cellMap.getCellElement(cell.crossword.cells[x][i - 1]).querySelector('input').focus({ preventScroll: true });
              this._updateDOM();
              break;
            }
          }
        }
        break;
      case 39: // right
        if (!this.currentClue.across) {
          this.selectClue(cell.acrossClue);
          this._updateDOM();
          break;
        }
        if (event.target.parentElement.nextElementSibling) {
          const next = event.target.parentElement.nextElementSibling;
          if (next.children[0]) {
            next.children[0].focus({ preventScroll: true });
            this._updateDOM();
            break;
          }
        }
        if (cell.x > 0) {
          for (let i = cell.x; i < height; i++) {
            if (cell.crossword.cells[i + 1][y].light === true) {
              cellMap.getCellElement(cell.crossword.cells[i + 1][y]).querySelector('input').focus({ preventScroll: true });
              this._updateDOM();
              break;
            }
          }
          //  TODO: optimise with children[0]?
        }
        //  If we can go right, go right.
        // if (cell.x + 1 < width && cell.crossword.cells[x + 1][y].light === true) {
        //   //  TODO: optimise with children[0]?
        //   cellMap.getCellElement(cell.crossword.cells[x + 1][y]).querySelector('input').focus();
        // }this._updateDOM();
        break;
      case 40: // down
        if (this.currentClue.across) {
          if (cell.downClue) {
            this.selectClue(cell.downClue);
            this._updateDOM();
          }
          break;
        }
        //  If we can go down, go down.
        // if (cell.y + 1 < height && cell.crossword.cells[x][y + 1].light === true) {
        //   //  TODO: optimise with children[0]?
        //   cellMap.getCellElement(cell.crossword.cells[x][y + 1]).querySelector('input').focus();
        // }
        if (cell.y < height) {
          for (let i = cell.y; i < height; i++) {
            if (cell.crossword.cells[x][i + 1].light === true) {
              cellMap.getCellElement(cell.crossword.cells[x][i + 1]).querySelector('input').focus({ preventScroll: true });
              this._updateDOM();
              break;
            }
          }
          //  TODO: optimise with children[0]?
        }
        break;
      case 9: // tab
        //  TODO
        break;

      //  No action needed for any other keys.
      default:
        break;
    }

  });
  //THIS IS FOR TESTING!!!!!!!!
  // const containerElement = document.getElementById('main-content');
  // addClass(containerElement, 'finished');
  // self._stateChange('finished');
  return cellElement;

};

//  Updates the DOM based on the model, ensuring that the CSS
//  is correct for the state (i.e. the selected clue).
CrosswordDOM.prototype._updateDOM = function _updateDOM() {
  //  TODO: pick a name - active, current or selected.
  const activeClue = this.currentClue;
  const { crossword } = this;

  //  Clear all clue cells.
  crossword.cells.forEach((row) => {
    row.forEach((cell) => {
      if (cell.light) {
        const inputEl = cellMap.getCellElement(cell).querySelector('input');
        removeClass(inputEl, 'active');
        removeClass(inputEl.nextElementSibling, 'white-text');
      }
    });
  });

  //  Highlight the clue cells. 'parentClue' is set if this is the later part of
  //  a non-linear clue.
  const clues = activeClue.parentClue
    ? [activeClue.parentClue].concat(activeClue.parentClue.connectedClues)
    : [activeClue];
  clues.forEach((clue) => {
    clue.cells.forEach((cell) => {
      const inputEl = cellMap.getCellElement(cell).querySelector('input');
      addClass(inputEl, 'active');
      if (inputEl === document.activeElement) {
        addClass(inputEl.nextElementSibling, 'white-text');
      }
    });
  });
};
let timerElement = document.getElementById("timer");
// let buttonElement = document.getElementById("myButton");

// CrosswordDOM.prototype.myTimer = function myTimer() {
//   var current = new Date();
//   timerElement.innerHTML = current.toLocaleTimeString();
// };
const startTime = Date.now();
let startTimer = setInterval(() => {
  const current = new Date();
  let secondsString = '00';
  let minutesString = '00';
  const seconds = Math.round((current - startTime) / 1000) % 60;
  const minutes = (Math.round(((current - startTime) / 1000) / 60)) % 60;
  secondsString = seconds.toString().length > 1 ? seconds.toString() : `0${seconds.toString()}`;
  minutesString = minutes.toString().length > 1 ? minutes.toString() : `0${minutes.toString()}`;
  document.getElementById('timer').innerHTML = `${minutesString}:${secondsString}`;
}, 1000);

CrosswordDOM.prototype.toggle = function toggle() {
  if (startTimer) {
    clearInterval(startTimer);
    startTimer = null;
  } else {
    startTimer = setInterval(() => {
      const current = new Date();
      timerElement.innerHTML = new Date(current.getMilliseconds() - startTime).getMintues();
    }, 1000);
  }

};

module.exports = CrosswordDOM;
