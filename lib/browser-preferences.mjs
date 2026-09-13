// Namespacing is data hygiene on a shared browser, not an authentication check.
let account = "";
export function setPreferenceAccount(userId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId)) throw Error("Invalid account scope");
  account = userId;
}
export const studioLocalStorage = {
  getItem(key) { return window.localStorage.getItem(account ? `sy-account:${account}:${key}` : key); },
  setItem(key, value) { window.localStorage.setItem(account ? `sy-account:${account}:${key}` : key, value); },
  removeItem(key) { window.localStorage.removeItem(account ? `sy-account:${account}:${key}` : key); },
};
