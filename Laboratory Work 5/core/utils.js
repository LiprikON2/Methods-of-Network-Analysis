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
    if ("error" in data && ![30, 18].includes(data?.error?.error_code))
        console.log("Error", data.error);
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

export const fetchAndStoreData = async (dataKey, callback) => {
    let data = getSessionStorageData(dataKey);
    if (!data) {
        console.log("Refetching data...");
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

export const normalize = (min, max) => {
    const delta = max - min;
    return (val) => {
        return (val - min) / delta;
    };
};

export const colorArray = [
    "#FF6633",
    "#FFB399",
    "#FF33FF",
    "#FFFF99",
    "#00B3E6",
    "#E6B333",
    "#3366E6",
    "#999966",
    "#99FF99",
    "#B34D4D",
    "#80B300",
    "#809900",
    "#E6B3B3",
    "#6680B3",
    "#66991A",
    "#FF99E6",
    "#CCFF1A",
    "#FF1A66",
    "#E6331A",
    "#33FFCC",
    "#66994D",
    "#B366CC",
    "#4D8000",
    "#B33300",
    "#CC80CC",
    "#66664D",
    "#991AFF",
    "#E666FF",
    "#4DB3FF",
    "#1AB399",
    "#E666B3",
    "#33991A",
    "#CC9999",
    "#B3B31A",
    "#00E680",
    "#4D8066",
    "#809980",
    "#E6FF80",
    "#1AFF33",
    "#999933",
    "#FF3380",
    "#CCCC00",
    "#66E64D",
    "#4D80CC",
    "#9900B3",
    "#E64D66",
    "#4DB380",
    "#FF4D4D",
    "#99E6E6",
    "#6666FF",
];
