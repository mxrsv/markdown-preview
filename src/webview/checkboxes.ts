interface VsCodeApi {
  postMessage(message: unknown): void;
}

type CheckboxLinesGetter = () => number[];

export function extractCheckboxLines(markdown: string): number[] {
  const lines = markdown.split('\n');
  const result: number[] = [];
  let inFence = false;
  let fenceMarker: string | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const fenceMatch = line.match(/^(\s{0,3})(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[2][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (fenceMarker === marker) {
        inFence = false;
        fenceMarker = null;
      }
      continue;
    }

    if (inFence) continue;

    // Align with Lexical's CHECK_LIST regex (LexicalMarkdown.dev.mjs:902-910):
    //   /^(\s*)(?:-\s)?\s?(\[(\s|x)?\])\s/i
    // Optional dash, optional space inside brackets, case-insensitive x.
    if (/^(\s*)(?:-\s)?\s?\[[\sxX]?\]\s/i.test(line)) {
      result.push(idx);
    }
  }

  return result;
}

/**
 * Attach a delegated click/keyboard handler that toggles task list items.
 *
 * Lexical's native CHECK_LIST transformer renders task list items as
 * `<li role="checkbox" aria-checked="...">`. We intentionally DO NOT mutate
 * the DOM here — Lexical owns the editor root, so any post-hoc mutation would
 * be reverted by its MutationObserver.
 *
 * On click/Space/Enter we look up the line number in the source markdown
 * (via `getCheckboxLines`) and ask the extension host to flip the bracket
 * character. The document change flows back through Lexical's update pipeline.
 */
export function setupCheckboxClickHandler(
  rootEl: HTMLElement,
  vscodeApi: VsCodeApi,
  getCheckboxLines: CheckboxLinesGetter
): void {
  const toggle = (li: HTMLElement) => {
    const checkboxLines = getCheckboxLines();
    const allCheckboxes = Array.from(
      rootEl.querySelectorAll<HTMLElement>('li[role="checkbox"]')
    );
    const index = allCheckboxes.indexOf(li);
    if (index < 0 || index >= checkboxLines.length) return;

    const lineNumber = checkboxLines[index];
    const currentlyChecked = li.getAttribute('aria-checked') === 'true';
    const newChecked = !currentlyChecked;

    vscodeApi.postMessage({
      type: 'toggleCheckbox',
      lineNumber,
      newChecked,
    });
  };

  rootEl.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const li = target.closest('li[role="checkbox"]') as HTMLElement | null;
    if (!li) return;

    // Ignore clicks inside nested children (nested <ul>/<li>, code blocks, etc.)
    // The nearest <li> ancestor of the target must be the checkbox <li> itself.
    const nearestLi = target.closest('li');
    if (nearestLi !== li) return;

    // Only treat click on the checkbox pseudo area (left of text) as a toggle.
    // Use the first line's top to avoid mis-measuring when the <li> is tall
    // (multi-line content or nested bullets).
    const rect = li.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;
    const CHECKBOX_HIT_AREA_X = 24;
    const CHECKBOX_HIT_AREA_Y = 28;
    if (relativeX > CHECKBOX_HIT_AREA_X || relativeY > CHECKBOX_HIT_AREA_Y) return;

    event.preventDefault();
    event.stopPropagation();
    toggle(li);
  });

  rootEl.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    const target = event.target as HTMLElement;
    const li = target.closest('li[role="checkbox"]') as HTMLElement | null;
    if (!li || li !== target) return;

    event.preventDefault();
    event.stopPropagation();
    toggle(li);
  });
}

/**
 * Tag sibling wrapper <li>s that hold a checked task's nested content so CSS
 * can fade them alongside the task title.
 *
 * Lexical's @lexical/list $handleIndent wraps nested lists inside a SIBLING
 * <li> (no role attr), not inside the task's own <li>. CSS descendant cascade
 * therefore can't reach the sub-bullets from the checkbox <li> selector.
 * We walk the DOM after each render and add `.task-done-subtree` to those
 * sibling wrappers.
 *
 * classList mutation is safe: Lexical's MutationObserver watches
 * {childList, subtree, characterData} — attribute changes are not reverted.
 */
export function tagCompletedTaskSubtrees(rootEl: HTMLElement): void {
  rootEl.querySelectorAll('.task-done-subtree').forEach((el) => {
    el.classList.remove('task-done-subtree');
  });

  const checkedTasks = rootEl.querySelectorAll<HTMLElement>(
    'li[role="checkbox"][aria-checked="true"]'
  );
  checkedTasks.forEach((task) => {
    let sibling = task.nextElementSibling;
    while (
      sibling instanceof HTMLElement &&
      sibling.tagName === 'LI' &&
      !sibling.hasAttribute('role')
    ) {
      sibling.classList.add('task-done-subtree');
      sibling = sibling.nextElementSibling;
    }
  });
}

