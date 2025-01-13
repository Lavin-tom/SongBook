const titleIndex = {};
let originalLyrics = '';

async function buildIndex(file) {
    const response = await fetch(file);
    const xmlData = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml');

    const entries = xmlDoc.querySelectorAll('entry');
    entries.forEach(entry => {
        const letter = entry.getAttribute('letter');
        const songs = entry.querySelectorAll('song');

        songs.forEach(song => {
            const songTitle = song.getAttribute('title')?.toLowerCase() || '';
            const songFile = song.getAttribute('file');

            if (!titleIndex[letter]) {
                titleIndex[letter] = [];
            }

            titleIndex[letter].push({
                title: songTitle,
                file: songFile
            });
        });
    });
    console.log('Built Title Index:', titleIndex); // Debugging
}

function getCurrentSongFile() {
    const songContentDiv = document.getElementById('songContent');
    const currentSong = songContentDiv.querySelector('h2');

    if (currentSong) {
        return currentSong.getAttribute('data-file');
    }

    return null;
}

let fuse;
let isIndexLoaded = false;
async function loadIndex() {
    const indexFile = 'assets/index.xml';
    await buildIndex(indexFile);
    const flatIndex = Object.values(titleIndex).flat();
    console.log('Flat Index:', flatIndex); // Debugging

    const options = {
        keys: ['title'],
        includeScore: true,
        threshold: 0.4, // Stricter threshold for more accurate matches
        ignoreLocation: true // Allows partial matches
    };
    fuse = new Fuse(flatIndex, options);
    console.log('Fuse Initialized:', fuse); // Debugging

    isIndexLoaded = true; // Set the flag to true after the index is loaded
};

function getFilteredSuggestions(searchInput) {
    if (!fuse) {
        console.error('Index not loaded yet. Call loadIndex() first.');
        return [];
    }

    const trimmedInput = searchInput.trim().toLowerCase();
    if (!trimmedInput) return [];

    const results = fuse.search(trimmedInput);
    console.log('Raw Fuse.js Results:', results); // Debugging
    return results.map(result => result.item);
}

async function loadSong(file) {
    const response = await fetch(`assets/songs/${file}`);
    const xmlData = await response.text();
    const songContentDiv = document.getElementById('songContent');

    // Parse XML content
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml');

    // Extract title and lyrics
    const title = xmlDoc.querySelector('title').textContent;
    const verses = xmlDoc.querySelectorAll('verse');

    // Check if transliterationIcon exists
    const transliterationIcon = document.getElementById('transliterationIcon');
    const transliterationEnabled = transliterationIcon ? transliterationIcon.classList.contains('transliteration-active') : false;

    // Transliterate the title if transliteration is enabled
    const transliteratedTitle = transliterationEnabled ? transliterateLyrics(title) : title;

    // If transliteration is enabled, transliterate the lyrics
    const rawLyrics = Array.from(verses).map(verse => verse.querySelector('lines').innerHTML).join('\n');
    const lyrics = transliterationEnabled ? transliterateLyrics(rawLyrics) : rawLyrics;

    const versesWithLineBreaks = lyrics.split('\n').map(verse => `${verse}<br>`).join('');

    // Create HTML content
    let htmlContent = `<h2>${transliteratedTitle}</h2>`;
    htmlContent += `<p>${versesWithLineBreaks.replace(/<br>/g, '<br/><br/>')}</p>`;

    // Display the HTML content on the page
    songContentDiv.innerHTML = htmlContent;
}

function transliterateLyrics(lyrics) {
    return ml2en(lyrics);
}

function toggleTransliteration() {
    const transliterationIcon = document.getElementById('transliterationIcon');

    transliterationIcon.classList.toggle('transliteration-active');

    const currentSongFile = getCurrentSongFile();
    if (currentSongFile) {
        loadSong(currentSongFile);
    }
}

function filterSongs() {
    if (!isIndexLoaded) {
        console.log('Waiting for the index to load...');
        return; // Don't proceed until index is loaded
    }

    const searchInput = document.getElementById('searchBox').value.trim().toLowerCase();
    console.log('Search Input:', searchInput); // Debugging

    const suggestions = getFilteredSuggestions(searchInput);
    console.log('Suggestions:', suggestions); // Debugging

    const suggestionList = document.getElementById('suggestionList');
    suggestionList.innerHTML = ''; // Clear previous suggestions

    if (searchInput === '' || suggestions.length === 0) {
        suggestionList.style.display = 'none';
        return;
    }

    suggestionList.style.display = 'block';
    suggestions.forEach(({ title, file }) => {
        const listItem = document.createElement('li');
        listItem.textContent = title; // Display the title
        listItem.addEventListener('click', () => {
            console.log('Loading Song:', file); // Debugging
            loadSong(file); // Load the song on click
            suggestionList.style.display = 'none'; // Hide suggestions
        });
        suggestionList.appendChild(listItem);
    });
}

document.getElementById('searchBox').addEventListener('input', filterSongs);
window.addEventListener('DOMContentLoaded', loadIndex);

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

let currentFontSize = 16;

function zoomIn() {
    currentFontSize += 2;
    updateFontSize();
}

function zoomOut() {
    currentFontSize = Math.max(10, currentFontSize - 2);
    updateFontSize();
}

function resetZoom() {
    currentFontSize = 16;
    updateFontSize();
}

function updateFontSize() {
    const songContentDiv = document.getElementById('songContent');
    songContentDiv.style.fontSize = `${currentFontSize}px`;
}
