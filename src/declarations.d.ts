declare const enum RuntimeMessageType {
    ResponseSuccess = 1,
    ResponseFail = 2,
    SwitchToOrOpenTaskTab = 3,
    RequestClickUpTaskInfo = 4,
    ResponseClickUpTaskInfo = 5,
    ResponseClickUpTaskDoesNotExist = 6,
    ResponseClickUpNetworkError = 7,
    ResponseClickUpNoAuthentication = 8,
}

interface RuntimeMessageSwitchToOrOpenTaskTab {
    messageType: RuntimeMessageType.SwitchToOrOpenTaskTab;
    taskID: string;
}

interface RuntimeMessageResponseSuccess {
    messageType: RuntimeMessageType.ResponseSuccess;
}

interface RuntimeMessageResponseFail {
    messageType: RuntimeMessageType.ResponseFail;
}

interface RuntimeMessageRequestClickUpTaskInfo {
    messageType: RuntimeMessageType.RequestClickUpTaskInfo;
    taskID: string;
}

interface RuntimeMessageResponseClickUpTaskInfo {
    messageType: RuntimeMessageType.ResponseClickUpTaskInfo;
    task: ClickUpTaskInfo;
}

interface RuntimeMessageResponseClickUpTaskDoesNotExist {
    messageType: RuntimeMessageType.ResponseClickUpTaskDoesNotExist;
}

interface RuntimeMessageResponseClickUpNetworkError {
    messageType: RuntimeMessageType.ResponseClickUpNetworkError;
}

interface RuntimeMessageResponseClickUpNoAuthentication {
    messageType: RuntimeMessageType.ResponseClickUpNoAuthentication;
}

type RuntimeMessage =
    | RuntimeMessageSwitchToOrOpenTaskTab
    | RuntimeMessageResponseSuccess
    | RuntimeMessageResponseFail
    | RuntimeMessageRequestClickUpTaskInfo
    | RuntimeMessageResponseClickUpTaskInfo
    | RuntimeMessageResponseClickUpTaskDoesNotExist
    | RuntimeMessageResponseClickUpNetworkError
    | RuntimeMessageResponseClickUpNoAuthentication; // add additonal message types as union

// dont send the whole task just information that is going to be displayed
interface ClickUpTaskInfo {
    id: string;
    url: string;
    name: string;
    description: string;
    status: ClickUpStatus;
    space: string;
    spaceUrl: string;
    project: string;
    projectUrl: string;
    list: string;
    listUrl: string;
    assignees: ClickUpUser[];
}

interface ClickUpTask {
    id: string;
    name: string;
    text_content: string | undefined;
    status: ClickUpStatus;
    orderindex: string;
    date_created: string;
    date_updated: string;
    date_closed: string;
    creator: ClickUpUser;
    assignees: ClickUpUser[];
    tags: ClickUpTag[];
    parent: string;
    priority: number;
    due_date: string;
    start_date: string;
    points: number;
    time_estimate: number;
    space: ClickUpReference;
    project: ClickUpReference;
    list: ClickUpReference;
    url: string;
}

interface ClickUpUser {
    id: number;
    username: string;
    color: string;
    profilePicture: string;
}

interface ClickUpReference {
    id: number;
}

interface ClickUpStatus {
    status: string;
    type: string;
    orderindex: number;
    color: string;
}

interface ClickUpTag {
    name: string;
    tag_fg: string;
    tag_bg: string;
}

interface ClickUpTeam {
    id: string;
    name: string;
    color: string;
    avatar: string;
    members: ClickUpMember[];
    spaces: ClickupSpace[];
}

interface ClickUpMember {
    user: ClickUpUser;
}

interface ClickupSpace {
    id: string;
    name: string;
    private: boolean;
    statuses: ClickUpStatus[];
    members: ClickUpMember[];
}

interface ClickupProject {
    id: string;
    name: string;
    override_statuses: boolean;
    statuses: ClickUpStatus[];
    lists: ClickupList[];
}

interface ClickupList {
    id: string;
    name: string;
}

interface TaskLinkElement extends HTMLAnchorElement {
    hoverCard?: HTMLDivElement;
    taskData?: ClickUpTaskInfo;
}
