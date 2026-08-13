export type TableRowSelectionModifiers = {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export type TableRowSelectionResult<Key> = {
  selectedKeys: Key[];
  anchorKey: Key;
};

export function nextTableRowSelection<Key>(
  currentSelection: readonly Key[],
  clickedKey: Key,
  orderedKeys: readonly Key[],
  anchorKey: Key | null | undefined,
  modifiers: TableRowSelectionModifiers = {}
): TableRowSelectionResult<Key> {
  const additive = Boolean(modifiers.ctrlKey || modifiers.metaKey);
  if (modifiers.shiftKey && anchorKey !== null && anchorKey !== undefined) {
    const anchorIndex = orderedKeys.indexOf(anchorKey);
    const clickedIndex = orderedKeys.indexOf(clickedKey);
    if (anchorIndex >= 0 && clickedIndex >= 0) {
      const start = Math.min(anchorIndex, clickedIndex);
      const end = Math.max(anchorIndex, clickedIndex);
      const range = orderedKeys.slice(start, end + 1);
      return {
        selectedKeys: additive
          ? orderedKeys.filter((key) => currentSelection.includes(key) || range.includes(key))
          : [...range],
        anchorKey
      };
    }
  }

  if (additive) {
    const selectedKeys = currentSelection.includes(clickedKey)
      ? currentSelection.filter((key) => key !== clickedKey)
      : orderedKeys.filter((key) => currentSelection.includes(key) || key === clickedKey);
    return { selectedKeys, anchorKey: clickedKey };
  }

  return { selectedKeys: [clickedKey], anchorKey: clickedKey };
}

export function moveSelectedTableRows<Row, Key>(
  rows: readonly Row[],
  selectedKeys: ReadonlySet<Key>,
  keyOf: (row: Row, index: number) => Key,
  direction: -1 | 1,
  canMove: (row: Row, index: number) => boolean = () => true
): Row[] {
  const movedRows = [...rows];
  const selectedAt = (index: number) => selectedKeys.has(keyOf(movedRows[index], index));
  const movableAt = (index: number) => canMove(movedRows[index], index);

  if (direction < 0) {
    for (let index = 1; index < movedRows.length; index += 1) {
      if (selectedAt(index) && movableAt(index) && !selectedAt(index - 1) && movableAt(index - 1)) {
        [movedRows[index - 1], movedRows[index]] = [movedRows[index], movedRows[index - 1]];
      }
    }
  } else {
    for (let index = movedRows.length - 2; index >= 0; index -= 1) {
      if (selectedAt(index) && movableAt(index) && !selectedAt(index + 1) && movableAt(index + 1)) {
        [movedRows[index], movedRows[index + 1]] = [movedRows[index + 1], movedRows[index]];
      }
    }
  }

  return movedRows;
}

export function uniqueCopiedFieldName(sourceName: unknown, existingNames: Set<string>): string {
  const normalizedSource = String(sourceName ?? "").trim() || "field";
  const baseName = `${normalizedSource}_copy`;
  let candidate = baseName;
  let suffix = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${baseName}_${suffix}`;
    suffix += 1;
  }
  existingNames.add(candidate.toLowerCase());
  return candidate;
}
