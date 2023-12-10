import {useCallback, useEffect, useRef} from "react"

import './index.css'

const canvasSize = 300
const ratio = window.devicePixelRatio
const friction = 0.995; // 0.995=soft, 0.99=mid, 0.98=hard
const PI = Math.PI
const TAU = 2 * PI
let tot = 0
let dia = 0
let rad = 0
let arc = 0
let targetRandomAng = 0
let angVel = 0
let ang = 0

const getIndex = () => Math.floor(tot - (ang / TAU) * tot) % tot;

const rand = (m: number, M: number) => Math.random() * (M - m) + m

const angRange = (index: number) => {
    index = index % tot
    const minAng = (tot - index - 1) * (TAU / tot)
    const maxAng = (tot - index) * (TAU / tot)
    return (maxAng + minAng) / 2
}

const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const prizes = [
    {color: "#0bf", label: "一等奖"},
    {color: "#fb0", label: "二等奖"},
    {color: "#0fb", label: "三等奖"},
    {color: "#b0f", label: "四等奖"},
    {color: "#f0b", label: "五等奖"},
    {color: "#f82", label: "六等奖"},
];


const WheelFortune = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const spanRef = useRef<HTMLDivElement | null>(null)
    const requestAnimationFrameRef = useRef<number | null>(null)

    const createItemDraw = useCallback(
        (ctx: CanvasRenderingContext2D, i: number, item: { color: string; label: string }) => {
            const ang = arc * i
            ctx.save()
            ctx.beginPath()
            ctx.fillStyle = item.color
            ctx.moveTo(rad, rad)
            ctx.arc(rad, rad, rad, ang, ang + arc)
            ctx.lineTo(rad, rad)
            ctx.fill()
            ctx.setLineDash([5 * ratio /* 线段长度 */, 3 * ratio /* 段间距 */])
            for (const angle of [ang, ang + arc]) {
                ctx.beginPath() // 开始一个新路径来绘制一条直线。
                ctx.strokeStyle = '#fff' // 设置颜色
                ctx.lineWidth = ratio // 可根据需求设置宽度，默认值是1
                ctx.moveTo(rad, rad)
                ctx.lineTo(rad + Math.cos(angle) * rad, rad + Math.sin(angle) * rad)
                ctx.stroke()
            }
            ctx.save()
            ctx.textAlign = 'right'
            ctx.fillStyle = '#fff'
            ctx.font = `bold ${ratio * 12}px sans-serif`

            const fontSize = ratio * 12
            const maxArcLength = arc - 0.3
            const text = item.label
            let totalArcLength = 0
            for (let j = 0; j < text.length; j++) {
                totalArcLength += ctx.measureText(text[j]).width / rad
            }
            let lines: string[] = []
            if (totalArcLength > maxArcLength) {
                let line = ''
                for (const char of text) {
                    if (ctx.measureText(line + char).width / rad > maxArcLength) {
                        lines.push(line)
                        line = char
                    } else {
                        line += char
                    }
                }
                if (line) {
                    lines.push(line)
                }
            } else {
                lines = [text]
            }

            for (let nLine = 0; nLine < lines.length; nLine++) {
                const currentString = lines[nLine]
                const totalCharWidth = currentString.split('').reduce((total, char) => {
                    return total + ctx.measureText(char).width / rad
                }, 0)

                const startAngCentered = ang + arc / 2 - totalCharWidth / 2
                for (let j = 0, currentAngleOffset = startAngCentered; j < currentString.length; j++) {
                    const charWidth = ctx.measureText(currentString[j]).width / rad
                    currentAngleOffset += charWidth / 2
                    const x = rad + Math.cos(currentAngleOffset) * rad * (lines.length > 1 ? 0.7 : 0.85)
                    const y = rad + Math.sin(currentAngleOffset) * rad * (lines.length > 1 ? 0.7 : 0.85)

                    ctx.translate(x, y)
                    ctx.rotate(currentAngleOffset + PI / 2)
                    ctx.textAlign = 'center'
                    ctx.fillText(currentString[j], 0, -(lines.length - 1 - nLine) * (fontSize * 1.25))
                    currentAngleOffset += charWidth / 2 + 0.02
                    ctx.resetTransform()
                }
            }

            const x = rad + Math.cos(ang + arc / 2) * rad * 0.85
            const y = rad + Math.sin(ang + arc / 2) * rad * 0.85
            ctx.translate(x, y)
            ctx.rotate(ang + arc / 2 + PI / 2)
            ctx.restore()
        },
        []
    )

    const rotate = useCallback(() => {
        const prize = prizes[getIndex()]
        const ctx = canvasRef.current?.getContext('2d')
        const span = spanRef.current
        if (ctx && span) {
            ctx.canvas.style.transform = `rotate(${ang - PI / 2}rad)`
            span.textContent = prize.label
            span.style.background = prize.color
        }
    }, [])

    const frame = useCallback(() => {
        if (!angVel) return;
        angVel *= friction;
        const diff = Math.abs(ang - targetRandomAng)
        if (angVel < 0.03 && diff < 0.03) {
            angVel = 0
        }
        ang += angVel;
        ang %= TAU;
        rotate();
    }, [rotate])

    const engine = useCallback(() => {
        frame()
        requestAnimationFrameRef.current = window.requestAnimationFrame(engine)
    }, [frame])

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d')
        if (canvasRef.current && ctx) {
            tot = prizes.length
            dia = ctx.canvas.width
            rad = dia / 2
            arc = TAU / tot
            rotate()
            engine()
            prizes.forEach((item, index) => createItemDraw(ctx, index, item))
            ctx.scale(ratio, ratio)
        }
        return () => {
            if (requestAnimationFrameRef.current) {
                window.cancelAnimationFrame(requestAnimationFrameRef.current)
            }
        }
    }, [createItemDraw, engine, rotate])


    const onDraw = () => {
        if (!angVel) {
            angVel = rand(0.25, 0.45)
            const index = getRandomInt(0, prizes.length - 1)
            console.log(index)
            targetRandomAng = angRange(index)
        }
    }

    return <div className={'container'}>
        <canvas
            width={canvasSize * ratio}
            height={canvasSize * ratio}
            style={{width: canvasSize, height: canvasSize}}
            ref={canvasRef}
        />
        <div ref={spanRef} className={'span'} onClick={onDraw}>span</div>
    </div>
}

export default WheelFortune