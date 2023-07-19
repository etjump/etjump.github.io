// Constants
const lightIcon = 'images/sun.png';
const darkIcon = 'images/moon.png';
const lightDiscordSrc = 'https://discordapp.com/widget?id=214090773237334017&theme=light';
const darkDiscordSrc = 'https://discordapp.com/widget?id=214090773237334017&theme=dark';

// DOM Elements
const themeToggler = document.getElementById('theme-toggler');
const discordWidget = document.getElementById('discord-widget');

// Cache
const theme = localStorage.getItem('theme');
const themeIcon = localStorage.getItem('themeIcon');
const discordTheme = localStorage.getItem('discordTheme');

if (theme) {
    document.body.classList.add(theme);
} else {
    document.body.classList.add('light');
}

if (themeIcon) {
    themeToggler.src = themeIcon;
} else {
    themeToggler.src = darkIcon;
}

if (discordTheme) {
    discordWidget.src = discordTheme;
} else {
    discordWidget.src = lightDiscordSrc;
}


// Theme toggle
themeToggler.onclick = () => {
    if (document.body.classList.contains('dark')) {
        document.body.classList.replace('dark', 'light');
        upateSources(darkIcon, lightDiscordSrc);
        updateLocalStorage('light', darkIcon, lightDiscordSrc);
    } else {
        document.body.classList.replace('light', 'dark');
        upateSources(lightIcon, darkDiscordSrc);
        updateLocalStorage('dark', lightIcon, darkDiscordSrc);
    }
};

const upateSources = (iconSrc, discordSrc) => {
    themeToggler.src = iconSrc;
    discordWidget.src = discordSrc;
}

const updateLocalStorage = (theme, themeIcon, discordTheme) => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('themeIcon', themeIcon);
    localStorage.setItem('discordTheme', discordTheme);
}