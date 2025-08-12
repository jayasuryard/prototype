# Icon Generation Instructions

To generate the PNG icons from the SVG, you can use online tools or command line tools:

## Online Tools:
1. Go to https://realfavicongenerator.net/
2. Upload the icon.svg file
3. Generate all required sizes

## Command Line (if you have ImageMagick installed):
```bash
# Convert SVG to different PNG sizes
magick icon.svg -resize 72x72 icon-72x72.png
magick icon.svg -resize 96x96 icon-96x96.png
magick icon.svg -resize 128x128 icon-128x128.png
magick icon.svg -resize 144x144 icon-144x144.png
magick icon.svg -resize 152x152 icon-152x152.png
magick icon.svg -resize 192x192 icon-192x192.png
magick icon.svg -resize 384x384 icon-384x384.png
magick icon.svg -resize 512x512 icon-512x512.png
```

## For now, the app will work with the favicon.ico and apple-touch-icon that Next.js generates.

The SVG icon features:
- Purple to pink gradient background
- "JS" text with glow effect
- Medical cross subtle background
- Pulse line decoration
- Professional medical theme
- Optimized for both light and dark themes
