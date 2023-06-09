import apiJson from "../secrets/api.json";
import cytoscape from "cytoscape";
import spread from "cytoscape-spread";
import Dexie from "dexie";
import cola from "cytoscape-cola";
import fcose from "cytoscape-fcose";
import Chart from "chart.js/auto";

import { fetchFromVk, fetchAllItems, colorArray } from "./utils";
import "../style.css";

cytoscape.use(fcose);
cytoscape.use(cola);
spread(cytoscape);

const { api } = apiJson;

const aGroupId = "ij_salt";
const bGroupId = "itmem";
// https://qna.habr.com/q/274430
const aGroupOwnerId = "-204380239";
const bGroupOwnerId = "-127149194";

const db = new Dexie("vkApiDb");
db.version(1).stores({
    groups: "id,ownerId,groupUsers,users",
});

try {
    await db.groups.add({
        id: aGroupId,
        ownerId: aGroupOwnerId,
        groupUsers: [],
        users: [],
    });
} catch (error) {}

try {
    await db.groups.add({
        id: bGroupId,
        ownerId: bGroupOwnerId,
        groupUsers: [],
        users: [],
    });
} catch (error) {}

let aGroupTable = await db.groups.get({ id: aGroupId });
let bGroupTable = await db.groups.get({ id: bGroupId });

if (!aGroupTable.groupUsers.length) {
    console.log("refetching 'a' group users...");

    const aGroupUsers = await fetchAllItems(
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
    );

    db.groups.update(aGroupId, { groupUsers: aGroupUsers });
    aGroupTable = await db.groups.get({ id: aGroupId });
}
console.log("aGroupTable", aGroupTable);

if (!bGroupTable.groupUsers.length) {
    console.log("refetching 'b' group users...");

    const bGroupUsers = await fetchAllItems(
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
    );

    db.groups.update(bGroupId, { groupUsers: bGroupUsers });
    bGroupTable = await db.groups.get({ id: bGroupId });
}
console.log("bGroupTable", bGroupTable);

const aGroupUsersSubset = aGroupTable.groupUsers.slice(0, 5000);
console.log("aGroupUsersSubset", aGroupUsersSubset);

const bGroupUsersSubset = bGroupTable.groupUsers.slice(0, 1600);
console.log("bGroupUsersSubset", bGroupUsersSubset);

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

// Deleting data from db
// db.groups.update(aGroupId, { groupUsers: [], users: {} });
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
        },
    }));

    return nodes;
};
const aGroupNodes = makeNodes(aGroupUsersSubset, "a");
console.log("aGroupNodes", aGroupNodes);

const bGroupNodes = makeNodes(bGroupUsersSubset, "b");
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

const aGroupUserFriends = Object.fromEntries(
    Object.entries(aGroupTable.users).filter(([user]) =>
        aGroupTable.groupUsers.includes(parseInt(user))
    )
);
const bGroupUserFriends = Object.fromEntries(
    Object.entries(bGroupTable.users).filter(([user]) =>
        bGroupTable.groupUsers.includes(parseInt(user))
    )
);

let aGroupEdges = connectGroupFriends(aGroupUserFriends, "a");
console.log("aGroupEdges", aGroupEdges);

let bGroupEdges = connectGroupFriends(bGroupUserFriends, "b");
console.log("bGroupEdges", bGroupEdges);

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
            selector: "node[prefix='b']",
            style: {
                "background-color": "#ff6384",
            },
        },
        {
            selector: "node[closeness > 0.85]",
            style: {
                shape: "hexagon",
                "z-index": 1000,
                height: 10,
                width: 10,
                "font-size": "0.2em",

                "background-color": "#1B62F2",
                "text-outline-color": "black",
                "text-outline-width": "0.25 ",
            },
        },
        {
            selector: "node[[degree > 140]]",
            style: {
                shape: "star",
                "z-index": 1000,
                height: 20,
                width: 20,
                "font-size": "0.2em",

                "background-color": "white",
                "text-outline-color": "black",
                "text-outline-width": "0.25 ",
            },
        },
        // {
        //     selector: "node[closeness]",
        //     style: {
        //         label: "data(closeness)",
        //     },
        // },

        {
            selector: "edge",
            style: {
                width: 0.125,
                // width: 0.5,
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
            selector: "edge.marked",
            style: {
                width: 0.3,
                "line-color": "white",
            },
        },
    ],
    elements: {
        // nodes: [...aGroupNodes],
        // edges: aGroupEdges,
        nodes: [...bGroupNodes],
        edges: bGroupEdges,
    },
});

// Рассчитайте максимальное, минимальное и среднее значение степени нодов графа
const minNodeDegree = cy.nodes().minDegree();
console.log("minNodeDegree", minNodeDegree);

