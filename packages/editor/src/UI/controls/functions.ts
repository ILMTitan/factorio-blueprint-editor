import * as PIXI from 'pixi.js'
import FD, { IngredientOrResult, ColorWithAlpha, Item, Icon } from '@fbe/factorio-data'
import { styles } from '../style'
import G from '../../common/globals'

/**
 * Shade Color
 *
 * @param color - The color to shade
 * @param percent - How many percent the color shall be shaded (+ makes it brigther / - makes it darker)
 */
function ShadeColor(color: number, percent: number): number {
    const amt = Math.round(2.55 * percent)
    const R = (color >> 16) + amt
    const G = ((color >> 8) & 0x00ff) + amt
    const B = (color & 0x0000ff) + amt
    return (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
}

/**
 * Draw Rectangle with Border
 *
 * @param width - Width of the Rectangle
 * @param height - Height of the Rectangle
 * @param background - Background Color of the Rectangle
 * @param alpha - Background Alpha of the Rectangle (1...no transparency)
 * @param border - Border Width of the Rectangle (0...no border)
 * @param pressed - True if the Rectangle Border shall apear as the Rectangle is pressed rather than raised
 */
function DrawRectangle(
    width: number,
    height: number,
    background: number,
    alpha = 1,
    border = 0,
    pressed = false
): PIXI.Graphics {
    const rectangle = new PIXI.Graphics()
    rectangle.alpha = alpha
    rectangle.beginFill(background)
    if (border === 0) {
        rectangle.drawRect(0, 0, width, height)
    } else {
        if (border > 0) {
            rectangle
                .lineStyle(1, ShadeColor(background, pressed ? -12.5 : 22.5), 1, 0)
                .moveTo(0, height)
                .lineTo(0, 0)
                .lineTo(width, 0)
                .lineStyle(1, ShadeColor(background, pressed ? 10 : -7.5), 1, 0)
                .lineTo(width, height)
                .lineTo(0, height)
        }
        if (border > 1) {
            rectangle
                .lineStyle(1, ShadeColor(background, pressed ? -10 : 20), 1, 0)
                .moveTo(1, height - 1)
                .lineTo(1, 1)
                .lineTo(width - 1, 1)
                .lineStyle(1, ShadeColor(background, pressed ? 7.5 : -5), 1, 0)
                .lineTo(width - 1, height - 1)
                .lineTo(1, height - 1)
        }
        if (border > 2) {
            rectangle
                .lineStyle(1, ShadeColor(background, pressed ? -7.5 : 17.5), 1, 0)
                .moveTo(2, height - 2)
                .lineTo(2, 2)
                .lineTo(width - 2, 2)
                .lineStyle(1, ShadeColor(background, pressed ? 5 : -2.5), 1, 0)
                .lineTo(width - 2, height - 2)
                .lineTo(2, height - 2)
        }
    }
    rectangle.endFill()
    return rectangle
}

/**
 * Draw Control Face
 *
 * @param w - Width
 * @param h - Height
 * @param f - Factor
 * @param c - Background Color
 * @param c - Background Alpha
 * @param p0 - Percent shade for brightest border
 * @param p1 - Percent shade for bright border
 * @param p2 - Percent shade for dark border
 * @param p3 - Percent shade for darkest border
 */
function DrawControlFace(
    w: number,
    h: number,
    f: number,
    c: number,
    a: number,
    p0: number,
    p1: number,
    p2: number,
    p3: number
): PIXI.Graphics {
    const wf = w * f
    const hf = h * f

    const mask: PIXI.Graphics = new PIXI.Graphics()
    mask.beginFill(0x000000).drawRoundedRect(0, 0, wf, hf, 6).endFill()

    const face: PIXI.Graphics = new PIXI.Graphics()
    face.beginFill(c, a)
        .drawRect(0, 0, wf, hf)
        .endFill()
        .lineStyle(f, ShadeColor(c, p3), a, 0)
        .moveTo(wf, 0)
        .lineTo(wf, hf)
        .lineTo(0, hf)
        .lineStyle(f, ShadeColor(c, p2), a, 0)
        .moveTo(wf - f, f)
        .lineTo(wf - f, hf - f)
        .lineTo(f, hf - f)
        .lineStyle(f, ShadeColor(c, p1), a, 0)
        .moveTo(wf - f, f)
        .lineTo(f, f)
        .lineTo(f, hf - f)
        .lineStyle(f, ShadeColor(c, p0), a, 0)
        .moveTo(wf, 0)
        .lineTo(0, 0)
        .lineTo(0, hf)
    face.cacheAsBitmap = true
    face.scale.set(1 / f, 1 / f)
    face.mask = mask

    return face
}

/** Create Icon from Sprite Item information */
function CreateIcon(
    itemName: string,
    setAnchor = true,
    darkBackground = false
): PIXI.DisplayObject {
    const item =
        FD.items[itemName] ||
        FD.fluids[itemName] ||
        FD.recipes[itemName] ||
        FD.signals[itemName] ||
        // inventory group icon is not present in FD.items
        FD.inventoryLayout.find(g => g.name === itemName)

    if (item.icon || (item as Item).dark_background_icon) {
        return generateIcon(item as Icon)
    }

    if (item.icons) return generateIcons(item.icons, item.icon_size, item.icon_mipmaps)

    function generateIcon(data: Icon): PIXI.Sprite {
        const icon =
            darkBackground && data.dark_background_icon ? data.dark_background_icon : data.icon

        let texture: PIXI.Texture

        if (data.icon_mipmaps) {
            const targetSize = 32
            let xOffset = 0
            for (let i = Math.log2(data.icon_size); i > Math.log2(targetSize); i--) {
                xOffset += Math.pow(2, i)
            }
            texture = G.sheet.get(icon, xOffset, 0, targetSize, targetSize)
        } else {
            texture = G.sheet.get(icon)
        }

        const sprite = new PIXI.Sprite(texture)
        if (setAnchor) {
            sprite.anchor.set(0.5)
        }
        return sprite
    }

    function generateIcons(
        icons: Icon[],
        icon_size?: number,
        icon_mipmaps?: number
    ): PIXI.Container {
        const img = new PIXI.Container()
        for (const icon of icons) {
            const sprite = generateIcon({ icon_size, icon_mipmaps, ...icon })
            if (icon.scale) {
                sprite.scale.set(icon.scale, icon.scale)
            }
            if (icon.shift) {
                sprite.position.set(icon.shift[0], icon.shift[1])
            }
            if (icon.tint) {
                applyTint(sprite, icon.tint)
            }

            if (!setAnchor && icon.shift) {
                sprite.position.x += sprite.width / 2
                sprite.position.y += sprite.height / 2
            }

            img.addChild(sprite)
        }
        return img
    }
}

/**
 * Creates an icon with amount on host at coordinates
 * @param host - PIXI.Container on top of which the icon shall be created
 * @param x - Horizontal position of icon from top left corner
 * @param y - Vertical position of icon from top left corner
 * @param name - Name if item
 * @param amount - Amount to show
 */
function CreateIconWithAmount(
    host: PIXI.Container,
    x: number,
    y: number,
    name: string,
    amount: number
): void {
    const icon: PIXI.DisplayObject = CreateIcon(name, false)
    icon.position.set(x, y)
    host.addChild(icon)

    const amountString: string = amount < 1000 ? amount.toString() : `${Math.floor(amount / 1000)}k`
    const text = new PIXI.Text(amountString, styles.icon.amount)
    text.anchor.set(1, 1)
    text.position.set(x + 33, y + 33)
    host.addChild(text)
}

function CreateRecipe(
    host: PIXI.Container,
    x: number,
    y: number,
    ingredients: IngredientOrResult[],
    results: IngredientOrResult[],
    time: number
): void {
    let nextX = x

    for (const i of ingredients) {
        CreateIconWithAmount(host, nextX, y, i.name, i.amount)
        nextX += 36
    }

    nextX += 2
    const timeText = `=${time}s>`
    const timeSize: PIXI.TextMetrics = PIXI.TextMetrics.measureText(timeText, styles.dialog.label)
    const timeObject: PIXI.Text = new PIXI.Text(timeText, styles.dialog.label)
    timeObject.position.set(nextX, 6 + y)
    host.addChild(timeObject)
    nextX += timeSize.width + 6

    for (const r of results) {
        CreateIconWithAmount(host, nextX, y, r.name, r.amount)
        nextX += 36
    }
}

function applyTint(s: PIXI.Sprite, tint: ColorWithAlpha): void {
    s.tint = PIXI.utils.rgb2hex([tint.r || 0, tint.g || 0, tint.b || 0])
    s.alpha = tint.a || 1
}

export default {
    ShadeColor,
    DrawRectangle,
    DrawControlFace,
    CreateIcon,
    CreateIconWithAmount,
    CreateRecipe,
    applyTint,
}
