// Mock Database using localStorage

export const initDb = () => {
  if (!localStorage.getItem('payx_users')) localStorage.setItem('payx_users', JSON.stringify([]));
  if (!localStorage.getItem('payx_balances')) localStorage.setItem('payx_balances', JSON.stringify({}));
  if (!localStorage.getItem('payx_transactions')) localStorage.setItem('payx_transactions', JSON.stringify([]));
};

const safeGetArray = (key) => {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
};

const safeGetObject = (key) => {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
  } catch (e) {
    return {};
  }
};

export const getUser = (identifier) => {
  const users = safeGetArray('payx_users');
  return users.find(u => u.email === identifier || u.passkeyId === identifier);
};

export const createUser = (userData) => {
  const users = safeGetArray('payx_users');
  const accountId = 'acc_' + Math.random().toString(36).substr(2, 9);
  users.push({ ...userData, accountId });
  localStorage.setItem('payx_users', JSON.stringify(users));
  
  const balances = safeGetObject('payx_balances');
  balances[accountId] = "0.00";
  localStorage.setItem('payx_balances', JSON.stringify(balances));
  
  return accountId;
};

export const getBalance = (accountId) => {
  const balances = safeGetObject('payx_balances');
  return balances[accountId] || "0.00";
};

export const updateBalance = (accountId, newBalance) => {
  const balances = safeGetObject('payx_balances');
  balances[accountId] = newBalance.toString();
  localStorage.setItem('payx_balances', JSON.stringify(balances));
};

export const addTransaction = (tx) => {
  const txs = safeGetArray('payx_transactions');
  txs.unshift({
    id: 'tx_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    ...tx
  });
  localStorage.setItem('payx_transactions', JSON.stringify(txs));
};

export const getTransactions = (accountId) => {
  const txs = safeGetArray('payx_transactions');
  return txs.filter(tx => tx.accountId === accountId);
};
