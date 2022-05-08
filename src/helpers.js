//  Lightweight helper functions.
function removeClass(element, className) {
  if (element !== null) {
    const expression = new RegExp(`(?:^|\\s)${className}(?!\\S)`, 'g');
    element.className = element.className.replace(expression, '');
  }
}

function addClass(element, className) {
  if (element !== null) {
    element.className += ` ${className}`;
  }
}
module.exports = {
  removeClass,
  addClass,
};
