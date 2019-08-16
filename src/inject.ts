const CLICKUP_TASKID_REGEXP = /(#{1}(\w+)(\[.+?\])?)/g;

const checkForPageWithCommits = () => {
    let commitTitles = document.querySelectorAll('.commit-title');
    commitTitles.forEach(commitTitle => {
        let commitLink;
        if (commitTitle.hasChildNodes()) {
            commitLink = commitTitle.querySelector('a');
        }
        if (commitTitle.textContent && commitTitle.textContent.match(CLICKUP_TASKID_REGEXP)) {
            let commitTitleText = commitTitle.textContent;
            commitTitle.innerHTML = '';
            let clickUpTaskIDsInCommit;
            let textCurrentIndex = 0;

            while ((clickUpTaskIDsInCommit = CLICKUP_TASKID_REGEXP.exec(commitTitleText))) {
                // generate text node for text til that point
                let charsTilTaskID = commitTitleText.indexOf(
                    clickUpTaskIDsInCommit[1],
                    textCurrentIndex
                );
                let titleTextPart = commitTitleText.substring(
                    textCurrentIndex,
                    charsTilTaskID + clickUpTaskIDsInCommit[1].length
                );
                textCurrentIndex = charsTilTaskID + clickUpTaskIDsInCommit[1].length;

                if (commitLink) {
                    const commitLinkClone = commitLink.cloneNode(true) as HTMLLinkElement;
                    commitLinkClone.textContent = titleTextPart;
                    commitTitle.append(commitLinkClone);
                } else {
                    const titleTextElement = document.createTextNode(titleTextPart);
                    commitTitle.append(titleTextElement);
                }

                const taskID = clickUpTaskIDsInCommit[2];
                const taskLinkElement = document.createElement('a') as TaskLinkElement;

                taskLinkElement.onclick = () => requestSwitchOrOpenTaskTab(taskID);

                let hoverTimer: number;

                const removeHoverCard = () => {
                    window.clearTimeout(hoverTimer);
                    if (taskLinkElement.hoverCard) {
                        if (taskLinkElement.hoverCard.parentNode === document.body) {
                            document.body.removeChild(taskLinkElement.hoverCard);
                            taskLinkElement.hoverCard = undefined;
                        }
                    }
                };

                let retryTimer: number;

                const createHoverCard = () => {
                    window.clearTimeout(retryTimer);
                    if (taskLinkElement.taskData) {
                        const assignees = taskLinkElement.taskData.assignees.map(
                            assignee =>
                                `<div class="github-clickup-hovecard-avatar" style="background-image: url('${
                                    assignee.profilePicture
                                }')"></div>`
                        );

                        document.body.insertAdjacentHTML(
                            'beforeend',
                            `<div class="github-clickup-hovercard">
                            <div><a href="${taskLinkElement.taskData.spaceUrl}">${
                                taskLinkElement.taskData.space
                            }</a> &gt <a href="${taskLinkElement.taskData.projectUrl}">${
                                taskLinkElement.taskData.project
                            }</a> &gt <a href="${taskLinkElement.taskData.listUrl}">${
                                taskLinkElement.taskData.list
                            }</a></div>
                            <a href="${
                                taskLinkElement.taskData.url
                            }"><h4 class="github-clickup-hovercard-task-name">${
                                taskLinkElement.taskData.name
                            }</h4></a>
                            ${
                                taskLinkElement.taskData.description !== ''
                                    ? `<div class="github-clickup-hovercard-task-description">${
                                          taskLinkElement.taskData.description
                                      }</div>`
                                    : ''
                            }
                            <div>${assignees.join(
                                ''
                            )}<div class="github-clickup-hovercard-status" style="background-color: ${
                                taskLinkElement.taskData.status.color
                            };">${taskLinkElement.taskData.status.status}</div></div>
                        </div>`
                        );

                        const hoverCard = document.querySelector(
                            '.github-clickup-hovercard'
                        ) as HTMLDivElement;
                        const boundingRect = taskLinkElement.getBoundingClientRect();
                        if (hoverCard) {
                            hoverCard.style.cssText = `top: ${boundingRect.top +
                                window.scrollY}px; left: ${boundingRect.left + window.scrollX}px;`;
                        }

                        taskLinkElement.hoverCard = hoverCard;
                    } else {
                        retryTimer = setTimeout(createHoverCard, 500);
                    }
                };

                taskLinkElement.onmouseenter = () => {
                    removeHoverCard();

                    createHoverCard();
                };

                taskLinkElement.onmouseleave = () => {
                    const vanishTimeout = () =>
                        setTimeout(() => {
                            removeHoverCard();
                        }, 10);
                    hoverTimer = vanishTimeout();
                    if (taskLinkElement.hoverCard) {
                        taskLinkElement.hoverCard.onmouseenter = () =>
                            window.clearTimeout(hoverTimer);
                        taskLinkElement.hoverCard.onmouseleave = () => {
                            hoverTimer = vanishTimeout();
                        };
                    }
                };

                taskLinkElement.innerHTML =
                    '<span class="label Label Label--outline" style="margin-left: 2px; margin-right: 2px; cursor: pointer;">Open in  <svg width="12px" style="tex" viewBox="61 -10 42 44.3" id="svg-sprite-logo" xmlns="http://www.w3.org/2000/svg"><path fill="#444d56" d="M82.2 34.3c8.7 0 16.2-5 19.5-12.2.2-.6.4-1.3.5-1.9-.1-3.9-2.2-5.8-3.1-6.4l-.3-.2c0 8.9-7.5 16.1-16.6 16.1-9.1 0-16.6-7.2-16.6-16.1l-.3.2c-.9.6-3 2.6-3.1 6.4.1.7.2 1.3.5 1.9 3.3 7.2 10.8 12.2 19.5 12.2zM82-3.3l21 14.1c.1-1-.1-5.1-6.3-10.4L84.3-9.3c-.7-.4-1.5-.7-2.3-.7-.8 0-1.6.3-2.2.7L67.3.4c-6.2 5.3-6.4 9.4-6.3 10.4L82-3.3z"></path></svg></span>';

                commitTitle.append(taskLinkElement);

                const requestTaskData = () => {
                    requestClickUpTaskInfo(taskID)
                        .then(task => (taskLinkElement.taskData = task))
                        .catch(
                            (
                                e:
                                    | RuntimeMessageResponseClickUpNetworkError
                                    | RuntimeMessageResponseClickUpTaskDoesNotExist
                                    | RuntimeMessageResponseClickUpNoAuthentication
                            ) => {
                                if (
                                    e.messageType === RuntimeMessageType.ResponseClickUpNetworkError
                                ) {
                                    // retry in 10 sec
                                    console.log(e);
                                } else if (
                                    e.messageType ===
                                    RuntimeMessageType.ResponseClickUpTaskDoesNotExist
                                ) {
                                    removeHoverCard();
                                    commitTitle.removeChild(taskLinkElement);
                                } else {
                                    // No Token
                                    removeHoverCard();
                                    taskLinkElement.taskData = undefined;
                                }
                            }
                        );
                };
                requestTaskData();
            }
        }
    });
};

const requestSwitchOrOpenTaskTab = (taskID: string) => {
    const message: RuntimeMessageSwitchToOrOpenTaskTab = {
        messageType: RuntimeMessageType.SwitchToOrOpenTaskTab,
        taskID: taskID,
    };
    chrome.runtime.sendMessage(message);
};

const requestClickUpTaskInfo = async (taskID: string) => {
    const message: RuntimeMessageRequestClickUpTaskInfo = {
        messageType: RuntimeMessageType.RequestClickUpTaskInfo,
        taskID: taskID,
    };
    return new Promise<ClickUpTaskInfo>((resolve, reject) => {
        chrome.runtime.sendMessage(
            message,
            (
                response:
                    | RuntimeMessageResponseClickUpTaskInfo
                    | RuntimeMessageResponseClickUpNetworkError
                    | RuntimeMessageResponseClickUpTaskDoesNotExist
                    | RuntimeMessageResponseClickUpNoAuthentication
            ) => {
                if (response.messageType === RuntimeMessageType.ResponseClickUpTaskInfo) {
                    resolve(response.task);
                } else {
                    reject(response);
                }
            }
        );
    });
};

document.addEventListener('pjax:end', checkForPageWithCommits, false);

checkForPageWithCommits();
