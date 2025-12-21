import { getFromDB, saveToDB, deleteFromDB } from './utils/db.js';

// Na razie authentykacja jest po 'staremu', trzeba zmienić backend an ciasteczka

export const state = {
  async getToken() {
    return await getFromDB('token');
  },

  async setToken(token) {
    await saveToDB('token', token);
  },

  async clearAuth() {
    await deleteFromDB('token');
    await deleteFromDB('userData');
  },

  async isLoggedIn() {
    const token = await this.getToken();
    return !!token;
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
    return (await getFromDB('balanceData')) || {};
  },

  async setBalanceData(balanceData) {
    await saveToDB('balanceData', balanceData);
  },

  async getBalance(currencyCode) {
    const balanceData = await this.getBalanceData();
    return Number(balanceData[currencyCode].balance || 0);
  },
};
