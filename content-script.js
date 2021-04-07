
const getAllTabsFromLocalStorage = async () => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getAllTabsFromLocalStorage" }, (response) => {
            resolve(response)
        })  
    })
}

const queryHasMatched = (tab, query) => {
    return (tab.tabText && tab.tabText.includes(query)) || tab.title.toLowerCase().includes(query)
}

const search = async (query) => {
    const sanitizedQuery = query.toLowerCase()
    const localStorageTabs = await getAllTabsFromLocalStorage()
    const foundTabs = Object.values(localStorageTabs).filter(
        t => queryHasMatched(t, sanitizedQuery)
    )
    return foundTabs
}

const handleTabChange = (tab) => {
    toggleSearchBar()
    chrome.runtime.sendMessage({ action: "moveToTab", tab })  
}

const displaySearchResults = (tabResults) => {
    const searchResultsContainer = document.querySelector('#messy-search-results-container')
    if (!searchResultsContainer) return
    searchResultsContainer.innerHTML = "";
    tabResults.forEach((tab, i) => {
        const tabDiv = document.createElement('div')
        tabDiv.dataset.tabId = tab.id
        tabDiv.tabIndex = 0;
        tabDiv.classList.add('tab-result')
        const logoImg = document.createElement('img')
        logoImg.src = tab.favIconUrl;
        const tabDivTitle = document.createElement('div')
        tabDivTitle.classList.add('tab-div-title')
        const tabTitle = document.createElement('p')
        const tabIndex = document.createElement('div')
        tabTitle.innerText = tab.title
        tabIndex.innerText = `${i + 1}`
        tabIndex.classList.add('tab-result-index')
        tabDiv.insertAdjacentElement('beforeend', tabDivTitle)
        tabDivTitle.insertAdjacentElement('beforeend', tabIndex)
        tabDivTitle.insertAdjacentElement('beforeend', tabTitle)
        tabDiv.insertAdjacentElement('beforeend', logoImg)
        searchResultsContainer.insertAdjacentElement('beforeend', tabDiv)
        tabDiv.addEventListener("keydown", (e) => {
            if (e.key === 'Enter') handleTabChange(tab)
        })
    })
}

const moveToNthTabResult = (n) => {
    const tabResults = Array.from(document.querySelectorAll('#messy-search-results-container .tab-result'))
    const selectedTab = tabResults[n]
    if (selectedTab) selectedTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
}

const handleSearch = async (e) => {
    if (e.key === "Enter") {
        moveToNthTabResult(0)
    }
    if (e.altKey && e.code.includes('Digit')) {
        e.preventDefault()
    }
    const searchInputElement = document.querySelector('#messy-search-input')
    const query = searchInputElement.value
    if (query.length > 0) {
        const foundTabs = await search(query)
        displaySearchResults(foundTabs)
    }

}

const createSearchBar = () => {
    const searchContainer = document.createElement('div')
    searchContainer.id = 'messy-search-container'
    const searchInput = document.createElement('input')
    searchInput.id = "messy-search-input"
    searchInput.onkeydown = handleSearch
    const searchResultsContainer = document.createElement('div')
    searchResultsContainer.id = 'messy-search-results-container'
    searchContainer.insertAdjacentElement('beforeend', searchInput);
    searchContainer.insertAdjacentElement('beforeend', searchResultsContainer)
    document.body.insertAdjacentElement('beforeend', searchContainer);
    searchInput.focus()
}


const destroySearchBar = (searchBar) => {
    searchBar.remove()
}

const toggleSearchBar = () => {
    const searchBarElement = document.querySelector('#messy-search-container')
    searchBarElement ? destroySearchBar(searchBarElement) : createSearchBar()
}

const actionDispatcher = {
    'search-handler': toggleSearchBar
}

document.body.addEventListener('click', (e) => {
    const isExtensionElement = e.path.map(el => el.id).some((i) => i && i.includes('messy'))
    const searchBarElement = document.querySelector('#messy-search-container')
    if (searchBarElement && !isExtensionElement) destroySearchBar(searchBarElement);
})

document.addEventListener('keydown', function (event) {
    const searchBarElement = document.querySelector('#messy-search-container')
    if (searchBarElement && event.altKey && event.code.includes('Digit')) {
        const digitKey = parseInt(event.code.replace('Digit', ''), 10)
        moveToNthTabResult(digitKey - 1)
    }
});

chrome.extension.onMessage.addListener(function (msg, sender, sendResponse) {
    const { action } = msg
    if (Object.keys(actionDispatcher).includes(action)) {
        actionDispatcher[action]()
    }
});