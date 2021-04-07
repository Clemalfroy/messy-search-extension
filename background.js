const getFromLocalStorageAsync = async (keys) => {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve)
    })
}

const queryTabs = async (queryObject) => {
    return new Promise((resolve) => chrome.tabs.query(queryObject, resolve));
}

const moveToTab = async ({ tab }) => {
    return new Promise((resolve) => chrome.tabs.update(tab.id, {
        active: true
    }, resolve))
}

const getAllTabsInWindow = async () => {
    return queryTabs({
        currentWindow: true
    });
}

const getActiveTabInWindow = async () => {
    return queryTabs({
        currentWindow: true,
        active: true
    });
}

const getAllTabsFromLocalStorage = async () => {
    const tabs = await getAllTabsInWindow()
    const tabIdsString = tabs.map(t => t.id.toString(10))
    return getFromLocalStorageAsync(tabIdsString)
}


const removeFromLocalStorageAsync = async (keys) => {
    return new Promise((resolve) => {
        chrome.storage.local.remove(keys, resolve)
    })
}

const setToLocalStorageAsync = async (items) => {
    return new Promise((resolve) => {
        chrome.storage.local.set(items, resolve)
    })
}

const removeTabInfoFromLocalStorage = async (tabId) => {
    await removeFromLocalStorageAsync(tabId.toString(10))
    console.log(`Tab ${tabId}: removed from local storage`);
}


const getTabInfoFromLocalStorage = async (tabId) => {
    return getFromLocalStorageAsync(tabId.toString(10))
}

const executeScriptAsync = async (params) => {
    return new Promise((resolve) => {
        chrome.scripting.executeScript(params, resolve);
    })
}

const getSanitizedBodyText = () => {
    const rawText = document.body.innerText.toLowerCase()
    const wordSet = new Set(rawText.split(/\s+/))
    return Array.from(wordSet).join(' ')
}

const addTabInfoToLocalStorage = async (tab) => {
    const tabId = tab.id
    const tabText = await getTextFromTab(tabId)
    await setToLocalStorageAsync({
        [tabId]: {...tab, tabText}
    })
    console.log(`Tab ${tabId}: added to local storage`);
}

const getTextFromTab = async (tabId) => {
    const [{ result }] = await executeScriptAsync({
        target: { tabId },
        function: getSanitizedBodyText
    }); 
    return result
}

const sendMessageAsync = async (tabId, action) => {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action }, resolve);
    })
}

const searchCommandHandler = async () => {
    const [activeTab] = await getActiveTabInWindow()
    await sendMessageAsync(activeTab.id, 'search-handler')
}

const commandDispatcher = {
    "search": searchCommandHandler
}

const messageActionDispatcher = {
    "getAllTabsFromLocalStorage": getAllTabsFromLocalStorage,
    "moveToTab": moveToTab
}

// Listeners

chrome.runtime.onInstalled.addListener(async () => {
    const isValidTab = (tab) => tab.url.startsWith('http')
    const allTabs = (await getAllTabsInWindow())
    const validTabs = allTabs.filter(isValidTab)
    for (const tab of validTabs) {
        await addTabInfoToLocalStorage(tab)    
    }
  });

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        await removeTabInfoFromLocalStorage(tabId);
        await addTabInfoToLocalStorage(tab)    
    }
})

chrome.tabs.onRemoved.addListener(async (tabId) => {
    await removeTabInfoFromLocalStorage(tabId)
})

chrome.commands.onCommand.addListener((command) => {
    console.log("Command", command);
    if (Object.keys(commandDispatcher).includes(command)) {
        commandDispatcher[command]()
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, ...options } = message;
    if (Object.keys(messageActionDispatcher).includes(action)) {
        messageActionDispatcher[action](options).then(
            returnValue => sendResponse(returnValue)
        )
        return true
    }
})