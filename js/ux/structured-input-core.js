export const SLOT = "□";

function isIdentChar(ch) {
  return /[A-Za-z0-9_.]/.test(ch || "");
}

function findMatchingOpen(text, closeIndex, openChar, closeChar) {
  let depth = 0;

  for (let i = closeIndex; i >= 0; i--) {
    const ch = text[i];

    if (ch === closeChar) depth++;
    else if (ch === openChar) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

export function trailingAtomRange(text, caret) {
  text = String(text);
  let end = Math.max(0, Math.min(caret, text.length));
  let i = end - 1;

  while (i >= 0 && /\s/.test(text[i])) i--;
  if (i < 0) return { start:end, end };

  if (text[i] === ")" || text[i] === "]") {
    const closeChar = text[i];
    const openChar = closeChar === ")" ? "(" : "[";
    const open = findMatchingOpen(text, i, openChar, closeChar);

    if (open >= 0) {
      let start = open;

      // Include a function name immediately before "(...)".
      let j = open - 1;
      while (j >= 0 && /[A-Za-z0-9_]/.test(text[j])) j--;
      if (j < open - 1) start = j + 1;

      return { start, end:i + 1 };
    }
  }

  let start = i;

  while (start >= 0 && isIdentChar(text[start])) start--;

  // Include a unary sign only when it looks attached to the atom.
  if (
    start >= 0 &&
    (text[start] === "-" || text[start] === "+") &&
    (
      start === 0 ||
      /[+\-*/^(,\[]/.test(text[start - 1])
    )
  ) {
    start--;
  }

  return {
    start:start + 1,
    end:i + 1
  };
}

export function fractionTransform(value, start, end) {
  value = String(value);
  start = Number(start);
  end = Number(end);

  const selected = value.slice(start, end);

  if (selected) {
    const insertion = `(${selected})/(${SLOT})`;

    return {
      value:value.slice(0, start) + insertion + value.slice(end),
      selectionStart:start + insertion.indexOf(SLOT),
      selectionEnd:start + insertion.indexOf(SLOT) + 1
    };
  }

  const range = trailingAtomRange(value, start);
  const numerator = value.slice(range.start, range.end) || SLOT;
  const insertion = `(${numerator})/(${SLOT})`;
  const next = value.slice(0, range.start) + insertion + value.slice(start);

  return {
    value:next,
    selectionStart:range.start + insertion.indexOf(SLOT),
    selectionEnd:range.start + insertion.indexOf(SLOT) + 1
  };
}

export function powerTransform(value, start, end) {
  value = String(value);
  const selected = value.slice(start, end);
  const base = selected ? `(${selected})` : "";
  const insertion = `${base}^(${SLOT})`;

  return {
    value:value.slice(0, start) + insertion + value.slice(end),
    selectionStart:start + insertion.indexOf(SLOT),
    selectionEnd:start + insertion.indexOf(SLOT) + 1
  };
}

export function templateTransform(value, start, end, template) {
  value = String(value);
  const selected = value.slice(start, end);

  let insertion = String(template);

  if (selected) {
    const firstSlot = insertion.indexOf(SLOT);

    if (firstSlot >= 0) {
      insertion =
        insertion.slice(0, firstSlot) +
        selected +
        insertion.slice(firstSlot + SLOT.length);
    } else {
      insertion = `${insertion}(${selected})`;
    }
  }

  const nextValue =
    value.slice(0, start) +
    insertion +
    value.slice(end);

  const slotIndex = insertion.indexOf(SLOT);
  const caret =
    start +
    (slotIndex >= 0
      ? slotIndex
      : insertion.length);

  return {
    value:nextValue,
    selectionStart:caret,
    selectionEnd:caret + (slotIndex >= 0 ? 1 : 0)
  };
}

export function findNextSlot(value, caret, direction = 1) {
  value = String(value);

  if (!value.includes(SLOT)) return null;

  if (direction >= 0) {
    const next = value.indexOf(SLOT, Math.max(0, caret));

    if (next >= 0) {
      return { start:next, end:next + 1 };
    }

    const wrapped = value.indexOf(SLOT);
    return wrapped >= 0
      ? { start:wrapped, end:wrapped + 1 }
      : null;
  }

  const left = value.slice(0, Math.max(0, caret - 1));
  const previous = left.lastIndexOf(SLOT);

  if (previous >= 0) {
    return { start:previous, end:previous + 1 };
  }

  const wrapped = value.lastIndexOf(SLOT);
  return wrapped >= 0
    ? { start:wrapped, end:wrapped + 1 }
    : null;
}

export function hasSlots(value) {
  return String(value).includes(SLOT);
}

export function stripEmptySlots(value) {
  return String(value).replaceAll(SLOT, "");
}
