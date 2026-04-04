// Enter key sends
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

Promise.resolve(typeof initializeAuth === 'function' ? initializeAuth() : null)
  .finally(() => initializeLlmConfig());
document.addEventListener('click', closeExportMenu);
document.addEventListener('click', closeInfoMenu);
document.addEventListener('click', closeReportsMenu);

