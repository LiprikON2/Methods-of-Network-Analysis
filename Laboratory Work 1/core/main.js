import apiJson from "../secrets/api.json";
import cytoscape from "cytoscape";
import spread from "cytoscape-spread";
import Dexie from "dexie";
import Chart from "chart.js/auto";
import cola from "cytoscape-cola";
import fcose from "cytoscape-fcose";

import { fetchFromVk, fetchAllItems, fetchAndStoreData, sortPropertiesByValue } from "./utils";
import "../style.css";

// cytoscape.use(fcose);
// cytoscape.use(cola);
// spread(cytoscape);

const { api } = apiJson;

const aGroupId = "ij_salt";
const bGroupId = "itmem";
// https://qna.habr.com/q/274430
const aGroupOwnerId = "-204380239";
const bGroupOwnerId = "-127149194";

// Сохраните списки участников выбранных сообществ.
const aGroupUsers = await fetchAndStoreData(
    aGroupId,
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
                    200
                ),
            100000
        )
);
const bGroupUsers = await fetchAndStoreData(
    bGroupId,
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
        users: [],
        posts: [],
    });
} catch (error) {}

try {
    await db.groups.add({
        id: bGroupId,
        ownerId: bGroupOwnerId,
        users: [],
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

// Постройте социальные графы для обоих сообществ.
const aGroupUsersSubset = aGroupUsers.slice(0, 5000);
const bGroupUsersSubset = bGroupUsers.slice(0, 5000);

const getUserFriends = async (userId, apiKey) => {
    const data = await fetchFromVk(
        "friends.get",
        {
            user_id: userId,
        },
        apiKey,
        200
    );

    return { [userId]: data.response?.items ?? [] };
};

const getFriends = async (userIds, apiKey) => {
    let usersFriends = {};
    for (let userId of userIds) {
        const userFriends = await getUserFriends(userId, apiKey);
        if (Object.keys(usersFriends).length % 100 === 0)
            console.log(`Progress: ${(Object.keys(usersFriends).length / userIds.length) * 100}%`);
        usersFriends = { ...usersFriends, ...userFriends };
    }
    return usersFriends;
};

// db.groups.update(aGroupId, { users: {} });
// db.groups.update(bGroupId, { users: {} });

if (!Object.keys(aGroupTable.users).length) {
    console.log("refetching user friends...");
    const aGroupUsersFriends = await getFriends(aGroupUsersSubset, api);

    db.groups.update(aGroupId, { users: aGroupUsersFriends });
    aGroupTable = await db.groups.get({ id: aGroupId });
}

if (!Object.keys(bGroupTable.users).length) {
    console.log("refetching user friends...");
    const bGroupUsersFriends = await getFriends(bGroupUsersSubset, api);

    db.groups.update(bGroupId, { users: bGroupUsersFriends });
    bGroupTable = await db.groups.get({ id: bGroupId });
}

console.log("aGroupTable", aGroupTable);
console.log("bGroupTable", bGroupTable);

const makeNodes = (users, prefix = "") => {
    const nodes = users.map((userId) => ({
        data: {
            id: prefix + userId,
            label: prefix + "User" + userId,
            vkId: userId,
            prefix,
            weight: Math.random(),
        },
    }));

    return nodes;
};
const aGroupNodes = makeNodes(aGroupUsersSubset, "a");
const bGroupNodes = makeNodes(bGroupUsersSubset, "b");

console.log("aGroupNodes", aGroupNodes);
console.log("bGroupNodes", bGroupNodes);

const connectGroupFriends = (userFriends, prefix = "") => {
    const groupUsers = Object.keys(userFriends).map((groupUser) => parseInt(groupUser));

    let edges = [];

    for (let [groupUser, groupUserFriends] of Object.entries(userFriends)) {
        for (let groupUserFriend of groupUserFriends) {
            const areFriends =
                groupUsers.findIndex((groupUser) => groupUser === groupUserFriend) !== -1;

            if (areFriends) {
                const edgeId = prefix + groupUser + "-" + prefix + groupUserFriend;
                const coupledEdgeId = prefix + groupUserFriend + "-" + prefix + groupUser;
                // prevents addition of the same edge twice
                const isAlreadyAdded =
                    edges.findIndex((edge) => edge.data.id === coupledEdgeId) !== -1;

                if (!isAlreadyAdded) {
                    const edge = {
                        data: {
                            id: edgeId,
                            label: edgeId,
                            source: prefix + groupUser,
                            target: prefix + groupUserFriend.toString(),
                        },
                    };
                    edges.push(edge);
                }
            }
        }
    }
    return edges;
};

// fix for stale data: filter out users that left the group
const aGroupUserFriends = Object.fromEntries(
    Object.entries(aGroupTable.users)
        .filter(([user]) => aGroupUsers.includes(parseInt(user)))
        .slice(0, 500)
);
const bGroupUserFriends = Object.fromEntries(
    Object.entries(bGroupTable.users).filter(([user]) => bGroupUsers.includes(parseInt(user)))
);

const aGroupEdges = connectGroupFriends(aGroupUserFriends, "a");
const bGroupEdges = connectGroupFriends(bGroupUserFriends, "b");

console.log("aGroupEdges", aGroupEdges);
console.log("bGroupEdges", bGroupEdges);

// const connectNodes = (aNodes, bNodes, byKey = "", keyValues = []) => {
//     let edges = aNodes.map((aNode) => {
//         if (keyValues.includes(aNode.data[byKey])) {
//             const bNode = bNodes.find((bNode) => bNode.data[byKey] === aNode.data[byKey]);
//             return {
//                 data: {
//                     id: aNode.data.id + "-" + bNode.data.id,
//                     label: aNode.data.id + "-" + bNode.data.id,
//                     source: aNode.data.id,
//                     target: bNode.data.id,
//                 },
//             };
//         }
//     });
//     // remove undefined
//     edges = edges.filter((edge) => typeof edge !== "undefined");

//     return edges;
// };

// const edges = connectNodes(aGroupNodes, bGroupNodes, "vkId", abGroupUsers);
// console.log("edges", aGroupEdges);

const cy = cytoscape({
    container: document.getElementById("cy"),
    pixelRatio: 1,
    autoungrabify: true,
    textureOnViewport: true,
    style: [
        {
            selector: "node",
            style: {
                label: "data(label)",
                color: "white",
                "font-size": "0.08em",
                "min-zoomed-font-size": 10,
                height: 5,
                width: 5,
            },
        },
        {
            selector: "node[prefix='a']",
            style: {
                "background-color": "#4bc0c0",
            },
        },
        {
            selector: "node[prefix='b']",
            style: {
                "background-color": "#ff6384",
            },
        },
        {
            selector: "edge",
            style: {
                width: 0.075,
                "line-color": "#f2ab1b",
                "curve-style": "haystack",
                color: "#cccccc",
                "font-size": "0.75em",
                "text-outline-width": "1px",
                "text-outline-color": "black",
                // content: "data(label)",
            },
        },
        {
            selector: "edge[?marked]",
            style: {
                "line-color": "#e8eacd",
                width: 0.15,
            },
        },
    ],
    elements: {
        // nodes: [...aGroupNodes, ...bGroupNodes],
        nodes: [...aGroupNodes.slice(0, 500)],
        edges: aGroupEdges,
        // nodes: [...bGroupNodes],
        // edges: bGroupEdges,
    },
});

// const layoutConfig = {
//     animate: true, // Whether to show the layout as it's running
//     ready: undefined, // Callback on layoutready
//     stop: undefined, // Callback on layoutstop
//     fit: true, // Reset viewport to fit default simulationBounds
//     minDist: 20, // Minimum distance between nodes
//     padding: 20, // Padding
//     expandingFactor: -1.0, // If the network does not satisfy the minDist
//     // criterium then it expands the network of this amount
//     // If it is set to -1.0 the amount of expansion is automatically
//     // calculated based on the minDist, the aspect ratio and the
//     // number of nodes
//     prelayout: false,
//     maxExpandIterations: 4, // Maximum number of expanding iterations
//     boundingBox: undefined, // Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
//     randomize: false, // Uses random initial node positions on true
// };

// const layout = cy.makeLayout({ name: "spread", ...layoutConfig });
// layout.run();

const defaultOptions = {
    // 'draft', 'default' or 'proof'
    // - "draft" only applies spectral layout
    // - "default" improves the quality with incremental layout (fast cooling rate)
    // - "proof" improves the quality with incremental layout (slow cooling rate)
    quality: "draft",
    // Use random node positions at beginning of layout
    // if this is set to false, then quality option must be "proof"
    randomize: true,
    // Whether or not to animate the layout
    animate: false,
    // Duration of animation in ms, if enabled
    animationDuration: 1000,
    // Easing of animation, if enabled
    animationEasing: undefined,
    // Fit the viewport to the repositioned nodes
    fit: true,
    // Padding around layout
    padding: 30,
    // Whether to include labels in node dimensions. Valid in "proof" quality
    nodeDimensionsIncludeLabels: false,
    // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
    uniformNodeDimensions: false,
    // Whether to pack disconnected components - cytoscape-layout-utilities extension should be registered and initialized
    packComponents: true,
    // Layout step - all, transformed, enforced, cose - for debug purpose only
    step: "all",

    /* spectral layout options */

    // False for random, true for greedy sampling
    samplingType: true,
    // Sample size to construct distance matrix
    // sampleSize: 25,
    sampleSize: 5,
    // Separation amount between nodes
    nodeSeparation: 75,
    // Power iteration tolerance
    // piTol: 0.0000001,
    piTol: 0.001,

    /* incremental layout options */

    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: (node) => 4500,
    // Ideal edge (non nested) length
    idealEdgeLength: (edge) => 50,
    // Divisor to compute edge forces
    edgeElasticity: (edge) => 0.45,
    // Nesting factor (multiplier) to compute ideal edge length for nested edges
    nestingFactor: 0.1,
    // Maximum number of iterations to perform - this is a suggested value and might be adjusted by the algorithm as required
    // numIter: 2500,
    numIter: 1,
    // For enabling tiling
    tile: true,
    // The comparison function to be used while sorting nodes during tiling operation.
    // Takes the ids of 2 nodes that will be compared as a parameter and the default tiling operation is performed when this option is not set.
    // It works similar to ``compareFunction`` parameter of ``Array.prototype.sort()``
    // If node1 is less then node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return a negative value
    // If node1 is greater then node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return a positive value
    // If node1 is equal to node2 by some ordering criterion ``tilingCompareBy(nodeId1, nodeId2)`` must return 0
    tilingCompareBy: undefined,
    // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
    tilingPaddingVertical: 10,
    // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
    tilingPaddingHorizontal: 10,
    // Gravity force (constant)
    gravity: 0.25,
    // Gravity range (constant) for compounds
    gravityRangeCompound: 1.5,
    // Gravity force (constant) for compounds
    gravityCompound: 1.0,
    // Gravity range (constant)
    gravityRange: 3.8,
    // Initial cooling factor for incremental layout
    initialEnergyOnIncremental: 0.3,

    /* constraint options */

    // Fix desired nodes to predefined positions
    // [{nodeId: 'n1', position: {x: 100, y: 200}}, {...}]
    fixedNodeConstraint: undefined,
    // Align desired nodes in vertical/horizontal direction
    // {vertical: [['n1', 'n2'], [...]], horizontal: [['n2', 'n4'], [...]]}
    alignmentConstraint: undefined,
    // Place two nodes relatively in vertical/horizontal direction
    // [{top: 'n1', bottom: 'n2', gap: 100}, {left: 'n3', right: 'n4', gap: 75}, {...}]
    relativePlacementConstraint: undefined,

    /* layout event callbacks */
    ready: () => {}, // on layoutready
    stop: () => {}, // on layoutstop
};

// var clusters = cy.elements().markovClustering({
//     attributes: [
//         function (edge) {
//             return edge.data("weight");
//         },
//     ],
// });

// var clusters = cy.elements().kMeans({
//     k: 2,
//     attributes: [
//         function (edge) {
//             return edge.data("weight");
//         },
//     ],
// });

var clusters = cy.elements().ap({
    attributes: [
        function (node) {
            return node.data("weight");
        },
    ],
    distance: "euclidean",
    damping: 0.8,
    preference: "median",
    minIterations: 100,
    maxIterations: 1000,
});

console.log("clusters", clusters);

// Assign random colors to each cluster
for (var c = 0; c < clusters.length; c++) {
    clusters[c].style("background-color", "#" + Math.floor(Math.random() * 16777215).toString(16));
}

// const layout = cy.makeLayout({ name: "fcose" });
// layout.run();
