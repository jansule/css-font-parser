/**
 * @enum {number}
 */
const states = {
  VARIATION: 1,
  LINE_HEIGHT: 2,
  FONT_FAMILY: 3,
  BEFORE_FONT_FAMILY: 4,
  AFTER_OBLIQUE: 5
};

/**
 * Attempt to parse a string as an identifier. Return
 * a normalized identifier, or null when the string
 * contains an invalid identifier.
 *
 * @param {string} str
 * @return {string|null}
 */
function parseIdentifier(str) {
  const identifiers = str.replace(/^\s+|\s+$/, '').replace(/\s+/g, ' ').split(' ');

  for (let i = 0; i < identifiers.length; i += 1) {
    if (/^(?:-?\d|--)/.test(identifiers[i]) ||
        !/^(?:[_a-zA-Z0-9-]|[^\0-\237]|(?:\\[0-9a-f]{1,6}(?:\r\n|[ \n\r\t\f])?|\\[^\n\r\f0-9a-f]))+$/.test(identifiers[i])) {
      return null;
    }
  }
  return identifiers.join(' ');
}

/**
 * @param {string} input
 * @return {Object|null}
 */
function parse(input) {
  let state = states.VARIATION;
  let buffer = '';
  const result = {
    'font-family': []
  };

  for (let c, i = 0; c = input.charAt(i); i += 1) {
    if (state === states.BEFORE_FONT_FAMILY && (c === '"' || c === "'")) {
      let index = i + 1;

      // consume the entire string
      do {
        index = input.indexOf(c, index) + 1;
        if (!index) {
          // If a string is not closed by a ' or " return null.
          return null;
        }
      } while (input.charAt(index - 2) === '\\');

      result['font-family'].push(input.slice(i, index));

      i = index - 1;
      state = states.FONT_FAMILY;
      buffer = '';
    } else if (state === states.FONT_FAMILY && c === ',') {
      state = states.BEFORE_FONT_FAMILY;
      buffer = '';
    } else if (state === states.BEFORE_FONT_FAMILY && c === ',') {
      const identifier = parseIdentifier(buffer);

      if (identifier) {
        result['font-family'].push(identifier);
      }
      buffer = '';
    } else if (state === states.AFTER_OBLIQUE && c === ' ') {
      if (/^(?:\+|-)?(?:[0-9]*\.)?[0-9]+(?:deg|grad|rad|turn)$/.test(buffer)) {
        result['font-style'] += ' ' + buffer;
        buffer = '';
      } else {
        // The 'oblique' token was not followed by an angle.
        // Backtrack to allow the token to be parsed as VARIATION
        i -= 1;
      }
      state = states.VARIATION;
    } else if (state === states.VARIATION && (c === ' ' || c === '/')) {
      if (/^(?:(?:xx|x)-large|(?:xx|s)-small|small|large|medium)$/.test(buffer) ||
          /^(?:larg|small)er$/.test(buffer) ||
          /^(?:\+|-)?(?:[0-9]*\.)?[0-9]+(?:em|ex|ch|rem|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc|%)$/.test(buffer)) {
        state = c === '/' ? states.LINE_HEIGHT : states.BEFORE_FONT_FAMILY;
        result['font-size'] = buffer;
      } else if (/^italic$/.test(buffer)) {
        result['font-style'] = buffer;
      } else if (/^oblique$/.test(buffer)) {
        result['font-style'] = buffer;
        state = states.AFTER_OBLIQUE;
      } else if (/^small-caps$/.test(buffer)) {
        result['font-variant'] = buffer;
      } else if (/^(?:bold(?:er)?|lighter|normal)$/.test(buffer)) {
        result['font-weight'] = buffer;
      } else if (/^[+-]?(?:[0-9]*\.)?[0-9]+(?:e[+-]?(?:0|[1-9][0-9]*))?$/.test(buffer)) {
        const num = parseFloat(buffer);
        if (num >= 1 && num <= 1000) {
          result['font-weight'] = buffer;
        }
      } else if (/^(?:(?:ultra|extra|semi)-)?(?:condensed|expanded)$/.test(buffer)) {
        result['font-stretch'] = buffer;
      }
      buffer = '';
    } else if (state === states.LINE_HEIGHT && c === ' ') {
      if (/^(?:\+|-)?([0-9]*\.)?[0-9]+(?:em|ex|ch|rem|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc|%)?$/.test(buffer)) {
        result['line-height'] = buffer;
      }
      state = states.BEFORE_FONT_FAMILY;
      buffer = '';
    } else {
      buffer += c;
    }
  }

  // This is for the case where a string was specified followed by
  // an identifier, but without a separating comma.
  if (state === states.FONT_FAMILY && !/^\s*$/.test(buffer)) {
    return null;
  }

  if (state === states.BEFORE_FONT_FAMILY) {
    const identifier = parseIdentifier(buffer);

    if (identifier) {
      result['font-family'].push(identifier);
    }
  }

  if (result['font-size'] && result['font-family'].length) {
    return result;
  } else {
    return null;
  }
}

export default parse;
