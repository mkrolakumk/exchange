import { getFromDB, saveToDB } from './db.js';
import { depositBalance, withdrawBalance } from './api.js';

export const operationsQueue = {
  async add(type, currency, amount, bankAccount = null) {
    const operations = (await getFromDB('pending_operations')) || [];
    operations.push({
      id: crypto.randomUUID(),
      type,
      currency,
      amount,
      bankAccount,
      timestamp: Date.now(),
    });
    await saveToDB('pending_operations', operations);
  },

  async process(token) {
    const operations = (await getFromDB('pending_operations')) || [];
    if (!operations.length) return 0;

    const processed = [];
    for (const op of operations) {
      try {
        if (op.type === 'deposit') {
          await depositBalance(token, op.currency, op.amount);
        } else {
          await withdrawBalance(token, op.currency, op.amount, op.bankAccount);
        }
        processed.push(op.id);
      } catch {}
    }

    const remaining = operations.filter((op) => !processed.includes(op.id));
    await saveToDB('pending_operations', remaining);
    return processed.length;
  },

  async count() {
    const operations = (await getFromDB('pending_operations')) || [];
    return operations.length;
  },

  async clear() {
    await saveToDB('pending_operations', []);
  },
};
