const operationsQueue = {
  async add(type, currency, amount, bankAccount = null) {
    const operations = (await dbGet('pending_operations')) || [];
    operations.push({
      id: Date.now(),
      type,
      currency,
      amount,
      bankAccount,
      timestamp: Date.now(),
    });
    await dbSet('pending_operations', operations);
  },

  async process() {
    const operations = (await dbGet('pending_operations')) || [];
    if (!operations.length) return 0;

    const processed = [];
    for (const op of operations) {
      try {
        if (op.type === 'deposit') {
          await depositBalance(op.currency, op.amount);
        } else {
          await withdrawBalance(op.currency, op.amount, op.bankAccount);
        }
        processed.push(op.id);
      } catch {}
    }

    const remaining = operations.filter((op) => !processed.includes(op.id));
    await dbSet('pending_operations', remaining);
    return processed.length;
  },

  async count() {
    const operations = (await dbGet('pending_operations')) || [];
    return operations.length;
  },

  async clear() {
    await dbSet('pending_operations', []);
  },
};

async function processQueuePeriodically() {
  const status = await backend.getStatus();
  if (status.isOnline && (await auth.isLoggedIn())) {
    const processed = await operationsQueue.process();
    if (processed > 0) {
      await fetchBalance();
      if (currentView === 'balance') {
        const userSection = document.getElementById('user-section');
        if (userSection) {
          renderBalanceView(userSection);
        }
      }
    }
  }
}
