const CELL_W = 8
const CELL_H = 16

export function paint(canvas: HTMLCanvasElement, rows: string[]) {
  const ctx = canvas.getContext("2d")!
  canvas.width = Math.max(...rows.map((r) => r.length)) * CELL_W
  canvas.height = rows.length * CELL_H
  ctx.font = `${CELL_H - 2}px Menlo, monospace`
  ctx.textBaseline = "top"
  ctx.fillStyle = "#0a0a0a"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "#ededed"
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) ctx.fillText(row[x]!, x * CELL_W, y * CELL_H)
  })
}
