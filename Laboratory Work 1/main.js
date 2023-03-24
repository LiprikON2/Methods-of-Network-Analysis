import apiJson from "./secrets/api.json";
import cytoscape from "cytoscape";
import spread from "cytoscape-spread";
import Dexie from "dexie";

import "./style.css";

spread(cytoscape);
const { api } = apiJson;

const getSessionStorageData = (key) => {
    return JSON.parse(sessionStorage.getItem(key));
};

const setSessionStorageData = (key, value) => {
    sessionStorage.setItem(key, JSON.stringify(value));
};

const getLocalStorageData = (key) => {
    return JSON.parse(localStorage.getItem(key));
};

const setLocalStorageData = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const delayFetch = (url, options) =>
    new Promise((resolve) => {
        setTimeout(() => {
            resolve(fetch(url, options));
        }, options.delay);
    });

const fetchFromVk = async (method, params, apiKey, delay = 0) => {
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

const fetchAllItems = async (callback, maxItemCount = 1000) => {
    let items = [];
    let targetItemCount = 1;
    while (items.length < targetItemCount && items.length < maxItemCount) {
        const data = await callback(items.length);
        items = [...items, ...data.response.items];
        targetItemCount = data.response.count;
    }

    return items;
};

const aGroupId = "ij_salt";
const bGroupId = "itmem";
// https://qna.habr.com/q/274430
const aGroupOwnerId = "-204380239";
const bGroupOwnerId = "-127149194";

const fetchAndStoreData = async (dataKey, apiKey, callback) => {
    let data = getSessionStorageData(dataKey);
    if (!data) {
        data = await callback();
        setSessionStorageData(dataKey, data);
    }
    return data;
};

// Сохраните списки участников выбранных сообществ.
const aGroupUsers = await fetchAndStoreData(
    aGroupId,
    api,
    async () =>
        await fetchAllItems(
            async (offset) =>
                await fetchFromVk(
                    "groups.getMembers",
                    {
                        group_id: aGroupId,
                        offset,
                    },
                    api,
                    1000
                ),
            100000
        )
);
const bGroupUsers = await fetchAndStoreData(
    bGroupId,
    api,
    async () =>
        await fetchAllItems(
            async (offset) =>
                await fetchFromVk(
                    "groups.getMembers",
                    {
                        group_id: bGroupId,
                        offset,
                    },
                    api,
                    1000
                ),

            100000
        )
);

console.log("aGroupUsers", aGroupUsers);
console.log("bGroupUsers", bGroupUsers);

// Есть ли пользователи, относящиеся к обоим сообществам?
const abGroupUsers = aGroupUsers.filter((user) => bGroupUsers.includes(user));

console.log("abGroupUsers", abGroupUsers);

// Сохраните последние 2000 постов каждого из сообществ

// TODO: CHECK IN DB BEFORE FETCHING
const aGroupPosts = [];
// const aGroupPosts = await fetchAllItems(
//     async (offset) =>
//         await fetchFromVk(
//             "wall.get",
//             {
//                 owner_id: aGroupOwnerId,
//                 count: 100,
//                 offset,
//             },
//             api,
//             1000
//         ),
//     2000
// );

Dexie.delete("vkApiDb");
const db = new Dexie("vkApiDb");
db.version(1).stores({
    groups: "id,ownerId,users,posts",
});

try {
    await db.groups.add({
        id: aGroupId,
        ownerId: aGroupOwnerId,
        users: aGroupUsers,
        posts: aGroupPosts,
    });
} catch (error) {}

console.log("db", await db.groups.toArray());

// console.log("aGroupPosts", aGroupPosts);

// +++++++++++++++++++++++++++++++++++++++++++++++++
// const graphUsers = (users) => {
//     const nodes = users.map((userId) => ({ data: { id: userId, label: "user" + userId } }));

//     return [nodes, []];
// };
// const [nodes, edges] = graphUsers(aGroupUsers);
// console.log("nodes", nodes);

// const cy = cytoscape({
//     container: document.getElementById("cy"),
//     minZoom: 0.9,
//     maxZoom: 5,
//     style: [
//         {
//             selector: "node",
//             style: {
//                 "background-color": "#c9732c",

//                 label: "data(label)",
//                 color: "white",
//                 "font-size": "0.6em",
//                 "text-outline-width": "1.5px",
//                 "text-outline-color": "black",
//             },
//         },
//         {
//             selector: "edge",
//             style: {
//                 width: 3,
//                 "line-color": "#f2ab1b",
//                 "target-arrow-color": "#f2ab1b",
//                 "curve-style": "bezier",
//                 content: "data(label)",
//                 color: "#cccccc",
//                 "font-size": "0.75em",
//                 "text-outline-width": "1px",
//                 "text-outline-color": "black",
//             },
//         },
//         {
//             selector: "edge[?marked]",
//             style: {
//                 "line-color": "#e8eacd",
//                 width: 5,
//             },
//         },
//     ],
//     elements: {
//         nodes,
//         edges,
//     },
// });

// const layout = cy.makeLayout({ name: "spread", prelayout: false, padding: 20 });
// layout.run();

// document.getElementById("data").innerText = `\
// Hmm
// `;

// document.getElementById("output").innerText = `\
// Later
// `;
