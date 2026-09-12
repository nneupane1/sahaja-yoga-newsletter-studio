export const databaseName = "sy-newsletter-preview-v1";
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("records");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function browserStore() {
  const database = await openDatabase();
  return {
    get(key) {
      return new Promise((resolve, reject) => {
        const request = database.transaction("records").objectStore("records").get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    set(key, value) {
      return new Promise((resolve, reject) => {
        const tx = database.transaction("records", "readwrite");
        tx.objectStore("records").put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || Error("Browser storage is unavailable"));
      });
    },
  };
}
