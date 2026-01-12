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
