export const initDB = () => {
  if (!localStorage.getItem('payx_users')) {
    localStorage.setItem('payx_users', JSON.stringify({}));
  }
  if (!localStorage.getItem('payx_transactions')) {
    localStorage.setItem('payx_transactions', JSON.stringify({}));
  }
  if (!localStorage.getItem('payx_balances')) {
    localStorage.setItem('payx_balances', JSON.stringify({}));
  }
};

const generateId = () => 'act_' + Math.random().toString(36).substr(2, 9);

export const registerUser = (identifier, type) => {
  initDB();
  const users = JSON.parse(localStorage.getItem('payx_users'));
  
  if (users[identifier]) {
    throw new Error('User already exists');
  }

  const accountId = generateId();
  users[identifier] = {
    accountId,
    type,
    createdAt: new Date().toISOString()
  };
  
  localStorage.setItem('payx_users', JSON.stringify(users));
  
  const txs = JSON.parse(localStorage.getItem('payx_transactions'));
  txs[accountId] = [];
  localStorage.setItem('payx_transactions', JSON.stringify(txs));

  const balances = JSON.parse(localStorage.getItem('payx_balances'));
  balances[accountId] = "0.00";
  localStorage.setItem('payx_balances', JSON.stringify(balances));
  
  return accountId;
};

export const getUser = (identifier) => {
  initDB();
  const users = JSON.parse(localStorage.getItem('payx_users'));
  return users[identifier] || null;
};

export const getBalance = (accountId) => {
  initDB();
  const balances = JSON.parse(localStorage.getItem('payx_balances'));
  return balances[accountId] || "0.00";
};

export const updateBalance = (accountId, newBalance) => {
  initDB();
  const balances = JSON.parse(localStorage.getItem('payx_balances'));
  balances[accountId] = newBalance;
  localStorage.setItem('payx_balances', JSON.stringify(balances));
};

export const addTransaction = (accountId, tx) => {
  initDB();
  const txs = JSON.parse(localStorage.getItem('payx_transactions'));
  if (!txs[accountId]) txs[accountId] = [];
  
  txs[accountId].unshift({
    id: 'tx_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    ...tx
  });
  
  localStorage.setItem('payx_transactions', JSON.stringify(txs));
};

export const getTransactions = (accountId) => {
  initDB();
  const txs = JSON.parse(localStorage.getItem('payx_transactions'));
  return txs[accountId] || [];
};
