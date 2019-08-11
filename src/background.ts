const CLICKUP_TOKEN_KEY = 'x-clickup-token';

const CLICKUP_BASE_URL = 'https://app.clickup.com';

let clickupTokenSet = false;

const switchOrOpenTaskTab = async (taskID: string) => {
    return new Promise<void>((resolve, _) => {
        let taskUrl = `${CLICKUP_BASE_URL}/t/${taskID}`;
        const taskAndTeamID = findTask(taskID);
        if (taskAndTeamID) {
            taskUrl = taskAndTeamID[0].url;
        }
        window.open(taskUrl);

        resolve();

        // chrome.tabs.query(
        //     {url: "*://app.clickup.com/*"},
        //     tabs => {
        //         if (!tabs) {
        //             reject();
        //         } else if (tabs.length > 0) {
        //             const clickUpTab = tabs[0];
        //             const clickUpTabID = clickUpTab.id ? clickUpTab.id: chrome.tabs.TAB_ID_NONE;
        //             chrome.tabs.update(clickUpTabID, {
        //                 url: taskUrl,
        //                 active: true
        //             }, _ => resolve());
        //         } else {
        //             window.open(taskUrl);
        //             resolve();
        //         }
        //     }
        // )
    });
};

let spaceDB: { [teamID: string]: ClickupSpace[] } = {};
let projectDB: { [spaceID: string]: ClickupProject[] } = {};

let taskDB: { [teamID: string]: ClickUpTask[] } = {};
let teamDB: ClickUpTeam[];

const DefaultRequesInit: RequestInit = {
    headers: new Headers(),
    mode: 'cors',
    method: 'GET',
};

const initToken = (token: string) => {
    // cast is not nagerous since headers is set (see above)
    (DefaultRequesInit.headers as Headers).append('Authorization', token);
    clickupTokenSet = true;
    getTeamsSpacesProjectsTasks();
};

const getAuthToken = async () => {
    return new Promise<string>((resolve, reject) => {
        chrome.storage.local.get(CLICKUP_TOKEN_KEY, items => {
            console.log(JSON.stringify(items));
            if (items[CLICKUP_TOKEN_KEY]) {
                resolve(items[CLICKUP_TOKEN_KEY]);
            } else {
                reject();
            }
        });
    });
};

// inital setup if token is already set will suceed
getAuthToken()
    .then(initToken)
    .catch(_ => console.log('GITHUB CLICKUP NO TOKEN SET API FEATURES DISABLED'));

chrome.browserAction.onClicked.addListener(() => {
    const token = prompt('Enter your clickup token');
    if (token) {
        chrome.storage.local.set({ [CLICKUP_TOKEN_KEY]: token }, () => {
            initToken(token);
        });
    }
});

let lastTeamSpaceProjectsAccessTimeStamp = 0;

const getTeamsSpacesProjectsTasks = async () => {
    const teamResponse = await fetch('https://api.clickup.com/api/v1/team/', DefaultRequesInit);
    const teamJson = await teamResponse.json();
    teamDB = teamJson.teams;
    let spacePromises: Promise<void>[] = teamDB.map(async team => {
        const spaceResponse = await fetch(
            `https://api.clickup.com/api/v1/team/${team.id}/space`,
            DefaultRequesInit
        );
        spaceResponse.json().then(spaceJson => {
            spaceDB[team.id] = spaceJson.spaces;
            for (const space of spaceDB[team.id]) {
                fetch(
                    `https://api.clickup.com/api/v1/space/${space.id}/project`,
                    DefaultRequesInit
                ).then(projectResponse => {
                    projectResponse.json().then(projectJson => {
                        projectDB[space.id] = projectJson.projects;
                    });
                });
            }
        });
    });

    let taskPromises: Promise<void>[] = teamDB.map(async team => {
        const response = await fetch(
            `https://api.clickup.com/api/v1/team/${team.id}/task?include_closed=true`,
            DefaultRequesInit
        );
        response.json().then(responseJson => {
            taskDB[team.id] = responseJson.tasks;
        });
    });

    const allPromises = Promise.all(spacePromises.concat(taskPromises));
    return allPromises;
};

const updateData = async () => {
    if (lastTeamSpaceProjectsAccessTimeStamp + 30000 < Date.now()) {
        lastTeamSpaceProjectsAccessTimeStamp = Date.now();
        // wait for updated data
        return await getTeamsSpacesProjectsTasks();
    }
};

