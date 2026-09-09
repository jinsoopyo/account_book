(() => {
  const STORAGE_KEY = 'account-book-transactions';

  const CATEGORIES = {
    expense: [
      { id: 'food', label: '식비', icon: '🍚' },
      { id: 'transport', label: '교통', icon: '🚌' },
      { id: 'shopping', label: '쇼핑', icon: '🛍️' },
      { id: 'housing', label: '주거/통신', icon: '🏠' },
      { id: 'health', label: '의료/건강', icon: '💊' },
      { id: 'culture', label: '문화/여가', icon: '🎬' },
      { id: 'education', label: '교육', icon: '📚' },
      { id: 'etc-expense', label: '기타', icon: '📦' },
    ],
    income: [
      { id: 'salary', label: '급여', icon: '💼' },
      { id: 'bonus', label: '보너스', icon: '🎁' },
      { id: 'sidejob', label: '부수입', icon: '💻' },
      { id: 'etc-income', label: '기타', icon: '💰' },
    ],
  };

  const $ = (sel) => document.querySelector(sel);

  const form = $('#txForm');
  const dateInput = $('#date');
  const categorySelect = $('#category');
  const amountInput = $('#amount');
  const memoInput = $('#memo');
  const typeButtons = document.querySelectorAll('.type-btn');
  const txList = $('#txList');
  const emptyMsg = $('#emptyMsg');
  const totalIncomeEl = $('#totalIncome');
  const totalExpenseEl = $('#totalExpense');
  const totalBalanceEl = $('#totalBalance');
  const currentMonthEl = $('#currentMonth');
  const prevMonthBtn = $('#prevMonth');
  const nextMonthBtn = $('#nextMonth');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const toast = $('#toast');

  let currentType = 'expense';
  let currentFilter = 'all';
  let viewDate = new Date();
  viewDate.setDate(1);

  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('failed to load transactions', e);
      return [];
    }
  }

  function saveTransactions(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  let transactions = loadTransactions();

  function formatWon(n) {
    return n.toLocaleString('ko-KR') + '원';
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function populateCategories() {
    categorySelect.innerHTML = '';
    CATEGORIES[currentType].forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.icon} ${cat.label}`;
      categorySelect.appendChild(opt);
    });
  }

  function setType(type) {
    currentType = type;
    typeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    populateCategories();
  }

  function findCategory(type, id) {
    return CATEGORIES[type].find((c) => c.id === id) || { label: id, icon: '❓' };
  }

  function updateMonthLabel() {
    currentMonthEl.textContent = `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`;
  }

  function getMonthTransactions() {
    const key = monthKey(viewDate);
    return transactions.filter((tx) => tx.date.startsWith(key));
  }

  function getFilteredTransactions() {
    const monthTx = getMonthTransactions();
    if (currentFilter === 'all') return monthTx;
    return monthTx.filter((tx) => tx.type === currentFilter);
  }

  function renderSummary() {
    const monthTx = getMonthTransactions();
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    totalIncomeEl.textContent = formatWon(income);
    totalExpenseEl.textContent = formatWon(expense);
    totalBalanceEl.textContent = formatWon(income - expense);
  }

  function renderList() {
    const list = getFilteredTransactions()
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));

    txList.innerHTML = '';

    if (list.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }
    emptyMsg.style.display = 'none';

    list.forEach((tx) => {
      const cat = findCategory(tx.type, tx.category);
      const li = document.createElement('li');
      li.className = `tx-item ${tx.type}`;
      li.innerHTML = `
        <div class="tx-cat-badge">${cat.icon}</div>
        <div class="tx-info">
          <div class="tx-cat">${cat.label}</div>
          ${tx.memo ? `<div class="tx-memo">${escapeHtml(tx.memo)}</div>` : ''}
        </div>
        <div class="tx-meta">
          <div class="tx-amount">${tx.type === 'income' ? '+' : '-'}${formatWon(tx.amount)}</div>
          <div class="tx-date">${tx.date.slice(5).replace('-', '/')}</div>
        </div>
        <button class="tx-delete" data-id="${tx.id}" aria-label="삭제">✕</button>
      `;
      txList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render() {
    updateMonthLabel();
    renderSummary();
    renderList();
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  // events
  typeButtons.forEach((btn) => {
    btn.addEventListener('click', () => setType(btn.dataset.type));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = Number(amountInput.value);
    if (!amount || amount <= 0) {
      showToast('금액을 입력해주세요');
      return;
    }
    const tx = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: currentType,
      category: categorySelect.value,
      amount,
      memo: memoInput.value.trim(),
      date: dateInput.value || todayStr(),
      createdAt: Date.now(),
    };
    transactions.push(tx);
    saveTransactions(transactions);

    // jump view to the month of the new transaction
    const [y, m] = tx.date.split('-').map(Number);
    viewDate = new Date(y, m - 1, 1);

    amountInput.value = '';
    memoInput.value = '';
    amountInput.focus();
    render();
    showToast('추가되었습니다');
  });

  txList.addEventListener('click', (e) => {
    const btn = e.target.closest('.tx-delete');
    if (!btn) return;
    const id = btn.dataset.id;
    transactions = transactions.filter((t) => t.id !== id);
    saveTransactions(transactions);
    render();
    showToast('삭제되었습니다');
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });

  prevMonthBtn.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    render();
  });
  nextMonthBtn.addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    render();
  });

  // init
  dateInput.value = todayStr();
  populateCategories();
  render();
})();
