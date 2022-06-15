chrome.runtime.onMessage.addListener(async (request) => {
    if (request.message === "generate") {
        // Clear any previous performance marks and measures
        performance.clearMarks();
        performance.clearMeasures();

        const iterations = [ 1, 10, 100, 1000 ];

        for (let i = 0; i < 4; i++) {
            await benchmarkChromeLocalStorage(iterations[i]);
        }

        for (let i = 0; i < 4; i++) {
            await benchmarkIndexedDB(iterations[i]);
        }
    }
});

benchmarkChromeLocalStorage = async (iterations) => {
    // Clear any previous entries in local storage
    await chrome.storage.local.clear();

    performance.mark(`startChromeLocalStorageSet${iterations}`);
    for (let i = 0; i < iterations; i++) {
        await chrome.storage.local.set({ [`benchmarkKey-${iterations}-${i}`]: `benchmarkValue${i}` }, );
    }
    performance.mark(`stopChromeLocalStorageSet${iterations}`);

    performance.measure(
        `chromeLocalStorageSet${iterations}`,
        `startChromeLocalStorageSet${iterations}`,
        `stopChromeLocalStorageSet${iterations}`
    );

    const localStorageSet = performance.getEntriesByName(`chromeLocalStorageSet${iterations}`)[0];

    console.log(
        `chrome.storage.local (async) set for ${iterations} entries: ${JSON.stringify(
            localStorageSet.duration
        )}ms`
    );

    const localStorageValues = [];
    performance.mark(`startChromeLocalStorageGet${iterations}`);
    for (let i = 0; i < iterations; i++) {
        localStorageValues.push(
            await chrome.storage.local.get(`benchmarkKey-${iterations}-${i}`)
        );
    }
    performance.mark(`stopChromeLocalStorageGet${iterations}`);

    if (!(localStorageValues?.length === iterations)) {
        console.error(`Not all chrome.storage.local entries were successfully saved for ${iterations} iterations.`)
    }

    performance.measure(
        `chromeLocalStorageGet${iterations}`,
        `startChromeLocalStorageGet${iterations}`,
        `stopChromeLocalStorageGet${iterations}`
    );

    const localStorageGet = performance.getEntriesByName(`chromeLocalStorageGet${iterations}`)[0];

    console.log(
        `chrome.storage.local (async) get for ${iterations} entries: ${JSON.stringify(
            localStorageGet.duration
        )}ms`
    );
}

const DB_NAME = "benchmarkIndexedDB";
const OBJECT_STORE_NAME = "benchmarkValues";

benchmarkIndexedDB = async (iterations) => {
    const databaseRequest = globalThis.indexedDB.open(this.DB_NAME, 1);

    databaseRequest.onerror = () => {
        throw new Error(`Unable to open the database: ${this.DB_NAME}`);
    };

    databaseRequest.onupgradeneeded = () => {
        const database = databaseRequest.result;
        if (!database.objectStoreNames.contains(this.OBJECT_STORE_NAME)) {
            database.createObjectStore(this.OBJECT_STORE_NAME);
        }
    };

    databaseRequest.onsuccess = async () => {
        const database = databaseRequest.result;

        const objectStore = database
            .transaction([this.OBJECT_STORE_NAME], "readwrite")
            .objectStore(this.OBJECT_STORE_NAME);

        // Clear any previous records that may exist in the object store
        objectStore.clear();

        performance.mark(`startIndexedDBPut${iterations}`);
        for (let i = 0; i < iterations; i++) {
            await objectStorePut(
                objectStore,
                `benchmarkValue${i}`,
                `benchmarkKey-${iterations}-${i}`
            );
        }
        performance.mark(`stopIndexedDBPut${iterations}`);

        performance.measure(
        `indexedDBPut${iterations}`,
        `startIndexedDBPut${iterations}`,
        `stopIndexedDBPut${iterations}`
        );

        const indexedDBPut = performance.getEntriesByName(`indexedDBPut${iterations}`)[0];

        console.log(
            `IndexedDB (async) set for ${iterations} entries: ${JSON.stringify(
                indexedDBPut.duration
            )}ms`
        );

        const indexedDBValues = [];
        performance.mark(`startIndexedDBGet${iterations}`);
        for (let i = 0; i < iterations; i++) {
            indexedDBValues.push(
                await objectStoreGet(objectStore, `benchmarkKey-${iterations}-${i}`)
            );
        }
        performance.mark(`stopIndexedDBGet${iterations}`);

        if (!(indexedDBValues?.length === iterations)) {
            console.error(`Not all IndexedDB entries were successfully saved for ${iterations} iterations.`)
        }

        performance.measure(
        `indexedDBGet${iterations}`,
        `startIndexedDBGet${iterations}`,
        `stopIndexedDBGet${iterations}`
        );

        const indexedDBGet = performance.getEntriesByName(`indexedDBGet${iterations}`)[0];

        console.log(
            `IndexedDB (async) get for ${iterations} entries: ${JSON.stringify(
                indexedDBGet.duration
            )}ms`
        );
    };

    objectStoreGet = async (objectStore, key) => {
        return new Promise((resolve, reject) => {
            const objectStoreRequest = objectStore.get(key);
    
            objectStoreRequest.onsuccess = () => {
                resolve(objectStoreRequest.result);
            };
    
            objectStoreRequest.onerror = () => {
                reject();
            };
        });
    }
    
    objectStorePut = async (objectStore, key, value) => {
        return new Promise((resolve, reject) => {
            const objectStoreRequest = objectStore.put(value, key);
    
            objectStoreRequest.onsuccess = () => {
                resolve();
            };
    
            objectStoreRequest.onerror = () => {
                reject();
            };
        });
    }
}