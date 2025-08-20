document.addEventListener('DOMContentLoaded', async () => {
  const placeholder = document.getElementById('banner');
  if (!placeholder) return;
  try {
    const res = await fetch('/banner.html');
    placeholder.outerHTML = await res.text();
  } catch (err) {
    console.error('Failed to load banner', err);
  }
});
