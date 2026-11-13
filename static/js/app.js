/**
 * Timeless Quotes - Vanilla JavaScript Client
 */
document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const quoteCard = document.getElementById("quote-card");
  const quoteText = document.getElementById("quote-text");
  const quoteAuthor = document.getElementById("quote-author");
  const quoteCategory = document.getElementById("quote-category");
  const btnRandom = document.getElementById("btn-random-quote");
  const btnCopy = document.getElementById("btn-copy");

  const searchInput = document.getElementById("search-input");
  const btnClearSearch = document.getElementById("btn-clear-search");
  const categorySelect = document.getElementById("category-select");
  const authorSelect = document.getElementById("author-select");
  const btnResetFilters = document.getElementById("btn-reset-filters");
  const btnRandomFromFilter = document.getElementById("btn-random-from-filter");
  const resultsSummary = document.getElementById("results-summary");

  const quotesGrid = document.getElementById("quotes-grid");
  const emptyState = document.getElementById("empty-state");
  const btnEmptyReset = document.getElementById("btn-empty-reset");

  const statAuthors = document.getElementById("stat-authors");
  const statCategories = document.getElementById("stat-categories");
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-msg");

  // --- App State ---
  let currentQuote = null;
  let currentResults = [];
  let debounceTimer = null;
  let toastTimer = null;

  // --- API Functions ---
  async function apiFetch(endpoint) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      return null;
    }
  }

  // --- Render Featured Quote ---
  function renderFeaturedQuote(quote) {
    if (!quote) return;
    currentQuote = quote;

    // Animation transition
    quoteText.classList.add("updating");
    setTimeout(() => {
      quoteText.textContent = quote.quote;
      quoteAuthor.textContent = `— ${quote.author}`;
      quoteCategory.textContent = quote.category;
      quoteText.classList.remove("updating");
    }, 180);

    // Update active highlight in grid if present
    document.querySelectorAll(".result-card").forEach((card) => {
      if (parseInt(card.dataset.id, 10) === quote.id) {
        card.classList.add("active-featured");
      } else {
        card.classList.remove("active-featured");
      }
    });
  }

  // --- Load Random Quote ---
  async function loadRandomQuote(category = "", author = "") {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (author) params.append("author", author);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const quote = await apiFetch(`/api/quotes/random${queryStr}`);
    if (quote && !quote.error) {
      renderFeaturedQuote(quote);
    } else if (currentResults.length > 0) {
      // Fallback: pick from local results
      const pick = currentResults[Math.floor(Math.random() * currentResults.length)];
      renderFeaturedQuote(pick);
    }
  }

  // --- Render Quotes Grid ---
  function renderQuotesGrid(quotes) {
    quotesGrid.innerHTML = "";

    if (!quotes || quotes.length === 0) {
      emptyState.hidden = false;
      quotesGrid.hidden = true;
      resultsSummary.textContent = "No quotes match your filters";
      return;
    }

    emptyState.hidden = true;
    quotesGrid.hidden = false;

    // Update summary text
    const totalCount = quotes.length;
    resultsSummary.textContent = totalCount === 100 
      ? "Showing all 100 quotes" 
      : `Found ${totalCount} matching ${totalCount === 1 ? "quote" : "quotes"}`;

    const fragment = document.createDocumentFragment();

    quotes.forEach((item) => {
      const card = document.createElement("article");
      card.className = "result-card";
      card.dataset.id = item.id;
      if (currentQuote && currentQuote.id === item.id) {
        card.classList.add("active-featured");
      }

      card.innerHTML = `
        <p class="result-quote-body">“${escapeHtml(item.quote)}”</p>
        <div class="result-footer">
          <span class="result-author">${escapeHtml(item.author)}</span>
          <span class="result-category">${escapeHtml(item.category)}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        renderFeaturedQuote(item);
        quoteCard.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      fragment.appendChild(card);
    });

    quotesGrid.appendChild(fragment);
  }

  // --- Search & Filter Handler ---
  async function applyFilters() {
    const q = searchInput.value.trim();
    const category = categorySelect.value;
    const author = authorSelect.value;

    btnClearSearch.hidden = q.length === 0;

    const params = new URLSearchParams();
    if (q) params.append("q", q);
    if (category) params.append("category", category);
    if (author) params.append("author", author);

    const data = await apiFetch(`/api/quotes?${params.toString()}`);
    if (data && data.quotes) {
      currentResults = data.quotes;
      renderQuotesGrid(currentResults);
    }
  }

  // --- Reset Filters ---
  function resetFilters() {
    searchInput.value = "";
    categorySelect.value = "";
    authorSelect.value = "";
    btnClearSearch.hidden = true;
    applyFilters();
  }

  // --- Show Toast ---
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  // --- Copy Quote to Clipboard ---
  async function copyCurrentQuote() {
    if (!currentQuote) return;
    const textToCopy = `"${currentQuote.quote}" — ${currentQuote.author}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for non-https / older contexts
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      showToast("Quote copied to clipboard!");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      showToast("Unable to copy to clipboard");
    }
  }

  // --- Helper: HTML Escaping ---
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Event Listeners ---
  btnRandom.addEventListener("click", () => {
    loadRandomQuote();
  });

  btnCopy.addEventListener("click", copyCurrentQuote);

  searchInput.addEventListener("input", () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 220);
  });

  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    btnClearSearch.hidden = true;
    applyFilters();
    searchInput.focus();
  });

  categorySelect.addEventListener("change", applyFilters);
  authorSelect.addEventListener("change", applyFilters);
  btnResetFilters.addEventListener("click", resetFilters);
  btnEmptyReset.addEventListener("click", resetFilters);

  btnRandomFromFilter.addEventListener("click", () => {
    if (currentResults.length > 0) {
      const pick = currentResults[Math.floor(Math.random() * currentResults.length)];
      renderFeaturedQuote(pick);
    } else {
      showToast("No quotes in current filter");
    }
  });

  // Spacebar shortcut to roll a new quote
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      loadRandomQuote();
    }
  });

  // --- Initialization ---
  async function init() {
    // 1. Fetch metadata (categories & authors)
    const [categories, authors] = await Promise.all([
      apiFetch("/api/categories"),
      apiFetch("/api/authors"),
    ]);

    if (categories && Array.isArray(categories)) {
      if (statCategories) statCategories.textContent = categories.length;
      categories.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
      });
    }

    if (authors && Array.isArray(authors)) {
      if (statAuthors) statAuthors.textContent = authors.length;
      authors.forEach((auth) => {
        const opt = document.createElement("option");
        opt.value = auth;
        opt.textContent = auth;
        authorSelect.appendChild(opt);
      });
    }

    // 2. Fetch initial random quote
    await loadRandomQuote();

    // 3. Fetch all quotes for the initial grid
    await applyFilters();
  }

  init();
});
