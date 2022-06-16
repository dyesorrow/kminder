const svgtofont = require('svgtofont');
const path = require('path');

svgtofont({
    src: path.resolve(process.cwd(), 'icon'), // svg path
    dist: path.resolve(process.cwd(), 'fonts'), // output path
    fontName: 'kity-minder-icon', // font name
    css: true, // Create CSS files.
    svgicons2svgfont: {
        fontHeight: 1000,
        normalize: true
    },
    website: {
        title: "kity-minder-icon",
        description: ``,
        logo: path.resolve(process.cwd(), "svg", "git.svg"),
        version: "1.0.0",
        corners: {
            url: 'https://github.com/jaywcjlove/svgtofont',
            width: 62, // default: 60
            height: 62, // default: 60
            bgColor: '#dc3545' // default: '#151513'
        },
    }
}).then(() => {
    console.log('done!');
});