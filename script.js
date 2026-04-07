// Registrar PWA Service Worker (Motor Nativo Multiplataforma / Offline)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            console.log('Bufunfa Instalador ativado! Cache Nativo: OK', reg.scope);
        }).catch(err => console.log('Falha no Servidor Nativo:', err));
    });
}

// Estado da Aplicação
let transactions = JSON.parse(localStorage.getItem('bufunfa_transactions')) || [];
let currentType = 'expense'; // 'expense' ou 'income'
let currentViewDate = new Date(); // Data atualmente visualizada no app
let isPrivacyMode = localStorage.getItem('bufunfa_privacy') === 'true'; // Modo privacidade

// Preferências Globais
let appSettings = JSON.parse(localStorage.getItem('bufunfa_settings')) || {
    currency: 'BRL',
    weekStart: 'domingo',
    monthStartStr: '1'
};

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Categorias e Cores (Default)
const defaultCategories = {
    expense: [
        { id: 'casa', name: 'Casa', icon: 'home', color: '#4a90e2' },
        { id: 'comida', name: 'Comida', icon: 'restaurant', color: '#f43f5e' },
        { id: 'carro', name: 'Carro', icon: 'directions_car', color: '#64748b' },
        { id: 'lazer', name: 'Lazer', icon: 'sports_soccer', color: '#0abde3' },
        { id: 'saude', name: 'Saúde', icon: 'healing', color: '#ef4444' },
        { id: 'roupas', name: 'Roupas', icon: 'checkroom', color: '#9b59b6' }
    ],
    income: [
        { id: 'salario', name: 'Salário', icon: 'payments', color: '#10b981' },
        { id: 'presente', name: 'Presente', icon: 'card_giftcard', color: '#f59e0b' },
        { id: 'investimento', name: 'Investimento', icon: 'trending_up', color: '#3b82f6' }
    ]
};

let categories = JSON.parse(localStorage.getItem('bufunfa_categories')) || defaultCategories;

// Bancos / Cartões
const cardsList = [
    { id: 'nubank', name: 'Nubank', color: '#8a05be' },
    { id: 'itau', name: 'Itaú', color: '#ec7000' },
    { id: 'bb', name: 'Banco do Brasil', color: '#f3e600' },
    { id: 'santander', name: 'Santander', color: '#cc0000' },
    { id: 'bradesco', name: 'Bradesco', color: '#cc092f' },
    { id: 'inter', name: 'Inter', color: '#ff7a00' },
    { id: 'c6', name: 'C6 Bank', color: '#242424' },
    { id: 'caixa', name: 'Caixa', color: '#005ca9' },
    { id: 'picpay', name: 'PicPay', color: '#11c76f' },
    { id: 'mercadopago', name: 'Mercado Pago', color: '#009ee3' },
    { id: 'dinheiro', name: 'Dinheiro Físico/Pix', color: '#10b981' }
];

// Referências UI
const balanceDisplay = document.getElementById('balance-display');
const balanceBar = document.getElementById('balance-bar');
const incomeDisplay = document.getElementById('income-display');
const expenseDisplay = document.getElementById('expense-display');
const donutIncome = document.getElementById('income-segment');
const donutExpense = document.getElementById('expense-segment');
const modal = document.getElementById('input-modal');
const modalTitle = document.getElementById('modal-title');
const inputAmount = document.getElementById('input-amount');
const inputDescription = document.getElementById('input-description');
const inputCategory = document.getElementById('input-category');
const inputCard = document.getElementById('input-card');
const cardLabel = document.getElementById('card-label');
const categoriesRadial = document.getElementById('categories-radial');
const summaryModal = document.getElementById('summary-modal');
const summaryList = document.getElementById('summary-list');
const categoryModal = document.getElementById('category-modal');
const catNameInput = document.getElementById('cat-name');
const catColorInput = document.getElementById('cat-color');

// Mascara de Moeda (ex: 1.234,56)
inputAmount.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value === "") return;
    value = (parseInt(value, 10) / 100).toFixed(2);
    value = value.replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    e.target.value = value;
});

