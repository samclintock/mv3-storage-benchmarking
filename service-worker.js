const benchmarkStorageApi = async (rowsInserted, getAndSet = false) => {
    // Clear any previous entries in chrome.storage.local
    await chrome.storage.local.clear();

    performance.mark(`startStorageApiSet${rowsInserted}`);

    for (let i = 0; i < rowsInserted; i++) {
        await chrome.storage.local.set({ [`benchmarkKey-${rowsInserted}-${i}`]: `benchmarkValue${i}` }, );
    }

    performance.mark(`stopStorageApiSet${rowsInserted}`);

    performance.measure(
        `storageApiSet${rowsInserted}`,
        `startStorageApiSet${rowsInserted}`,
        `stopStorageApiSet${rowsInserted}`
    );

    if (!getAndSet) {
        return formatDuration(performance.getEntriesByName(`storageApiSet${rowsInserted}`)[0].duration);
    }

    const storageApiData = [];

    performance.mark(`startStorageApiGet${rowsInserted}`);

    for (let i = 0; i < rowsInserted; i++) {
        storageApiData.push(
            await chrome.storage.local.get(`benchmark-${rowsInserted}-${i}`)
        );
    }

    performance.mark(`stopStorageApiGet${rowsInserted}`);

    if (!(storageApiData?.length === rowsInserted)) {
        console.error(`Not all storage entries were saved for ${rowsInserted} iterations.`)
    }

    performance.measure(
        `storageApiGet${rowsInserted}`,
        `startStorageApiGet${rowsInserted}`,
        `stopStorageApiGet${rowsInserted}`
    );

    return formatDuration(performance.getEntriesByName(`storageApiGet${rowsInserted}`)[0].duration);
}

const benchmarkIndexedDb = async (rowsInserted, getAndSet = false) => {
    return new Promise((resolve, reject) => {
        const dbName = "benchmarks";
        const objectStoreName = "values";
        const dbRequest = globalThis.indexedDB.open(dbName, 1);

        dbRequest.onerror = () => {
            reject(`Unable to open the database: ${dbName}`);
        };

        dbRequest.onupgradeneeded = () => {
            const db = dbRequest.result;

            if (!db.objectStoreNames.contains(objectStoreName)) {
                db.createObjectStore(objectStoreName);
            }
        };

        dbRequest.onsuccess = async () => {
            const db = dbRequest.result;

            const objectStore = db
                .transaction([objectStoreName], "readwrite")
                .objectStore(objectStoreName);

            // Clear any previous records that may exist in the object store
            objectStore.clear();

            performance.mark(`startIndexedDbSet${rowsInserted}`);

            for (let i = 0; i < rowsInserted; i++) {
                await objectStorePut(
                    objectStore,
                    `benchmarkValue${i}`,
                    `benchmarkKey-${rowsInserted}-${i}`
                );
            }

            performance.mark(`stopIndexedDbSet${rowsInserted}`);

            performance.measure(
                `indexedDbSet${rowsInserted}`,
                `startIndexedDbSet${rowsInserted}`,
                `stopIndexedDbSet${rowsInserted}`
            );

            if (!getAndSet) {
                resolve(formatDuration(performance.getEntriesByName(`indexedDbSet${rowsInserted}`)[0].duration));
            }

            const indexedDbData = [];

            performance.mark(`startIndexedDbGet${rowsInserted}`);

            for (let i = 0; i < rowsInserted; i++) {
                indexedDbData.push(
                    await objectStoreGet(objectStore, `benchmarkKey-${rowsInserted}-${i}`)
                );
            }

            performance.mark(`stopIndexedDbGet${rowsInserted}`);

            if (!(indexedDbData?.length === rowsInserted)) {
                console.error(`Not all IndexedDB entries were saved for ${rowsInserted} iterations.`)
            }

            performance.measure(
                `indexedDbGet${rowsInserted}`,
                `startIndexedDbGet${rowsInserted}`,
                `stopIndexedDbGet${rowsInserted}`
            );

            resolve(formatDuration(performance.getEntriesByName(`indexedDbGet${rowsInserted}`)[0].duration));
        }

        const objectStorePut = async (objectStore, key, value) => {
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

        const objectStoreGet = async (objectStore, key) => {
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
    });
}

const formatDuration = (duration) => Math.round(duration * 100) / 100;

let benchmarks = [];

(async () => {
    // Clear any previous performance marks and measures
    performance.clearMarks();
    performance.clearMeasures();

    benchmarks = [
        {
            rowsInserted: 1,
            operation: "set",
            storageApi: await benchmarkStorageApi(1),
            indexedDB: await benchmarkIndexedDb(1)
        },
        {
            rowsInserted: 10,
            operation: "set",
            storageApi: await benchmarkStorageApi(10),
            indexedDB: await benchmarkIndexedDb(10)
        },
        {
            rowsInserted: 100,
            operation: "set",
            storageApi: await benchmarkStorageApi(100),
            indexedDB: await benchmarkIndexedDb(100)
        },
        {
            rowsInserted: 1000,
            operation: "set",
            storageApi: await benchmarkStorageApi(1000),
            indexedDB: await benchmarkIndexedDb(1000)
        },
        {
            rowsInserted: 1,
            operation: "get",
            storageApi: await benchmarkStorageApi(1, true),
            indexedDB: await benchmarkIndexedDb(1, true)
        },
        {
            rowsInserted: 10,
            operation: "get",
            storageApi: await benchmarkStorageApi(10, true),
            indexedDB: await benchmarkIndexedDb(10, true)
        },
        {
            rowsInserted: 100,
            operation: "get",
            storageApi: await benchmarkStorageApi(100, true),
            indexedDB: await benchmarkIndexedDb(100, true)
        },
        {
            rowsInserted: 1000,
            operation: "get",
            storageApi: await benchmarkStorageApi(1000, true),
            indexedDB: await benchmarkIndexedDb(1000, true)
        },
    ];

    console.log("Benchmark data stored in the variable \"benchmarks\".");
    console.log("Execute \"console.table(benchmarks)\" to view the data in tabular form.");
})();