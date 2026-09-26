#!/bin/bash
# Converts App Store screenshots into the web images the site uses.
#   tools/screenshots.sh <folder with light PNGs> [folder with dark PNGs]
# Files must be named like the originals (01-today.png, 02-coach.png, ...).
# Light versions become img/<name>-360.webp and -660.webp; dark ones img/<name>-dark-360.webp and -660.webp.
# After adding dark versions, put data-dark-shots on #screens in the homepage.
set -e
cd "$(dirname "$0")/.."
convert_dir() {
    for src in "$1"/*.png; do
        name=$(basename "$src" .png)
        for w in 360 660; do
            cwebp -quiet -q 78 -resize $w 0 "$src" -o "img/$name$2-$w.webp"
        done
        echo "img/$name$2 done"
    done
}
convert_dir "${1:?light screenshot folder}" ""
[ -n "$2" ] && convert_dir "$2" "-dark"
