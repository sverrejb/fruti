# Package the extension for distribution

package:
    @echo "Packaging extension..."
    @rm -f recently-used-tabs-indicator.zip
    @zip recently-used-tabs-indicator.zip \
        manifest.json \
        background.js \
        content.js \
        options.js \
        options.html \
        icon*.png
    @echo "✓ Extension packaged as recently-used-tabs-indicator.zip"
    @echo ""
    @echo "Included files:"
    @unzip -l recently-used-tabs-indicator.zip

# Open 25 tabs in Firefox for testing tab tracking

test-tabs:
    #!/usr/bin/env bash
    urls=(
        "https://www.wikipedia.org"
        "https://github.com"
        "https://stackoverflow.com"
        "https://news.ycombinator.com"
        "https://www.bbc.com/news"
        "https://www.npmjs.com"
        "https://developer.mozilla.org"
        "https://www.reddit.com"
        "https://www.theguardian.com"
        "https://www.nytimes.com"
        "https://www.youtube.com"
        "https://www.wolframalpha.com"
        "https://www.ted.com"
        "https://www.arxiv.org"
        "https://www.nature.com"
        "https://www.sciencedirect.com"
        "https://medium.com"
        "https://dev.to"
        "https://lobste.rs"
        "https://www.openstreetmap.org"
        "https://www.gutenberg.org"
        "https://www.coursera.org"
        "https://www.khanacademy.org"
        "https://www.eff.org"
        "https://www.w3.org"
    )
    echo "Opening ${#urls[@]} tabs for testing..."
    for url in "${urls[@]}"; do
        open -a Firefox "$url"
        sleep 0.2
    done
    echo "✓ Done! ${#urls[@]} tabs opened."
