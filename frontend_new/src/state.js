import { getFromDB, saveToDB, deleteFromDB } from "./utils/db.js";

// Na razie authentykacja jest po 'staremu', trzeba zmienić backend an ciasteczka

export const state = {
  async getToken() {
    return await getFromDB("token");
  },

  async setToken(token) {
    await saveToDB("token", token);
  },

  async clearAuth() {
    await deleteFromDB("token");
    await deleteFromDB("userData");
  },

  async isLoggedIn() {
    const token = await this.getToken();
    return !!token;
  },

  async getUser() {
    return await getFromDB("userData");
  },

  async setUser(user) {
    await saveToDB("userData", user);
  },
};
