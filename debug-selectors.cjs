
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('Anshu Dhamija _ LinkedIn.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

function getPathTo(element) {
    if (element.id !== '')
        return 'id("' + element.id + '")';
    if (element === document.body)
        return element.tagName;

    var ix = 0;
    var siblings = element.parentNode.childNodes;
    for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling === element)
            return getPathTo(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
            ix++;
    }
}

function findText(text) {
    const walker = document.createTreeWalker(document.body, 4); // NodeFilter.SHOW_TEXT
    while (walker.nextNode()) {
        if (walker.currentNode.nodeValue.includes(text)) {
            const parent = walker.currentNode.parentElement;
            console.log(`Found "${text}" in: <${parent.tagName} class="${parent.className}">`);
            console.log('Path:', getPathTo(parent));

            // Check for nearby h1
            const h1 = document.querySelector('h1');
            if (h1) {
                console.log('H1 found:', h1.textContent.trim());
                console.log('H1 classes:', h1.className);
            } else {
                console.log('No H1 found');
            }
            return;
        }
    }
    console.log(`"${text}" not found`);
}

findText('Anshu Dhamija');
findText('Senior Vice President');
