interface SearchState {
  rootEl: HTMLElement;
  barEl: HTMLElement;
  inputEl: HTMLInputElement;
  counterEl: HTMLElement;
  caseBtn: HTMLButtonElement;
  matches: Range[];
  currentIndex: number;
  caseSensitive: boolean;
  active: boolean;
  // Last query state — used by refreshSearch to know whether the current
  // selection should be preserved (same query, content changed) or reset
  // (user typed a new query).
  lastQuery: string;
  lastCaseSensitive: boolean;
}

const HIGHLIGHT_NAME = 'md-preview-search';
const HIGHLIGHT_CURRENT_NAME = 'md-preview-search-current';

let state: SearchState | null = null;

interface CssHighlightsRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}

interface CssHighlightsCtor {
  new (...ranges: Range[]): unknown;
}

interface CssGlobal {
  highlights?: CssHighlightsRegistry;
}

declare const Highlight: CssHighlightsCtor | undefined;

function getHighlights(): CssHighlightsRegistry | null {
  const cssGlobal = (typeof CSS !== 'undefined' ? (CSS as unknown as CssGlobal) : undefined);
  return cssGlobal?.highlights ?? null;
}

function supportsHighlightApi(): boolean {
  return getHighlights() !== null && typeof Highlight !== 'undefined';
}

export function initSearch(rootEl: HTMLElement): void {
  if (state) return;

  const barEl = createSearchBar();
  document.body.appendChild(barEl);

  const inputEl = barEl.querySelector<HTMLInputElement>('.search-input')!;
  const counterEl = barEl.querySelector<HTMLElement>('.search-counter')!;
  const caseBtn = barEl.querySelector<HTMLButtonElement>('.search-case-btn')!;
  const prevBtn = barEl.querySelector<HTMLButtonElement>('.search-prev-btn')!;
  const nextBtn = barEl.querySelector<HTMLButtonElement>('.search-next-btn')!;
  const closeBtn = barEl.querySelector<HTMLButtonElement>('.search-close-btn')!;

  state = {
    rootEl,
    barEl,
    inputEl,
    counterEl,
    caseBtn,
    matches: [],
    currentIndex: -1,
    caseSensitive: false,
    active: false,
    lastQuery: '',
    lastCaseSensitive: false,
  };

  window.addEventListener('keydown', (event) => {
    const isFind = (event.metaKey || event.ctrlKey) && event.key === 'f';
    if (isFind) {
      event.preventDefault();
      event.stopPropagation();
      openSearch();
      return;
    }

    if (event.key === 'Escape' && state?.active) {
      event.preventDefault();
      closeSearch();
    }
  });

  inputEl.addEventListener('input', () => {
    runSearch();
  });

  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        goPrev();
      } else {
        goNext();
      }
    }
  });

  caseBtn.addEventListener('click', () => {
    if (!state) return;
    state.caseSensitive = !state.caseSensitive;
    caseBtn.classList.toggle('active', state.caseSensitive);
    runSearch();
  });

  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);
  closeBtn.addEventListener('click', closeSearch);
}

export function refreshSearch(): void {
  if (!state || !state.active) return;
  runSearch();
}

function createSearchBar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'search-bar';
  bar.setAttribute('role', 'search');
  bar.style.display = 'none';
  bar.innerHTML = `
    <input type="text" class="search-input" placeholder="Find in preview" aria-label="Find in preview" />
    <span class="search-counter" aria-live="polite">0/0</span>
    <button type="button" class="search-case-btn" title="Match Case" aria-label="Match Case">Aa</button>
    <button type="button" class="search-prev-btn" title="Previous match (Shift+Enter)" aria-label="Previous match">\u2191</button>
    <button type="button" class="search-next-btn" title="Next match (Enter)" aria-label="Next match">\u2193</button>
    <button type="button" class="search-close-btn" title="Close (Esc)" aria-label="Close">\u2715</button>
  `;
  return bar;
}

function openSearch(): void {
  if (!state) return;
  state.active = true;
  state.barEl.style.display = 'flex';
  state.inputEl.focus();
  state.inputEl.select();
  runSearch();
}

function closeSearch(): void {
  if (!state) return;
  state.active = false;
  state.barEl.style.display = 'none';
  clearHighlights();
  state.matches = [];
  state.currentIndex = -1;
  updateCounter();
}