const maxNodeDegree = cy.nodes().maxDegree();
console.log("maxNodeDegree", maxNodeDegree);

const avgNodeDegree = cy.nodes().totalDegree() / cy.nodes().length;
console.log("avgNodeDegree", avgNodeDegree);

const degreeDistributionFn = (cy, k) => {
    const n_k = cy.nodes().filter((node) => {
        return node.degree() === k;
    }).length;

    return n_k;
};

const plotDegreeDistribution = (cy) => {
    const minNodeDegree = cy.nodes().minDegree();
    const maxNodeDegree = cy.nodes().maxDegree();

    const data = [];
    for (let k = minNodeDegree; k <= maxNodeDegree; k++) {
        const n_k = degreeDistributionFn(cy, k);
        data.push({ x: k, y: n_k });
    }

    return data;
};

const groupDegreeDistDataset = {
    label: '"B" Group',
    data: plotDegreeDistribution(cy),
    borderWidth: 1,
    backgroundColor: "#4bc0c0",
    // backgroundColor: "#ff6384",
};

const chartData = {
    datasets: [groupDegreeDistDataset],
};
Chart.defaults.color = "#c4c4c4";
Chart.defaults.borderColor = "#666";

const chart = new Chart(document.getElementById("chart-canvas"), {
    type: "scatter",
    data: chartData,
    options: {
        plugins: {
            title: {
                display: true,
                text: "Degree distribution",
            },
        },
        responsive: true,
        scales: {
            x: {
                stacked: true,
                title: {
                    text: "k",
                    display: true,
                    align: "start",
                },
            },
            y: {
                stacked: true,
                title: {
                    text: "P(k)",
                    display: true,
                    align: "start",
                },
            },
        },
    },
});

const clusterCoefficientFn = (node) => {
    const neighbors = node.neighborhood().nodes();
    const k_i = neighbors.length;

    if (k_i < 2) {
        return 0;
    } else {
        const edges = node.connectedEdges().intersection(neighbors.connectedEdges());
        const n_i = edges.length;

        const coef = (2 * n_i) / (k_i * (k_i - 1));
        return coef;
    }
};

const calcClusterCoefficient = (cy) => {
    const clusterCoefs = cy.nodes().map(clusterCoefficientFn);
    const avgClusterCoef = clusterCoefs.reduce((acc, num) => acc + num, 0) / clusterCoefs.length;
    return avgClusterCoef;
};

const avgClusterCoef = calcClusterCoefficient(cy);
console.log("avgClusterCoef", avgClusterCoef);

const makeFancyLayout = false;

if (makeFancyLayout) {
    const layout1 = cy.makeLayout({ name: "fcose", animate: false });
    const layout2 = cy.makeLayout({ name: "spread", prelayout: false, animate: false });

    const run = (l) => {
        const p = l.promiseOn("layoutstop");

        l.run();

        return p;
    };
    Promise.resolve()
        .then(() => {
            return run(layout1);
        })
        .then(() => {
            return run(layout2);
        })
        .then(() => {
            console.log("Clustering...");
            const ccn = cy.elements().closenessCentralityNormalized();
            cy.nodes().forEach((n) => {
                n.data({
                    closeness: ccn.closeness(n),
                });
            });

            let clusters = cy.elements().kMeans({
                k: 50,
                attributes: [(node) => node.data("closeness")],
            });
            // Filter out empty collections
            clusters = clusters.filter((cluster) => cluster.size() >= 3);
            console.log("clusters", clusters);

            // Рассчитайте модулярность графа
            const nodes = cy.nodes().map((node) => node.data("id"));
            const edges = cy.edges().map((edge) => ({
                source: edge.data("source"),
                target: edge.data("target"),
                // weight: edge.source().data("closeness"),
                weight: edge.source().degree(),
            }));

            console.log("nodes", nodes);
            console.log("edges", edges);

            // https://stackoverflow.com/a/49898854
            const community = jLouvain().nodes(nodes).edges(edges)();
            console.log("community", community);
            const { communities, modularity } = community;

            console.log("modularity", modularity);

            // Assign random colors to each community
            Object.entries(communities).forEach(([nodeId, communityId]) => {
                const communityColor = colorArray[communityId % colorArray.length];
                const node = cy.nodes(`[id="${nodeId}"]`);
                if (node.degree() > 1) {
                    node.style("background-color", communityColor);
                }
            });

            const mainEdges = cy.edges().filter((edge) => {
                return (
                    edge.target().data("closeness") > 0.85 || edge.target().data("degree ") > 140
                );
            });
            mainEdges.addClass("marked");
            // console.log("mainEdges", mainEdges.length, mainEdges);
        })
        .then(() => {
            console.log("done!");
        });
}
