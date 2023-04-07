import apiJson from "../secrets/api.json";
import cytoscape from "cytoscape";
import spread from "cytoscape-spread";
import Dexie from "dexie";
import cola from "cytoscape-cola";
import fcose from "cytoscape-fcose";

import { fetchFromVk, fetchAllItems, colorArray } from "./utils";
import "../style.css";

cytoscape.use(fcose);
cytoscape.use(cola);
spread(cytoscape);

const { api } = apiJson;

const bGroupId = "itmem";
// https://qna.habr.com/q/274430
const bGroupOwnerId = "-127149194";

const db = new Dexie("vkApiDb");
db.version(1).stores({
    groups: "id,ownerId,groupUsers,users",
});

try {
    await db.groups.add({
        id: bGroupId,
        ownerId: bGroupOwnerId,
        groupUsers: [],
        users: [],
    });
} catch (error) {}

let bGroupTable = await db.groups.get({ id: bGroupId });

if (!bGroupTable.groupUsers.length) {
    console.log("refetching group users...");

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

// db.groups.update(bGroupId, { users: {} });

if (!Object.keys(bGroupTable.users).length) {
    console.log("refetching user friends...");
    const bGroupUsersFriends = await getFriends(bGroupUsersSubset, api);

    db.groups.update(bGroupId, { users: bGroupUsersFriends });
    bGroupTable = await db.groups.get({ id: bGroupId });
}

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

const bGroupUserFriends = Object.fromEntries(
    Object.entries(bGroupTable.users).filter(([user]) =>
        bGroupTable.groupUsers.includes(parseInt(user))
    )
);

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
            selector: "edge[?marked]",
            style: {
                "line-color": "#e8eacd",
                width: 0.15,
            },
        },
    ],
    elements: {
        nodes: [...bGroupNodes.slice(0, 1600)],
        edges: bGroupEdges,
    },
});

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
    });

// Рассчитайте максимальное, минимальное и среднее значение степени нодов графа
const minNodeDegree = cy.elements().minDegree();
console.log("minNodeDegree", minNodeDegree);

const maxNodeDegree = cy.elements().maxDegree();
console.log("maxNodeDegree", maxNodeDegree);

const avgNodeDegree = cy.elements().totalDegree() / cy.elements().length;
console.log("avgNodeDegree", avgNodeDegree);

// Рассчитайте модулярность графа
// var node_data = ["id1", "id2", "id3"]; // any type of string can be used as id
// var edge_data = [
//     { source: "id1", target: "id2", weight: 10.0 },
//     { source: "id2", target: "id3", weight: 20.0 },
//     { source: "id3", target: "id1", weight: 30.0 },
// ];
// const community = jLouvain().nodes(node_data).edges(edge_data)();
// console.log("community", community);
// const { modularity } = community;

// console.log("modularity", modularity);
