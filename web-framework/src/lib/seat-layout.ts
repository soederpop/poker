export type SeatLayoutPoint = {
  x: number
  y: number
  align: "left" | "right"
  dealer: { x: number; y: number }
  chip: { x: number; y: number }
  chipAlign: "left" | "right"
}

export const SEAT_LAYOUT: Record<number, SeatLayoutPoint> = {
  1: { x: 15.6, y: 37.3, align: "left", dealer: { x: 19.6, y: 21.3 }, chip: { x: 20.6, y: 16.3 }, chipAlign: "left" },
  2: { x: 23.8, y: 15.8, align: "left", dealer: { x: 33.8, y: 10.8 }, chip: { x: 30.8, y: 14.8 }, chipAlign: "left" },
  3: { x: 51.2, y: 12.5, align: "left", dealer: { x: 59.2, y: 10.5 }, chip: { x: 50.2, y: 20.5 }, chipAlign: "left" },
  4: { x: 79.3, y: 17.3, align: "right", dealer: { x: 70.3, y: 12.3 }, chip: { x: 68.3, y: 16.3 }, chipAlign: "right" },
  5: { x: 85.9, y: 36.2, align: "right", dealer: { x: 81.9, y: 20.2 }, chip: { x: 77.9, y: 21.2 }, chipAlign: "right" },
  6: { x: 79, y: 61.8, align: "right", dealer: { x: 72, y: 70.8 }, chip: { x: 72, y: 56.8 }, chipAlign: "right" },
  7: { x: 60.3, y: 68.8, align: "right", dealer: { x: 58.3, y: 81.8 }, chip: { x: 55.3, y: 64.8 }, chipAlign: "right" },
  8: { x: 40.7, y: 69.7, align: "left", dealer: { x: 42.7, y: 82.7 }, chip: { x: 33.7, y: 65.7 }, chipAlign: "left" },
  9: { x: 19.9, y: 61.9, align: "left", dealer: { x: 18.9, y: 65.9 }, chip: { x: 16.9, y: 48.9 }, chipAlign: "left" },
}
