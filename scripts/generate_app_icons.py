"""Generate optimized Expo and Google Play icons from the approved brand mark."""

from pathlib import Path
import sys

from PIL import Image


BACKGROUND = "#071A3A"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "assets" / "images"


def cropped_mark(source: Image.Image) -> Image.Image:
    alpha_bounds = source.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise ValueError("The source icon has no visible pixels")
    return source.crop(alpha_bounds)


def fit(mark: Image.Image, maximum: int) -> Image.Image:
    scale = min(maximum / mark.width, maximum / mark.height)
    size = (round(mark.width * scale), round(mark.height * scale))
    return mark.resize(size, Image.Resampling.LANCZOS)


def centered_canvas(
    mark: Image.Image,
    size: int,
    maximum: int,
    background: str | None,
) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    resized = fit(mark, maximum)
    position = ((size - resized.width) // 2, (size - resized.height) // 2)
    canvas.alpha_composite(resized, position)
    return canvas


def save(image: Image.Image, filename: str) -> None:
    image.save(OUTPUT_DIR / filename, format="PNG", optimize=True)


def main(source_path: str) -> None:
    source = Image.open(source_path).convert("RGBA")
    mark = cropped_mark(source)

    save(centered_canvas(mark, 1024, 800, BACKGROUND), "icon.png")
    save(centered_canvas(mark, 512, 400, BACKGROUND), "play-store-icon.png")
    save(centered_canvas(mark, 1024, 600, None), "logo_foreground.png")
    save(Image.new("RGBA", (1024, 1024), BACKGROUND), "logo_background.png")

    foreground = centered_canvas(mark, 1024, 600, None)
    monochrome = Image.new("RGBA", foreground.size, "white")
    monochrome.putalpha(foreground.getchannel("A"))
    save(monochrome, "logo_monochrome.png")

    save(centered_canvas(mark, 48, 40, BACKGROUND), "favicon.png")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: generate_app_icons.py SOURCE_PNG")
    main(sys.argv[1])
