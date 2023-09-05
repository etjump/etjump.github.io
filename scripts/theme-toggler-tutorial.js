// Constants
const lightIcon = '../images/sun.png';
const darkIcon = '../images/moon.png';
const lightDiscordSrc = 'https://discordapp.com/widget?id=214090773237334017&theme=light';
const darkDiscordSrc = 'https://discordapp.com/widget?id=214090773237334017&theme=dark';

// DOM Elements
const themeToggler = document.getElementById('theme-toggler');

// Cache
const theme = localStorage.getItem('theme');
const themeIcon = localStorage.getItem('themeIcon');

if (theme) {
    document.body.classList.add(theme);
} else {
    document.body.classList.add('light');
}

if (themeIcon) {
    if (themeIcon === 'moon') {
        themeToggler.src = darkIcon;
    } else {
        themeToggler.src = lightIcon;
    }
} else {
    themeToggler.src = darkIcon;
}

// Theme toggle
themeToggler.onclick = () => {
    if (document.body.classList.contains('dark')) {
        document.body.classList.replace('dark', 'light');
        themeToggler.src = darkIcon;
        updateLocalStorage('light', 'moon', lightDiscordSrc);
    } else {
        document.body.classList.replace('light', 'dark');
        themeToggler.src = lightIcon;
        updateLocalStorage('dark', 'sun', darkDiscordSrc);
    }
};

const updateLocalStorage = (theme, themeIcon, discordTheme) => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('themeIcon', themeIcon);
    localStorage.setItem('discordTheme', discordTheme);
}