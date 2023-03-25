import apiJson from "../secrets/api.json";
import cytoscape from "cytoscape";
import spread from "cytoscape-spread";
import Dexie from "dexie";
import Chart from "chart.js/auto";

import { fetchFromVk, fetchAllItems, fetchAndStoreData, sortPropertiesByValue } from "./utils";
import "../style.css";

spread(cytoscape);
const { api } = apiJson;

const aGroupId = "ij_salt";
const bGroupId = "itmem";
// https://qna.habr.com/q/274430
const aGroupOwnerId = "-204380239";
const bGroupOwnerId = "-127149194";

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
// Dexie.delete("vkApiDb");
const db = new Dexie("vkApiDb");
db.version(1).stores({
    groups: "id,ownerId,users,posts",
});

try {
    await db.groups.add({
        id: aGroupId,
        ownerId: aGroupOwnerId,
        users: aGroupUsers,
        posts: [],
    });
} catch (error) {}

try {
    await db.groups.add({
        id: bGroupId,
        ownerId: bGroupOwnerId,
        users: bGroupUsers,
        posts: [],
    });
} catch (error) {}

let aGroupTable = await db.groups.get({ id: aGroupId });
let bGroupTable = await db.groups.get({ id: bGroupId });

if (!aGroupTable.posts.length) {
    console.log("refetching posts...");
    const aGroupPosts = await fetchAllItems(
        async (offset) =>
            await fetchFromVk(
                "wall.get",
                {
                    owner_id: aGroupOwnerId,
                    count: 100,
                    offset,
                },
                api,
                1000
            ),
        2000
    );
    db.groups.update(aGroupId, { posts: aGroupPosts });
    aGroupTable = await db.groups.get({ id: aGroupId });
}

if (!bGroupTable.posts.length) {
    console.log("refetching posts...");
    const bGroupPosts = await fetchAllItems(
        async (offset) =>
            await fetchFromVk(
                "wall.get",
                {
                    owner_id: bGroupOwnerId,
                    count: 100,
                    offset,
                },
                api,
                1000
            ),
        2000
    );
    db.groups.update(bGroupId, { posts: bGroupPosts });
    bGroupTable = await db.groups.get({ id: bGroupId });
}

console.log("aGroupTable", aGroupTable);
console.log("bGroupTable", bGroupTable);

// Используются ли в постах хэштеги? Если используются, то
// составьте топ хэштегов по встречаемости для каждой группы,
// визуализируйте полученные результаты. Сравните списки на предмет пересечений.
const getPostsHashtags = (posts) => {
    const hashtags = {};

    posts.forEach((post) => {
        // Example output: ["#foo", "#bar", "#baz", "#привет"]
        const postHashtags = post.text.match(/#[\w|а-яА-Я]+(?=\s|$)/g);
        if (postHashtags) {
            postHashtags.forEach((postHashtag) =>
                !(postHashtag in hashtags)
                    ? (hashtags[postHashtag] = 1)
                    : (hashtags[postHashtag] += 1)
            );
        }
    });
    return sortPropertiesByValue(hashtags);
};

const aGroupHashtags = getPostsHashtags(aGroupTable.posts);
const bGroupHashtags = getPostsHashtags(bGroupTable.posts);

console.log("aGroupHashtags", aGroupHashtags, aGroupHashtags[Object.keys(aGroupHashtags)[0]]);
console.log("bGroupHashtags", bGroupHashtags, bGroupHashtags[Object.keys(bGroupHashtags)[0]]);

const displayTopHashtags = (hashtags, top = 5) => {
    const topHashtags = Object.entries(hashtags).slice(0, top);

    return `\
        <ol>
            ${topHashtags.map(([key, value]) => `<li>${key}: ${value}</li>`).join("")}
        </ol>
    `;
};

document.getElementById("a-group").innerHTML = `\
<span>"A" Group - Top 5 hashtags</span>
${displayTopHashtags(aGroupHashtags)}
`;

document.getElementById("b-group").innerHTML = `\
<span>"B" Group - Top 5 hashtags</span>
${displayTopHashtags(bGroupHashtags)}
`;

// Посчитайте количество постов за каждый час суток для обоих сообществ, визуализируйте результаты.
// В какое время суток наиболее активны участники социальных групп?
// Совпадают ли часы с наибольшей активностью для обоих сообществ?

const groupByHour = (posts) => {
    const hours = Array.from(Array(24).keys());
    // {0: 0, 1: 0:, ..., 23: 0}
    const postsByHourCount = hours.reduce((a, v) => ({ ...a, [v]: 0 }), {});

    posts.forEach((post) => {
        const postDate = new Date(post.date * 1000);
        const postHour = postDate.getHours();
        postsByHourCount[postHour] += 1;
    });
    return postsByHourCount;
};

const aGroupPostsByHour = groupByHour(aGroupTable.posts);
const bGroupPostsByHour = groupByHour(bGroupTable.posts);

console.log("aGroupPostsByHour", aGroupPostsByHour);
console.log("bGroupPostsByHour", bGroupPostsByHour);

console.log("test", Object.values(aGroupPostsByHour));

const groupHoursChart = document.getElementById("chart-canvas");

const chartData = {
    labels: Object.keys(aGroupPostsByHour),
    datasets: [
        {
            label: '"A" Group Posts',
            data: Object.values(aGroupPostsByHour),
            borderWidth: 1,
            backgroundColor: "#4bc0c0",
        },
        {
            label: '"B" Group Posts',
            data: Object.values(bGroupPostsByHour),
            backgroundColor: "#ff6384",
        },
    ],
};

const chart = new Chart(groupHoursChart, {
    type: "bar",
    data: chartData,
    options: {
        plugins: {
            title: {
                display: true,
                text: "Posts per hour",
            },
        },
        responsive: true,
        // maintainAspectRatio: false,
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
            },
        },
    },
});

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