function init() {
    initTheme();
    initPrivacy();
    renderRadialCategories();
    updateUI();
}

// Controle de Privacidade
function initPrivacy() {
    const prvIcon = document.getElementById('privacy-icon');
    if (prvIcon) {
        prvIcon.textContent = isPrivacyMode ? 'visibility_off' : 'visibility';
    }
}

function togglePrivacy() {
    isPrivacyMode = !isPrivacyMode;
    localStorage.setItem('bufunfa_privacy', isPrivacyMode);
    document.getElementById('privacy-icon').textContent = isPrivacyMode ? 'visibility_off' : 'visibility';
    updateUI();
    
    // Atualiza modal se estiver aberto
    if (summaryModal.classList.contains('active')) {
        openSummaryModal();
    }
}

// Inicializa Tema
function initTheme() {
    const savedTheme = localStorage.getItem('bufunfa_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

// Alterna o Tema
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('bufunfa_theme', newTheme);
    
    document.getElementById('theme-icon').textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
}

// Renderiza ícones em círculo
function renderRadialCategories() {
    categoriesRadial.innerHTML = '';
    
    // Anexa o tipo para sabermos ao clicar se é receita ou despesa
    const expIcons = categories.expense.map(c => ({...c, type: 'expense'}));
    const incIcons = categories.income.map(c => ({...c, type: 'income'}));
    const allIcons = [...expIcons, ...incIcons];
    
    const radius = 135; // Raio em pixels para a disposição dos ícones
    const centerX = 150;
    const centerY = 150;

    allIcons.forEach((cat, index) => {
        const angle = (index / allIcons.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle) - 20; // 20 é metade da largura do ícone
        const y = centerY + radius * Math.sin(angle) - 20;

        const iconEl = document.createElement('div');
        iconEl.className = 'category-icon';
        iconEl.style.left = `${x}px`;
        iconEl.style.top = `${y}px`;
        iconEl.style.color = cat.color;
        iconEl.style.cursor = 'pointer';
        iconEl.style.transition = 'transform 0.2s';
        iconEl.innerHTML = `<span class="material-icons-round">${cat.icon}</span>`;
        iconEl.title = cat.name;
        
        // Efeito visual ao passar o mouse / clicar
        iconEl.onmouseover = () => iconEl.style.transform = 'scale(1.2)';
        iconEl.onmouseout = () => iconEl.style.transform = 'scale(1)';
        
        iconEl.addEventListener('click', () => {
            showCategoryValue(cat.id, cat.name, cat.type);
        });
        
        categoriesRadial.appendChild(iconEl);
    });
}

function showCategoryValue(catId, catName, catType) {
    const currentM = currentViewDate.getMonth();
    const currentY = currentViewDate.getFullYear();
    
    // Filtra transações apenas daquele mês E daquela categoria
    const filtered = transactions.filter(t => {
        const d = t.date ? new Date(t.date) : new Date();
        return d.getMonth() === currentM && d.getFullYear() === currentY && t.category === catId;
    });

    const sum = filtered.reduce((acc, t) => acc + t.amount, 0);

    // Substitui temporariamente o texto do meio do gráfico
    incomeDisplay.textContent = catName;
    incomeDisplay.style.color = 'var(--text-primary)';
    
    expenseDisplay.textContent = formatSecureCurrency(sum);
    expenseDisplay.style.color = catType === 'income' ? 'var(--income-color)' : 'var(--expense-color)';

    // Reseta após 3 segundos
    clearTimeout(window.categoryTimeout);
    window.categoryTimeout = setTimeout(() => {
        incomeDisplay.style.color = '';
        expenseDisplay.style.color = '';
        updateUI(); // Força retornar aos textos de Saldo normais
    }, 3000);
}

// Calculador de Ciclo Fixo do Mês
function getCycleDate(dateObj) {
    const d = new Date(dateObj); // clonar object para não reescrever original
    const startDay = parseInt(appSettings.monthStartStr) || 1;
    if (d.getDate() < startDay) {
        // Pertence ao encerramento do mes anterior
        d.setMonth(d.getMonth() - 1);
    }
    return {
        month: d.getMonth(),
        year: d.getFullYear()
    };
}

// Controle do Filtro de Mês
function updateTimeFilter() {
    let oldestDateCycle = { month: currentViewDate.getMonth(), year: currentViewDate.getFullYear() };
    if (transactions.length > 0) {
        const oldestTime = Math.min(...transactions.map(t => t.date ? new Date(t.date).getTime() : new Date().getTime()));
        oldestDateCycle = getCycleDate(new Date(oldestTime));
    }

    const currentMonthNum = currentViewDate.getMonth();
    const currentYear = currentViewDate.getFullYear();

    document.getElementById('current-month-display').textContent = `${monthNames[currentMonthNum]} ${currentYear}`;

    // Desativa ir para trás se estiver no mês ciclo em que o app começou a ser usado
    const oldestMonthVal = oldestDateCycle.year * 12 + oldestDateCycle.month;
    const currentMonthVal = currentYear * 12 + currentMonthNum;

    const prevBtn = document.getElementById('prev-month-btn');
    if (currentMonthVal > oldestMonthVal) {
        let prevM = currentMonthNum - 1;
        if (prevM < 0) prevM = 11;
        prevBtn.innerHTML = `&larr; ${monthNames[prevM]}`;
        prevBtn.style.visibility = 'visible';
    } else {
        prevBtn.style.visibility = 'hidden';
    }

    // Navegar para o futuro sempre permitido
    const nextBtn = document.getElementById('next-month-btn');
    let nextM = currentMonthNum + 1;
    if (nextM > 11) nextM = 0;
    nextBtn.innerHTML = `${monthNames[nextM]} &rarr;`;
}

function changeMonth(delta) {
    currentViewDate.setMonth(currentViewDate.getMonth() + delta);
    updateUI();
}

function updateUI() {
    updateTimeFilter();

    let totalIncome = 0;
    let totalExpense = 0;

    const currentM = currentViewDate.getMonth();
    const currentY = currentViewDate.getFullYear();

    // Filtra transações apenas do mês selecionado
    const filteredTransactions = transactions.filter(t => {
        const d = t.date ? new Date(t.date) : new Date();
        const cycle = getCycleDate(d);
        return cycle.month === currentM && cycle.year === currentY;
    });

    filteredTransactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });

    const balance = totalIncome - totalExpense;

    // Atualiza Textos
    incomeDisplay.textContent = formatSecureCurrency(totalIncome);
    expenseDisplay.textContent = formatSecureCurrency(totalExpense);
    balanceDisplay.textContent = `Saldo ${formatSecureCurrency(balance)}`;
    
    // Atualiza Barra de Saldo
    if (balance < 0) {
        balanceBar.style.borderColor = 'var(--expense-color)';
        balanceBar.style.color = 'var(--expense-color)';
    } else if (balance > 0) {
        balanceBar.style.borderColor = 'var(--income-color)';
        balanceBar.style.color = 'var(--income-color)';
    } else {
        balanceBar.style.borderColor = 'transparent';
        balanceBar.style.color = 'var(--text-primary)';
    }

    // Atualiza Gráfico
    const total = totalIncome + totalExpense;
    if (total === 0) {
        donutIncome.style.strokeDasharray = '0 440';
        donutExpense.style.strokeDasharray = '0 440';
    } else {
        const circumference = 2 * Math.PI * 70; // 439.82
        
        const incomePercent = totalIncome / total;
        const expensePercent = totalExpense / total;

        const incomeDash = incomePercent * circumference;
        const expenseDash = expensePercent * circumference;

        donutIncome.style.strokeDasharray = `${incomeDash} ${circumference}`;
        
        // Ponto de início do segmento vermelho
        donutExpense.style.strokeDasharray = `${expenseDash} ${circumference}`;
        donutExpense.style.strokeDashoffset = -incomeDash;
    }
    
    saveData();
}

