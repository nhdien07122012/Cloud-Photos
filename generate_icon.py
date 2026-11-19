import math
import os
from PIL import Image, ImageDraw

def create_clouddrive_icon(size=1024):
    scale = 2
    W, H = size * scale, size * scale

    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    # 1. Background gradient: Deep Midnight Blue -> Cobalt / Telegram Blue
    for y in range(H):
        ratio = y / H
        t = 0.5 - 0.5 * math.cos(ratio * math.pi)
        r = int(12 * (1 - t) + 0 * t)
        g = int(24 * (1 - t) + 122 * t)
        b = int(68 * (1 - t) + 242 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    # Ambient radial glow in center
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = int(W * 0.5), int(H * 0.46)
    r_max = int(W * 0.6)
    for r in range(r_max, 0, -12):
        alpha = int(45 * (1 - r / r_max)**1.5)
        glow_draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(60, 190, 255, alpha)
        )
    img = Image.alpha_composite(img, glow)

    # 2. Modern 3D Folder
    folder_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f_draw = ImageDraw.Draw(folder_layer)

    fx, fy = int(W * 0.16), int(H * 0.28)
    fw, fh = int(W * 0.68), int(H * 0.48)
    tab_w = int(fw * 0.42)
    tab_h = int(fh * 0.18)
    radius = int(W * 0.05)

    # Back flap
    f_draw.rounded_rectangle(
        [fx, fy, fx + tab_w, fy + tab_h * 2],
        radius=radius,
        fill=(0, 135, 245, 230)
    )
    f_draw.rounded_rectangle(
        [fx, fy + tab_h, fx + fw, fy + fh],
        radius=radius,
        fill=(0, 95, 215, 240)
    )

    # Front Folder Flap (Frosted Glass style)
    front_top = fy + int(tab_h * 1.1)
    f_draw.rounded_rectangle(
        [fx - int(W * 0.01), front_top, fx + fw + int(W * 0.01), fy + fh + int(H * 0.03)],
        radius=radius,
        fill=(15, 175, 255, 250)
    )

    # Top highlight rim
    f_draw.rounded_rectangle(
        [fx - int(W * 0.01), front_top, fx + fw + int(W * 0.01), front_top + int(H * 0.012)],
        radius=int(radius * 0.5),
        fill=(210, 245, 255, 180)
    )

    img = Image.alpha_composite(img, folder_layer)

    # 3. Luminous Cloud Emblem
    cloud_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(cloud_layer)

    cloud_cx = int(W * 0.5)
    cloud_cy = int(H * 0.56)

    # Drop shadow
    shadow_offset = int(H * 0.018)
    shadow_circles = [
        (cloud_cx - int(W * 0.13), cloud_cy + int(H * 0.03), int(W * 0.11)),
        (cloud_cx + int(W * 0.13), cloud_cy + int(H * 0.03), int(W * 0.11)),
        (cloud_cx - int(W * 0.05), cloud_cy - int(H * 0.05), int(W * 0.14)),
        (cloud_cx + int(W * 0.06), cloud_cy - int(H * 0.02), int(W * 0.12)),
    ]
    for x, y, r in shadow_circles:
        c_draw.ellipse([x - r, y - r + shadow_offset, x + r, y + r + shadow_offset], fill=(0, 20, 60, 110))
    c_draw.rounded_rectangle(
        [cloud_cx - int(W * 0.19), cloud_cy - int(H * 0.01) + shadow_offset,
         cloud_cx + int(W * 0.19), cloud_cy + int(H * 0.13) + shadow_offset],
        radius=int(W * 0.06),
        fill=(0, 20, 60, 110)
    )

    # Cloud body (Pristine White)
    circles = [
        (cloud_cx - int(W * 0.13), cloud_cy + int(H * 0.03), int(W * 0.11)),
        (cloud_cx + int(W * 0.13), cloud_cy + int(H * 0.03), int(W * 0.11)),
        (cloud_cx - int(W * 0.05), cloud_cy - int(H * 0.05), int(W * 0.14)),
        (cloud_cx + int(W * 0.06), cloud_cy - int(H * 0.02), int(W * 0.12)),
    ]
    for x, y, r in circles:
        c_draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 255))

    c_draw.rounded_rectangle(
        [cloud_cx - int(W * 0.19), cloud_cy - int(H * 0.01),
         cloud_cx + int(W * 0.19), cloud_cy + int(H * 0.13)],
        radius=int(W * 0.06),
        fill=(255, 255, 255, 255)
    )

    # 4. Central Upward Upload Arrow
    arrow_color = (0, 110, 235, 255)
    arrow_y = cloud_cy + int(H * 0.02)
    aw = int(W * 0.045)
    ah = int(H * 0.09)
    c_draw.rounded_rectangle(
        [cloud_cx - aw // 2, arrow_y - ah // 3, cloud_cx + aw // 2, arrow_y + ah // 2 + int(H * 0.02)],
        radius=int(aw * 0.3),
        fill=arrow_color
    )
    head_size = int(W * 0.085)
    c_draw.polygon([
        (cloud_cx, arrow_y - ah // 2 - int(H * 0.035)),
        (cloud_cx - head_size, arrow_y + int(H * 0.005)),
        (cloud_cx + head_size, arrow_y + int(H * 0.005))
    ], fill=arrow_color)

    img = Image.alpha_composite(img, cloud_layer)

    # 5. Subtle outer border
    border_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border_layer)
    b_draw.rectangle([0, 0, W, H], outline=(255, 255, 255, 25), width=scale * 2)
    img = Image.alpha_composite(img, border_layer)

    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# 1. Master 1024x1024
master = create_clouddrive_icon(1024)

# 2. Export targets
iconset_dir = "ios-photo-app/ios/App/App/Assets.xcassets/AppIcon.appiconset"
app_dir = "ios-photo-app/ios/App/App"
public_dir = "ios-photo-app/public"
assets_dir = "ios-photo-app/src/assets"

targets = [
    (f"{iconset_dir}/AppIcon-512@2x.png", 1024),
    (f"{iconset_dir}/AppIcon-Dark.png", 1024),
    (f"{iconset_dir}/AppIcon-Tinted.png", 1024),
    (f"{iconset_dir}/AppIcon-83.5@2x.png", 167),
    (f"{iconset_dir}/AppIcon-76@2x.png", 152),
    (f"{iconset_dir}/AppIcon-60@3x.png", 180),
    (f"{iconset_dir}/AppIcon-60@2x.png", 120),
    (f"{iconset_dir}/AppIcon-40@3x.png", 120),
    (f"{iconset_dir}/AppIcon-40@2x.png", 80),
    (f"{iconset_dir}/AppIcon-29@3x.png", 87),
    (f"{iconset_dir}/AppIcon-29@2x.png", 58),
    (f"{iconset_dir}/AppIcon-20@3x.png", 60),
    (f"{iconset_dir}/AppIcon-20@2x.png", 40),
    (f"{app_dir}/AppIcon-Dark.png", 1024),
    (f"{app_dir}/AppIcon-Tinted.png", 1024),
    (f"{app_dir}/AppIcon60x60@2x.png", 120),
    (f"{app_dir}/AppIcon60x60@3x.png", 180),
    (f"{assets_dir}/app-icon.png", 1024),
    (f"{public_dir}/apple-photos-icon.png", 512),
]

for path, sz in targets:
    resized = master.resize((sz, sz), Image.Resampling.LANCZOS)
    resized.save(path, "PNG")
    print(f"Generated: {path} ({sz}x{sz})")

print("All app icons successfully generated!")
