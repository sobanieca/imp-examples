// One string per row, one character per brick: a colour, S for steel (two hits)
// or a dot for a gap. Every row has COLUMNS characters.
export const LEVELS = [
  [
    'RRRRRRRRRR',
    'OOOOOOOOOO',
    'YYYYYYYYYY',
    'GGGGGGGGGG',
    'CCCCCCCCCC',
  ],
  [
    'P.P.P.P.P.',
    '.C.C.C.C.C',
    'SSGGGGGGSS',
    'YYYY..YYYY',
    'OO.OOOO.OO',
    'RRRRRRRRRR',
  ],
  [
    '....SS....',
    '...PPPP...',
    '..CCCCCC..',
    '.GGGSSGGG.',
    'YYYYYYYYYY',
    '.OOOOOOOO.',
    '..RR..RR..',
  ],
]

export const KINDS = {
  R: { sprite: 'red', points: 70, hits: 1 },
  O: { sprite: 'orange', points: 60, hits: 1 },
  Y: { sprite: 'yellow', points: 50, hits: 1 },
  G: { sprite: 'green', points: 40, hits: 1 },
  C: { sprite: 'cyan', points: 30, hits: 1 },
  P: { sprite: 'purple', points: 80, hits: 1 },
  S: { sprite: 'steel', points: 150, hits: 2 },
}
