document.addEventListener('DOMContentLoaded', function() {
  const modeSwitch = document.getElementById('dark-mode-switch');

  // Check if the user previously selected dark mode
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    modeSwitch.checked = true;
  }

  // Toggle dark mode
  modeSwitch.addEventListener('change', function() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
  });
});
