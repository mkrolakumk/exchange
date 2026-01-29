import { getFromDB, saveToDB, deleteFromDB } from './utils/db.js';

export const state = {
  async clearAuth() {
    await deleteFromDB('userData');
    await deleteFromDB('balanceData');
    await deleteFromDB('pending_operations');
  },

  async isLoggedIn() {
    const user = await this.getUser();
    return !!user;
  },

  async getUser() {
    return await getFromDB('userData');
  },

  async setUser(user) {
    await saveToDB('userData', user);
  },

  async setPrices(prices) {
    await saveToDB('previousPrices', await this.getPrices());
    await saveToDB('prices', prices);
  },

  async getPrices() {
    return await getFromDB('prices');
  },

  async getPreviousPrices() {
    return await getFromDB('previousPrices');
  },

  async clearPrices() {
    await deleteFromDB('prices');
    await deleteFromDB('previousPrices');
  },

  async getCurrencies() {
    return await getFromDB('currencies');
  },

  async setCurrencies(currencies) {
    await saveToDB('currencies', currencies);
  },

  async getBalanceData() {
    try {
      return await getFromDB('balanceData');
    } catch (error) {
      return {};
    }
  },

  async setBalanceData(balanceData) {
    await saveToDB('balanceData', balanceData);
  },

  async getBalance(currencyCode) {
    const balanceData = await this.getBalanceData();
    if (!balanceData || !balanceData[currencyCode]) {
      return 0;
    }
    return Number(balanceData[currencyCode].balance || 0);
  },
};
