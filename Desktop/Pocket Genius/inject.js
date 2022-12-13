
chrome.scripting.registerContentScripts([
    {
      id: 'inject',
      matches: ['<all_urls>'],
      js: ['main.js'],
      runAt: 'document_end',
      world: 'MAIN'
    }
])