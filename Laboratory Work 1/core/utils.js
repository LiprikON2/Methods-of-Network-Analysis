export const getSessionStorageData = (key) => {
    return JSON.parse(sessionStorage.getItem(key));
};

export const setSessionStorageData = (key, value) => {
    sessionStorage.setItem(key, JSON.stringify(value));
};

export const getLocalStorageData = (key) => {
    return JSON.parse(localStorage.getItem(key));
};

export const setLocalStorageData = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const delayFetch = (url, options) =>
    new Promise((resolve) => {
        setTimeout(() => {
            resolve(fetch(url, options));
        }, options.delay);
    });

export const fetchFromVk = async (method, params, apiKey, delay = 0) => {
    params = { ...params, v: "5.131" };
    const res = await delayFetch(
        `http://localhost:8010/proxy/method/${method}?` + new URLSearchParams(params),
        {
            delay,
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        }
    );

    const data = await res.json();
    if ("error" in data) throw new Error(data.error.error_msg);
    return data;
};

export const fetchAllItems = async (callback, maxItemCount = 1000) => {
    let items = [];
    let targetItemCount = 1;
    while (items.length < targetItemCount && items.length < maxItemCount) {
        const data = await callback(items.length);
        items = [...items, ...data.response.items];
        targetItemCount = data.response.count;
    }

    return items;
};

export const fetchAndStoreData = async (dataKey, apiKey, callback) => {
    console.log("Refetching data...");
    let data = getSessionStorageData(dataKey);
    if (!data) {
        data = await callback();
        setSessionStorageData(dataKey, data);
    }
    return data;
};

export const sortPropertiesByValue = (object) => {
    const keys = Object.keys(object);
    const valuesIndex = keys.map((key) => ({ key, value: object[key] }));

    valuesIndex.sort((a, b) => b.value - a.value); // reverse sort

    const newObject = {};

    for (const item of valuesIndex) {
        newObject[item.key] = item.value;
    }

    return newObject;
};
