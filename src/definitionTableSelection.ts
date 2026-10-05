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
  // 占用判定必须是大小写不敏感的两种方向：
  // 1) 探针侧 —— candidate 是 sourceName 原样拼出来的（sourceName 不做小写化），
  //    所以探针一律走 toLowerCase()；
  // 2) 种子侧 —— 集合里可能混着 FieldA、P_Set 这类未统一小写的名字。若只把探针
  //    小写化再去 has，只有全小写种子才查得到，混合大小写种子会漏判，于是产出一个与
  //    现有字段仅大小写不同的名字（Excel/表格导出的列名会撞车）。
  // 因此先把种子也统一小写建一份查找表再查。全小写种子下这份查找表与原集合等价，
  // 行为逐字节不变。
  const occupied = new Set<string>();
  for (const name of existingNames) occupied.add(name.toLowerCase());
  let candidate = baseName;
  let suffix = 2;
  while (occupied.has(candidate.toLowerCase())) {
    candidate = `${baseName}_${suffix}`;
    suffix += 1;
  }
  existingNames.add(candidate.toLowerCase());
  return candidate;
}