const findTask = (taskID: string): [ClickUpTask, string] | undefined => {
    for (const teamID in taskDB) {
        if (taskDB.hasOwnProperty(teamID)) {
            const task = taskDB[teamID].find(task => task.id == taskID);
            if (task) {
                return [task, teamID];
            }
        }
    }
};

const getClickupTask = async (taskID: string) => {
    if (!clickupTokenSet) {
        return new Promise<RuntimeMessage>((resolve, _) =>
            resolve({
                messageType: RuntimeMessageType.ResponseClickUpNoAuthentication,
            } as RuntimeMessageResponseClickUpNoAuthentication)
        );
    }
    try {
        await updateData();
    } catch (e) {
        return new Promise<RuntimeMessage>((resolve, _) =>
            resolve({
                messageType: RuntimeMessageType.ResponseClickUpNetworkError,
            } as RuntimeMessageResponseClickUpNetworkError)
        );
    }
    return new Promise<RuntimeMessage>((resolve, _) => {
        let taskAndTeamID = findTask(taskID);
        if (taskAndTeamID) {
            const task = taskAndTeamID[0];
            const teamID = taskAndTeamID[1];

            const space = spaceDB[teamID].find(space => space.id === String(task.space.id));
            let spaceName = 'ERROR_NOSPACE';
            let spaceUrl = '';
            let projectName = 'ERROR_NOPROJECT';
            let projectUrl = '';
            let listName = 'ERROR_NOLIST';
            let listUrl = '';
            if (space) {
                spaceName = space.name;
                spaceUrl = `${CLICKUP_BASE_URL}/${teamID}/d/b?p=${space.id}`;
                projectDB[space.id].forEach(project => {
                    if (project.id === String(task.project.id)) {
                        projectName = project.name;
                        projectUrl = `${CLICKUP_BASE_URL}/${teamID}/d/b?p=${space.id}&c=${
                            project.id
                        }`;
                    }
                    const list = project.lists.find(list => list.id === String(task.list.id));
                    if (list) {
                        listName = list.name;
                        listUrl = `${CLICKUP_BASE_URL}/${teamID}/d/b?p=${space.id}&c=${
                            project.id
                        }&s=${list.id}`;
                    }
                });
            }

            const taskInfo: ClickUpTaskInfo = {
                id: task.id,
                url: task.url,
                name: task.name,
                description: task.text_content ? task.text_content.trim() + '...' : '',
                assignees: task.assignees,
                status: task.status,
                space: spaceName,
                spaceUrl: spaceUrl,
                project: projectName,
                projectUrl: projectUrl,
                list: listName,
                listUrl: listUrl,
            };

            resolve({ messageType: RuntimeMessageType.ResponseClickUpTaskInfo, task: taskInfo });
        } else {
            resolve({
                messageType: RuntimeMessageType.ResponseClickUpTaskDoesNotExist,
            } as RuntimeMessageResponseClickUpTaskDoesNotExist);
        }
    });
};

chrome.runtime.onMessage.addListener((request: RuntimeMessage, _, sendResponse) => {
    switch (request.messageType) {
        case RuntimeMessageType.SwitchToOrOpenTaskTab:
            switchOrOpenTaskTab(request.taskID)
                .then(_ => sendResponse({ messageType: RuntimeMessageType.ResponseSuccess }))
                .catch(_ => sendResponse({ messageType: RuntimeMessageType.ResponseFail }));
            return true;
        case RuntimeMessageType.RequestClickUpTaskInfo:
            getClickupTask(request.taskID).then(msg => sendResponse(msg));
            return true;
    }
    return false;
});

// TODO!!! OAUTH requires identity permission

// var clientID = 'XXXX';
// var redirectUri = chrome.identity.getRedirectURL("oauth2");
// var authUrl = "https://app.clickup.com/api?client_id=" + clientID + "&redirect_uri=" + redirectUri + "&response_type=token";

// chrome.browserAction.onClicked.addListener(() => {
//     chrome.identity.launchWebAuthFlow({'url':authUrl,'interactive':true}, responseUrl => {
//         if (responseUrl) {
//             console.log(responseUrl);
//             const codeMatch = responseUrl.match(/\?code=(.+)/);
//             if (codeMatch) {
//                 chrome.storage.local.set({ "x-clickup-token": codeMatch[1] }, () => {
//                     console.log(codeMatch[1]);
//                 });
//             }
//         }
//     });
// });
