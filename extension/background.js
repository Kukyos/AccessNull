// AccessNull — service worker. Opens the side panel; forwards the keyboard shortcut to it.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

chrome.commands.onCommand.addListener(async cmd => {
  if (cmd !== 'toggle-listen') return;
  const win = await chrome.windows.getLastFocused();
  await chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
  chrome.runtime.sendMessage({ type: 'toggle-listen' }).catch(() => {}); // panel may still be opening
});
