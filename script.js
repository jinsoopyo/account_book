(() => {
  const SUPABASE_URL = 'https://puifbscclipnoaeuhdub.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1aWZic2NjbGlwbm9hZXVoZHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzI5MDksImV4cCI6MjEwNDUwODkwOX0.URV6beD0pGcQJ-lpof0cMqQPf89cr_etG2fDbGzmDJo';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

  const budgetTitle = $('#budgetTitle');
  const budgetForm = $('#budgetForm');
  const budgetInput = $('#budgetInput');
  const budgetBadge = $('#budgetBadge');
  const budgetProgress = $('#budgetProgress');
  const budgetUsedEl = $('#budgetUsed');
  const budgetTotalEl = $('#budgetTotal');
  const budgetPercentEl = $('#budgetPercent');
  const budgetBarFill = $('#budgetBarFill');

  let currentType = 'expense';
  let currentFilter = 'all';
  let viewDate = new Date();
  viewDate.setDate(1);

  function rowToTx(row) {
    return {
      id: row.id,
      type: row.type,
      category: row.category,
      amount: Number(row.amount),
      memo: row.memo || '',
      date: row.tx_date,
      createdAt: new Date(row.created_at).getTime(),
    };
  }

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('tx_date', { ascending: false });
    if (error) {
      console.error('failed to load transactions', error);
      showToast('데이터를 불러오지 못했습니다');
      return [];
    }
    return data.map(rowToTx);
  }

  async function fetchBudgets() {
    const { data, error } = await supabase.from('budgets').select('*');
    if (error) {
      console.error('failed to load budgets', error);
      return {};
    }
    const map = {};
    data.forEach((row) => {
      map[row.month_key] = Number(row.amount);
    });
    return map;
  }

  let transactions = [];
  let budgets = {};

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

  function isCurrentCalendarMonth(date) {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  function renderBudget() {
    budgetTitle.textContent = isCurrentCalendarMonth(viewDate)
      ? '이번 달 예산'
      : `${viewDate.getMonth() + 1}월 예산`;

    const key = monthKey(viewDate);
    const budget = budgets[key];
    const used = getMonthTransactions()
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    // reflect the viewed month's saved budget in the input (or blank if none)
    budgetInput.value = budget ? budget : '';

    budgetBarFill.classList.remove('warning', 'danger');
    budgetPercentEl.classList.remove('warning', 'danger');
    budgetBadge.classList.remove('warning', 'danger');
    budgetBadge.hidden = true;

    if (!budget) {
      budgetProgress.hidden = true;
      return;
    }
    budgetProgress.hidden = false;

    const percent = Math.round((used / budget) * 100);
    budgetUsedEl.textContent = formatWon(used);
    budgetTotalEl.textContent = formatWon(budget);
    budgetPercentEl.textContent = `${percent}%`;
    budgetBarFill.style.width = `${Math.min(percent, 100)}%`;

    if (percent > 100) {
      budgetBarFill.classList.add('danger');
      budgetPercentEl.classList.add('danger');
      budgetBadge.classList.add('danger');
      budgetBadge.textContent = '🚨 예산 초과';
      budgetBadge.hidden = false;
    } else if (percent >= 80) {
      budgetBarFill.classList.add('warning');
      budgetPercentEl.classList.add('warning');
      budgetBadge.classList.add('warning');
      budgetBadge.textContent = '⚠️ 주의';
      budgetBadge.hidden = false;
    }
  }

  function render() {
    updateMonthLabel();
    renderSummary();
    renderBudget();
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(amountInput.value);
    if (!amount || amount <= 0) {
      showToast('금액을 입력해주세요');
      return;
    }
    const date = dateInput.value || todayStr();
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: currentType,
        category: categorySelect.value,
        amount,
        memo: memoInput.value.trim(),
        tx_date: date,
      })
      .select()
      .single();

    if (error) {
      console.error('failed to add transaction', error);
      showToast('추가하지 못했습니다');
      return;
    }

    transactions.push(rowToTx(data));

    // jump view to the month of the new transaction
    const [y, m] = date.split('-').map(Number);
    viewDate = new Date(y, m - 1, 1);

    amountInput.value = '';
    memoInput.value = '';
    amountInput.focus();
    render();
    showToast('추가되었습니다');
  });

  txList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.tx-delete');
    if (!btn) return;
    const id = btn.dataset.id;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('failed to delete transaction', error);
      showToast('삭제하지 못했습니다');
      return;
    }
    transactions = transactions.filter((t) => t.id !== id);
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

  budgetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(budgetInput.value);
    if (!amount || amount <= 0) {
      showToast('예산 금액을 입력해주세요');
      return;
    }
    const key = monthKey(viewDate);
    const { error } = await supabase
      .from('budgets')
      .upsert({ month_key: key, amount, updated_at: new Date().toISOString() });
    if (error) {
      console.error('failed to save budget', error);
      showToast('예산을 저장하지 못했습니다');
      return;
    }
    budgets[key] = amount;
    renderBudget();
    showToast('예산이 설정되었습니다');
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
  async function init() {
    dateInput.value = todayStr();
    populateCategories();
    [transactions, budgets] = await Promise.all([fetchTransactions(), fetchBudgets()]);
    render();
  }
  init();
})();