function runSearch(): void {
  if (!state) return;
  clearHighlights();

  const query = state.inputEl.value;
  if (!query) {
    state.matches = [];
    state.currentIndex = -1;
    state.lastQuery = '';
    state.lastCaseSensitive = state.caseSensitive;
    updateCounter();
    return;
  }

  // Preserve user's navigation position when only the document content changed
  // (same query + same case-sensitivity). On a query change, reset to first match.
  const samePredicate =
    query === state.lastQuery && state.caseSensitive === state.lastCaseSensitive;
  const previousIndex = state.currentIndex;

  state.matches = findMatchRanges(state.rootEl, query, state.caseSensitive);
  state.lastQuery = query;
  state.lastCaseSensitive = state.caseSensitive;

  if (state.matches.length === 0) {
    state.currentIndex = -1;
  } else if (samePredicate && previousIndex >= 0) {
    state.currentIndex = Math.min(previousIndex, state.matches.length - 1);
  } else {
    state.currentIndex = 0;
  }

  applyHighlights();
  // Only scroll on initial open or when user changed the query — don't yank
  // the viewport while user is reading after editing the document.
  revealCurrent(!samePredicate);
  updateCounter();
}

function findMatchRanges(rootEl: HTMLElement, query: string, caseSensitive: boolean): Range[] {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('.search-bar')) return NodeFilter.FILTER_REJECT;
      if (parent.closest('#toolbar')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const needle = caseSensitive ? query : query.toLowerCase();
  if (needle.length === 0) return ranges;

  let current: Node | null = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const haystack = caseSensitive ? textNode.data : textNode.data.toLowerCase();
    let idx = 0;
    while (idx <= haystack.length - needle.length) {
      const found = haystack.indexOf(needle, idx);
      if (found === -1) break;
      const range = document.createRange();
      range.setStart(textNode, found);
      range.setEnd(textNode, found + needle.length);
      ranges.push(range);
      idx = found + needle.length;
    }
    current = walker.nextNode();
  }

  return ranges;
}

function applyHighlights(): void {
  const s = state;
  if (!s) return;
  const highlights = getHighlights();
  if (!highlights || typeof Highlight === 'undefined') {
    console.warn('[Webview] CSS Custom Highlight API not supported; search matches will count but not render.');
    return;
  }

  const allButCurrent = s.matches.filter((_, i) => i !== s.currentIndex);
  const currentRange =
    s.currentIndex >= 0 && s.currentIndex < s.matches.length
      ? [s.matches[s.currentIndex]]
      : [];

  highlights.delete(HIGHLIGHT_NAME);
  highlights.delete(HIGHLIGHT_CURRENT_NAME);

  if (allButCurrent.length > 0) {
    highlights.set(HIGHLIGHT_NAME, new Highlight(...allButCurrent));
  }
  if (currentRange.length > 0) {
    highlights.set(HIGHLIGHT_CURRENT_NAME, new Highlight(...currentRange));
  }
}

function clearHighlights(): void {
  const highlights = getHighlights();
  if (!highlights) return;
  highlights.delete(HIGHLIGHT_NAME);
  highlights.delete(HIGHLIGHT_CURRENT_NAME);
}

function revealCurrent(scroll: boolean = true): void {
  if (!state || state.currentIndex < 0) return;
  const range = state.matches[state.currentIndex];
  if (!range) return;

  applyHighlights();

  if (!scroll) return;

  const rect = range.getBoundingClientRect();
  const outOfView =
    rect.top < 60 || rect.bottom > window.innerHeight - 40;
  if (outOfView) {
    const parent = range.startContainer.parentElement;
    parent?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function goNext(): void {
  if (!state || state.matches.length === 0) return;
  state.currentIndex = (state.currentIndex + 1) % state.matches.length;
  revealCurrent();
  updateCounter();
}

function goPrev(): void {
  if (!state || state.matches.length === 0) return;
  state.currentIndex =
    state.currentIndex <= 0 ? state.matches.length - 1 : state.currentIndex - 1;
  revealCurrent();
  updateCounter();
}

function updateCounter(): void {
  if (!state) return;
  const total = state.matches.length;
  const current = state.currentIndex >= 0 ? state.currentIndex + 1 : 0;
  state.counterEl.textContent = `${current}/${total}`;
  if (!supportsHighlightApi() && total > 0) {
    state.counterEl.textContent += ' (unsupported)';
  }
}