function formatCurrency(value) {
    if (appSettings.currency === 'USD') {
        return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    } else if (appSettings.currency === 'EUR') {
        return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatSecureCurrency(value) {
    if (isPrivacyMode) {
        const s = appSettings.currency === 'BRL' ? 'R$' : (appSettings.currency === 'USD' ? 'US$' : '€');
        return `${s} •••••`;
    }
    return formatCurrency(value);
}

// Drawer de Configurações
function openDrawer() {
    document.getElementById('drawer-currency').value = appSettings.currency;
    document.getElementById('drawer-week-start').value = appSettings.weekStart;
    document.getElementById('drawer-month-start').value = appSettings.monthStartStr;
    document.getElementById('drawer-menu').classList.add('active');
}

function closeDrawer() {
    document.getElementById('drawer-menu').classList.remove('active');
}

function saveSettings() {
    appSettings.currency = document.getElementById('drawer-currency').value;
    appSettings.weekStart = document.getElementById('drawer-week-start').value;
    appSettings.monthStartStr = document.getElementById('drawer-month-start').value || '1';
    
    localStorage.setItem('bufunfa_settings', JSON.stringify(appSettings));
    
    // Altera o Título "Valor (R$)" do Modal de Lançamentos
    const s = appSettings.currency === 'BRL' ? 'R$' : (appSettings.currency === 'USD' ? 'US$' : '€');
    const valorLabel = document.querySelector('#input-modal .input-group:first-of-type label');
    if (valorLabel) valorLabel.textContent = `Valor (${s})`;
    
    closeDrawer();
    updateUI(); // Força todos os gráficos e cálculos a assumirem Nova Moeda e Novo Ciclo Temporal
}

// Exportação Excel
function exportToExcel() {
    if (transactions.length === 0) {
        alert("Você ainda não registrou lançamentos para exportar!");
        return;
    }

    // CSV brasileiro exige ";" para não quebrar a coluna por causa da vírgula do decimal padrão.
    let csvContent = "Data da Viagem;Tipo de Movimentacao;Categoria;Banco ou Forma de Pagamento;Descricao Detalhada;Valor (R$)\n";

    transactions.forEach(t => {
        const d = t.date ? new Date(t.date) : new Date();
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        
        const typeStr = t.type === 'income' ? 'CREDITO (Receita)' : 'DEBITO (Despesa)';
        
        const catGroup = categories[t.type].find(c => c.id === t.category);
        const catStr = catGroup ? catGroup.name : 'Outros';
        
        const cardRef = cardsList.find(c => c.id === t.card);
        const cardStr = cardRef ? cardRef.name : 'N/A';
        
        const descStr = t.description ? `"${t.description.replace(/"/g, '""')}"` : '""';
        
        const valSign = t.type === 'income' ? 1 : -1;
        const finalValue = t.amount * valSign;
        // Float formatado para Português, Excel processa como número.
        const valStr = finalValue.toFixed(2).replace('.', ',');

        csvContent += `${dateStr};${typeStr};${catStr};${cardStr};${descStr};${valStr}\n`;
    });

    // Injeção de UTF-8 BOM, ou seja ele vai entender Ç, à, ã.
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Auto-Clique oculto para forçar donwload nativo
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const currentDateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.setAttribute("download", `Bufunfa_Extrato_${currentDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function openInputModal(type) {
    currentType = type;
    modalTitle.textContent = type === 'income' ? 'Nova Receita' : 'Nova Despesa';
    
    if (cardLabel) {
        cardLabel.textContent = type === 'income' ? 'Fonte de Receita' : 'Forma de Pagamento';
    }
    
    // Popula categorias
    inputCategory.innerHTML = '';
    categories[type].forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        inputCategory.appendChild(opt);
    });

    // Popula bancos/cartões
    inputCard.innerHTML = '';
    cardsList.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        inputCard.appendChild(opt);
    });

    inputAmount.value = '';
    inputDescription.value = '';
    inputDescription.placeholder = type === 'income' ? 'Ex: Salário, Projeto, Pix...' : 'Ex: Mercado, Uber, Conta...';

    // Controle do bloco de Repetição / Parcelamento
    const instGroup = document.getElementById('installment-group');
    if (instGroup) {
        instGroup.style.display = 'block';
        document.getElementById('is-installment').checked = false;
        document.getElementById('installment-qty-container').style.display = 'none';
        document.getElementById('input-installments').value = '';

        if (type === 'expense') {
            document.getElementById('installment-label-text').textContent = 'Esta despesa é parcelada?';
            document.getElementById('installment-qty-title').textContent = 'Quantidade de Parcelas:';
            document.getElementById('installment-hint').textContent = 'O valor total será dividido pelo número de meses.';
        } else {
            document.getElementById('installment-label-text').textContent = 'Esta receita é fixa mensal?';
            document.getElementById('installment-qty-title').textContent = 'Repetir por quantos meses:';
            document.getElementById('installment-hint').textContent = 'O valor inserido será repetido integralmente mês a mês.';
        }
    }

    modal.classList.add('active');
}

function toggleInstallment() {
    const isInst = document.getElementById('is-installment');
    const instQty = document.getElementById('installment-qty-container');
    instQty.style.display = isInst.checked ? 'block' : 'none';
}

function closeInputModal() {
    modal.classList.remove('active');
}

// ------ Lógica de Filtro do Resumo Diário ------
let currentSummaryFilter = 'month';
let currentSummaryDateStart = null;
let currentSummaryDateEnd = null;

function setSummaryFilter(type, el) {
    document.getElementById('summary-period-panel').style.display = 'none';

    const pills = document.querySelectorAll('.summary-filters .filter-pill');
    pills.forEach(p => p.classList.remove('active'));
    if(el) el.classList.add('active');
    
    currentSummaryFilter = type;
    openSummaryModal(); 
}

function toggleCustomPeriod(el) {
    const pills = document.querySelectorAll('.summary-filters .filter-pill');
    pills.forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    
    document.getElementById('summary-period-panel').style.display = 'block';
}

function applyPeriodFilter() {
    currentSummaryFilter = 'period';
    currentSummaryDateStart = document.getElementById('summary-date-start').value;
    currentSummaryDateEnd = document.getElementById('summary-date-end').value;
    
    if(!currentSummaryDateStart || !currentSummaryDateEnd) {
        alert("Preencha a data inicial e final.");
        return;
    }
    
    openSummaryModal();
}

function openSummaryModal() {
    summaryList.innerHTML = '';
    
    const currentM = currentViewDate.getMonth();
    const currentY = currentViewDate.getFullYear();
    const today = new Date();
    
    // Filtro condicional baseado nos states da pílula
    const filteredTransactions = transactions.filter(t => {
        const d = t.date ? new Date(t.date) : new Date();
        const cycle = getCycleDate(d);
        
        if (currentSummaryFilter === 'month') {
            return cycle.month === currentM && cycle.year === currentY;
        } 
        else if (currentSummaryFilter === 'year') {
            return cycle.year === currentY;
        } 
        else if (currentSummaryFilter === 'day') {
             return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        } 
        else if (currentSummaryFilter === 'period' && currentSummaryDateStart && currentSummaryDateEnd) {
             // Avalia através de Timestamp blindando contra falhas de fuso horário
             const startDate = new Date(currentSummaryDateStart + 'T00:00:00').getTime();
             const endDate = new Date(currentSummaryDateEnd + 'T23:59:59').getTime();
             const targetTime = d.getTime();
             return targetTime >= startDate && targetTime <= endDate;
        }
        return false;
    });

    // Agrupar transações por Data
    const groups = {};
    filteredTransactions.forEach(t => {
        // Fallback robusto para date
        const dateObj = t.date ? new Date(t.date) : new Date();
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(t);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
        const pa = a.split('/').reverse().join('');
        const pb = b.split('/').reverse().join('');
        return pb.localeCompare(pa);
    });

    if (sortedDates.length === 0) {
        summaryList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Nenhum lançamento no momento.</div>';
    } else {
        sortedDates.forEach(date => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'summary-day-grp';
            let dayHtml = `<div class="summary-date">${date}</div>`;
            
            groups[date].forEach(item => {
                const colorClass = item.type === 'income' ? 'income' : 'expense';
                const prefix = item.type === 'income' ? '+' : '-';
                
                // Pega nome da categoria
                const catGroup = categories[item.type].find(c => c.id === item.category);
                const categoryName = catGroup ? catGroup.name : 'Outros';
                const desc = item.description ? ` <span style="opacity:0.6">(${item.description})</span>` : '';
                
                // Label de Cartão
                const cardRef = cardsList.find(c => c.id === item.card);
                const cardLabel = cardRef ? ` <span style="font-size: 11px; padding: 2px 6px; border-radius: 8px; background: ${cardRef.color}20; color: ${cardRef.color}; font-weight: 700; margin-left: 6px;">${cardRef.name}</span>` : '';
                
                dayHtml += `
                    <div class="summary-item">
                        <span class="desc" style="display: flex; align-items: center;">${categoryName}${desc}${cardLabel}</span>
                        <span class="val ${colorClass}">${prefix} ${formatSecureCurrency(item.amount)}</span>
                    </div>
                `;
            });
            dayDiv.innerHTML = dayHtml;
            summaryList.appendChild(dayDiv);
        });
    }

    summaryModal.classList.add('active');
}

function closeSummaryModal() {
    summaryModal.classList.remove('active');
}

function saveTransaction() {
    let rawAmount = inputAmount.value.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(rawAmount);
    const category = inputCategory.value;
    const cardUsed = inputCard.value;
    const description = inputDescription.value.trim();

    if (!amount || amount <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }

    // Configura o evento para ser salvo na visão atual
    const baseDate = new Date();
    baseDate.setFullYear(currentViewDate.getFullYear());
    baseDate.setMonth(currentViewDate.getMonth());

    const isInstallment = document.getElementById('is-installment') && document.getElementById('is-installment').checked;
    const instCount = isInstallment ? (parseInt(document.getElementById('input-installments').value) || 1) : 1;

    let iterations = instCount;
    let finalAmount = amount; // Para receitas, o montante base não se divide (fica integral)

    if (currentType === 'expense' && instCount > 1) {
        finalAmount = amount / instCount; // Divide o valor total pelo número de parcelas na Despesa
    }

    for (let i = 0; i < iterations; i++) {
        let loopDate = new Date(baseDate);
        loopDate.setMonth(loopDate.getMonth() + i);

        let finalDesc = description;
        if (iterations > 1) {
             if (currentType === 'expense') {
                 finalDesc = description ? `${description} (${i+1}/${iterations})` : `Parcela (${i+1}/${iterations})`;
             } else {
                 finalDesc = description ? `${description} (Mês ${i+1}/${iterations})` : `Fixo (Mês ${i+1}/${iterations})`;
             }
        }

        transactions.push({
            id: Date.now() + i,
            type: currentType,
            amount: finalAmount,
            category: category,
            card: cardUsed,
            description: finalDesc,
            date: loopDate.toISOString()
        });
    }

    closeInputModal();
    updateUI();
}

function saveData() {
    localStorage.setItem('bufunfa_transactions', JSON.stringify(transactions));
}

// Mapeador de ícones inteligentes baseado no texto
const iconMapping = {
    'academia': 'fitness_center', 'musculação': 'fitness_center', 'treino': 'fitness_center', 'crossfit': 'fitness_center',
    'mercado': 'shopping_cart', 'supermercado': 'shopping_cart', 'compras': 'shopping_bag', 'shopping': 'local_mall',
    'uber': 'directions_car', 'transporte': 'directions_bus', 'ônibus': 'directions_bus', 'passagem': 'directions_bus',
    'viagem': 'flight', 'voo': 'flight', 'hotel': 'hotel',
    'restaurante': 'restaurant', 'ifood': 'delivery_dining', 'lanche': 'fastfood', 'pizza': 'local_pizza',
    'café': 'local_cafe', 'bar': 'local_bar', 'bebida': 'liquor', 'cerveja': 'sports_bar',
    'farmácia': 'local_pharmacy', 'remédio': 'medication', 'saúde': 'healing', 'médico': 'medical_services', 'hospital': 'local_hospital',
    'pet': 'pets', 'cachorro': 'pets', 'gato': 'pets', 'veterinário': 'pets', 'ração': 'pets',
    'escola': 'school', 'faculdade': 'school', 'curso': 'menu_book', 'livro': 'menu_book',
    'luz': 'lightbulb', 'energia': 'bolt', 'água': 'water_drop', 'internet': 'wifi',
    'celular': 'smartphone', 'telefone': 'phone', 'tv': 'tv', 'streaming': 'play_circle', 'netflix': 'movie',
    'cinema': 'theaters', 'filme': 'theaters', 'jogos': 'sports_esports', 'game': 'sports_esports',
    'presente': 'card_giftcard', 'namorada': 'favorite', 'namorado': 'favorite', 'amor': 'favorite',
    'esporte': 'sports_soccer', 'futebol': 'sports_soccer',
    'roupa': 'checkroom', 'tênis': 'ice_skating', 'beleza': 'face', 'maquiagem': 'face_retouching_natural',
    'barbearia': 'content_cut', 'salão': 'content_cut', 'cabelo': 'content_cut',
    'imposto': 'account_balance', 'taxa': 'receipt_long', 'multa': 'warning',
    'investimento': 'trending_up', 'bitcoin': 'currency_bitcoin', 'poupança': 'savings', 'banco': 'account_balance',
    'salário': 'payments', 'freela': 'work', 'trabalho': 'work',
    'aluguel': 'key', 'casa': 'home', 'manutenção': 'build', 'ferramenta': 'handyman',
    'carro': 'directions_car', 'gasolina': 'local_gas_station', 'combustível': 'local_gas_station', 'mecânico': 'car_repair',
    'bebê': 'child_care', 'criança': 'child_friendly',
    'festa': 'celebration', 'música': 'music_note', 'show': 'stadium'
};

function getSmartIcon(name) {
    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(iconMapping)) {
        if (lowerName.includes(key)) {
            return icon;
        }
    }
    return 'label'; // Ícone de Etiqueta como fallback
}

// Lógica de Novas Categorias
function openCategoryModal() {
    catNameInput.value = '';
    // Aplica uma cor aleatória
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    catColorInput.value = randomColor;
    categoryModal.classList.add('active');
}

function closeCategoryModal() {
    categoryModal.classList.remove('active');
}

// ------ Sistema de Busca Global ------
// Transforma "Salário" em "salario" apagando vícios de acentuação
function removeAccents(str) {
    if (!str) return '';
    return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function openSearchModal() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-suggestions').innerHTML = '';
    document.getElementById('search-results-list').innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Digite algo para varrer seu histórico...</div>';
    document.getElementById('search-modal').classList.add('active');
    setTimeout(() => document.getElementById('search-input').focus(), 100);
}

function closeSearchModal() {
    document.getElementById('search-modal').classList.remove('active');
}

function performSearch() {
    const rawQuery = document.getElementById('search-input').value;
    const query = removeAccents(rawQuery).trim();
    const resultsList = document.getElementById('search-results-list');
    const suggestionsDiv = document.getElementById('search-suggestions');
    
    suggestionsDiv.innerHTML = '';
    
    if (!query) {
        resultsList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Digite algo para varrer seu histórico...</div>';
        return;
    }
    
    const possibleWords = new Set();
    
    // Varredura Profunda (Sem distinção de mês, Sem distinção de Acento)
    const matches = transactions.filter(t => {
        const catGroup = categories[t.type].find(c => c.id === t.category);
        const catName = catGroup ? catGroup.name : '';
        const cardRef = cardsList.find(c => c.id === t.card);
        const cardName = cardRef ? cardRef.name : '';
        
        const normCat = removeAccents(catName);
        const normCard = removeAccents(cardName);
        const normDesc = removeAccents(t.description);
        const normVal = t.amount.toString();
        
        // Coleta palavras para a inteligência de Autocompletar
        const allWords = [catName, cardName];
        if (t.description) {
            allWords.push(...t.description.split(/\s+/)); // pica a descrição em espaço
        }

        allWords.forEach(word => {
             const cleanWord = word.replace(/[^\wÀ-ÿ]/g, ''); // tira vírgulas e pontos
             if(cleanWord.length > 2 && removeAccents(cleanWord).startsWith(query)) {
                 // Usa a palavra com a capitalização bonita original
                 possibleWords.add(cleanWord);
             }
        });

        // O filtro final confere se o valor bate de algum jeito
        return normDesc.includes(query) || normCat.includes(query) || normCard.includes(query) || normVal.includes(query);
    });

    // Injeta Botões de Sugestão
    let iter = 0;
    possibleWords.forEach(w => {
        if(iter >= 4) return; // Máximo 4 botões na tela pra não atolar o menu
        if(removeAccents(w) !== query) { 
            const chip = document.createElement('div');
            chip.textContent = w;
            chip.style.background = 'var(--donut-bg)';
            chip.style.color = 'var(--text-primary)';
            chip.style.padding = '6px 14px';
            chip.style.borderRadius = '16px';
            chip.style.fontSize = '12px';
            chip.style.cursor = 'pointer';
            chip.style.whiteSpace = 'nowrap';
            chip.style.flexShrink = '0';
            
            chip.onclick = () => {
                document.getElementById('search-input').value = w;
                performSearch(); // Reprocessa tudo em fração de milisangundos com a palavra cheia
            };
            suggestionsDiv.appendChild(chip);
            iter++;
        }
    });

    matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (matches.length === 0) {
        resultsList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Sem resultados.</div>';
        return;
    }

    resultsList.innerHTML = '';
    
    matches.forEach(item => {
        const dateObj = item.date ? new Date(item.date) : new Date();
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        const colorClass = item.type === 'income' ? 'income' : 'expense';
        const prefix = item.type === 'income' ? '+' : '-';
        
        const catGroup = categories[item.type].find(c => c.id === item.category);
        const categoryName = catGroup ? catGroup.name : 'Outros';
        const desc = item.description ? ` <span style="opacity:0.6">(${item.description})</span>` : '';
        
        const cardRef = cardsList.find(c => c.id === item.card);
        const cardLabel = cardRef ? ` <span style="font-size: 11px; padding: 2px 6px; border-radius: 8px; background: ${cardRef.color}20; color: ${cardRef.color}; font-weight: 700; margin-left: 6px;">${cardRef.name}</span>` : '';
        
        const markup = `
            <div class="summary-day-grp" style="margin-bottom: 12px; border-bottom: 1px solid var(--donut-bg); padding-bottom: 8px;">
                <div class="summary-date" style="margin-bottom: 4px; font-size: 12px; color: var(--text-secondary);">${dateStr}</div>
                <div class="summary-item">
                    <span class="desc" style="display: flex; align-items: center;">${categoryName}${desc}${cardLabel}</span>
                    <span class="val ${colorClass}">${prefix} ${formatSecureCurrency(item.amount)}</span>
                </div>
            </div>
        `;
        resultsList.insertAdjacentHTML('beforeend', markup);
    });
}
// -------------------------------------

function saveCategory() {
    const name = catNameInput.value.trim();
    const color = catColorInput.value;

    if (!name) {
        alert('Digite o nome da categoria.');
        return;
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const smartIcon = getSmartIcon(name);
    
    categories[currentType].push({
        id: id,
        name: name,
        icon: smartIcon,
        color: color
    });

    localStorage.setItem('bufunfa_categories', JSON.stringify(categories));
    
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = name;
    inputCategory.appendChild(opt);
    inputCategory.value = id;

    closeCategoryModal();
    renderRadialCategories();
}

// Inicializa o app
init();
