import apiJson from "./secrets/api.json";
import cytoscape from "cytoscape";
import spread from "cytoscape-spread";

import "./style.css";

spread(cytoscape);
const { api } = apiJson;

const getSessionStorageData = (key) => {
    return JSON.parse(sessionStorage.getItem(key));
};

const setSessionStorageData = (key, value) => {
    sessionStorage.setItem(key, JSON.stringify(value));
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

    if (!res.ok) throw new Error(res.statusText);
    return { data: await res.json(), ok: res.ok };
};

const getGroupUsers = async (groupId, apiKey, maxCount = 1000) => {
    let users = [];
    let targetCount = 1;
    while (users.length < targetCount && users.length < maxCount) {
        const { data, ok } = await fetchFromVk(
            "groups.getMembers",
            {
                group_id: groupId,
                offset: users.length,
            },
            apiKey,
            1000
        );
        console.log("got data", data);
        users = [...users, ...data.response.items];
        targetCount = data.response.count;
    }

    return users;
};

const graphUsers = (users) => {
    const nodes = users.map((userId) => ({ data: { id: userId, label: "user" + userId } }));

    return [nodes, []];
};

const aGroupId = "ij_salt";
const bGroupId = "itmem";

const fetchAndStoreGroupUsers = async (groupId, apiKey) => {
    let groupUsers = getSessionStorageData(groupId);
    if (!groupUsers) {
        groupUsers = await getGroupUsers(groupId, api, 100000);
        setSessionStorageData(groupId, groupUsers);
    }
    return groupUsers;
};
const aGroupUsers = await fetchAndStoreGroupUsers(aGroupId, api);
const bGroupUsers = await fetchAndStoreGroupUsers(bGroupId, api);

console.log("aGroupUsers", aGroupUsers);
console.log("bGroupUsers", bGroupUsers);

const [nodes, edges] = graphUsers(aGroupUsers);

console.log("nodes", nodes);

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
