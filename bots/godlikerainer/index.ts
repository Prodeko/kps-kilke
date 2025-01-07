import { io } from 'socket.io-client'

const SERVER_URL = process.env.SERVER_URL!

export const Moves = {
  ROCK: 0,
  PAPER: 1,
  SCISSORS: 2,
} as const

const possibleMoves = Object.keys(Moves) as Move[]

export type Move = keyof typeof Moves

type RoundResult = {
  you?: Move,
  opponent?: Move,
  result: 'win' | 'loss' | 'draw'
}

/**
 * Name of each predictor approach
 */
type PredictorName = 'suffix' | 'secondOrder' | 'frequency' 

/**
 * We store “scores” for each predictor, updated after each round
 * to reflect how accurately it guessed the opponent’s next move.
 */
const predictorScores: Record<PredictorName, number> = {
  suffix: 1,
  secondOrder: 1,
  frequency: 1,
}

/******************************************/
/*        HIDDEN HARD-CODED VALUES        */
/******************************************/
/**
 * You can override these via environment variables or
 * keep them private. This is just an example of “hiding” them.
 */
const hiddenConfig = {
  SUFFIX_MAX_LENGTH: parseInt(process.env.SUFFIX_MAX_LENGTH || '3'), // up to 3
  LOOKBACK_ROUNDS: parseInt(process.env.LOOKBACK_ROUNDS || '5'),     // last 5
  LEARNING_RATE: parseFloat(process.env.LEARNING_RATE || '0.2'),     // how quickly we up/down scores
  MIN_SCORE: parseFloat(process.env.MIN_SCORE || '0.1'),             // floor for predictor scores
  FALLBACK_MOVE: (process.env.FALLBACK_MOVE as Move) || 'ROCK',      // deterministic fallback
}

function main() {
  console.log(`Trying to connect to ${SERVER_URL}`)
  const socket = io(SERVER_URL, { autoConnect: true })
  socket.connect()

  const previousRounds: RoundResult[] = []

  /******************************************/
  /*              CHANGE THIS               */
  const BOT_NAME = "super-rainer"
  /******************************************/

  /* ==============================
   *  SUFFIX / PATTERN MATCHING
   * ==============================
   * We'll store sequences of length k in a stats object:
   * suffixStats[k][sequence] = { ROCK: count, PAPER: count, SCISSORS: count }
   */
  const suffixStats: Record<
    number,
    Record<string, Record<Move, number>>
  > = {}

  for (let k = 1; k <= hiddenConfig.SUFFIX_MAX_LENGTH; k++) {
    suffixStats[k] = {}
  }

  function updateSuffixStats() {
    const n = previousRounds.length
    if (n < 2) return

    // We only need to update for the latest round
    const lastIndex = n - 1
    const newMove = previousRounds[lastIndex]?.opponent
    if (!newMove) return

    // For k = 1..max, record (suffix -> next move)
    for (let k = 1; k <= hiddenConfig.SUFFIX_MAX_LENGTH; k++) {
      if (lastIndex - k < 0) break

      const seq = []
      for (let offset = k; offset > 0; offset--) {
        const oppMv = previousRounds[lastIndex - offset]?.opponent
        if (!oppMv) break
        seq.push(oppMv)
      }
      if (seq.length < k) continue

      const seqKey = seq.join('|')
      if (!suffixStats[k][seqKey]) {
        suffixStats[k][seqKey] = { ROCK: 0, PAPER: 0, SCISSORS: 0 }
      }
      suffixStats[k][seqKey][newMove]++
    }
  }

  function predictUsingSuffix(): Move | null {
    const n = previousRounds.length
    if (n === 0) return null

    // Try the longest suffix first
    for (let k = hiddenConfig.SUFFIX_MAX_LENGTH; k >= 1; k--) {
      if (n < k) continue

      const seq = []
      for (let offset = k; offset > 0; offset--) {
        const oppMv = previousRounds[n - offset]?.opponent
        if (!oppMv) break
        seq.push(oppMv)
      }
      if (seq.length < k) continue

      const seqKey = seq.join('|')
      const stats = suffixStats[k][seqKey]
      if (stats) {
        // find which next move has the highest count
        let bestMove: Move | null = null
        let bestCount = -1
        for (const m of possibleMoves) {
          const c = stats[m]
          if (c > bestCount) {
            bestCount = c
            bestMove = m
          }
        }
        if (bestMove && bestCount > 0) {
          return bestMove
        }
      }
    }
    return null
  }

  /* =========================
   *  SECOND-ORDER MARKOV
   * =========================
   */
  const secondOrderStats: Record<Move, Record<Move, Record<Move, number>>> = {
    ROCK: {
      ROCK: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
      PAPER: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
      SCISSORS: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
    },
    PAPER: {
      ROCK: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
      PAPER: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
      SCISSORS: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
    },
    SCISSORS: {
      ROCK: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
      PAPER: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
      SCISSORS: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
    },
  }

  function updateSecondOrderStats() {
    const n = previousRounds.length
    if (n < 3) return
    // last triple of moves
    const thirdLast = previousRounds[n - 3].opponent
    const secondLast = previousRounds[n - 2].opponent
    const last = previousRounds[n - 1].opponent
    if (thirdLast && secondLast && last) {
      secondOrderStats[thirdLast][secondLast][last]++
    }
  }

  function predictSecondOrder(): Move | null {
    const n = previousRounds.length
    if (n < 2) return null
    const secondLast = previousRounds[n - 2].opponent
    const last = previousRounds[n - 1].opponent
    if (!secondLast || !last) return null

    const transitions = secondOrderStats[secondLast][last]
    let bestMove: Move | null = null
    let bestCount = -1
    for (const m of possibleMoves) {
      if (transitions[m] > bestCount) {
        bestCount = transitions[m]
        bestMove = m
      }
    }
    if (bestMove && bestCount > 0) return bestMove
    return null
  }

  /* ===============
   * FREQUENCY
   * ===============
   */
  function getMoveFrequencies(moves: Move[]): Record<Move, number> {
    return moves.reduce((acc, m) => {
      acc[m] = (acc[m] ?? 0) + 1
      return acc
    }, {} as Record<Move, number>)
  }

  function predictFrequency(): Move | null {
    if (previousRounds.length === 0) return null

    const recent = previousRounds.slice(-hiddenConfig.LOOKBACK_ROUNDS)
    const oppMoves = recent
      .map(r => r.opponent)
      .filter((m): m is Move => !!m)

    if (oppMoves.length === 0) return null

    const freq = getMoveFrequencies(oppMoves)
    const maxCount = Math.max(...Object.values(freq))

    // find all top moves
    const topMoves = (Object.entries(freq) as [Move, number][])
      .filter(([_, v]) => v === maxCount)
      .map(([m]) => m)

    // tie-break: pick the last move among the top
    const lastMove = oppMoves[oppMoves.length - 1]
    if (topMoves.length === 1) {
      return topMoves[0]
    } else if (topMoves.includes(lastMove)) {
      return lastMove
    } else {
      // deterministic pick: first in alphabetical order
      return topMoves.sort()[0]
    }
  }

  /* =========================
   * DET. WEIGHTED MAJORITY
   * =========================
   * Instead of picking a predictor randomly by weights, we do:
   * 1) Sort predictors by (score DESC, name ASC).
   * 2) The first predictor that returns a non-null guess is chosen.
   * 3) If none guess, fallback to hiddenConfig.FALLBACK_MOVE.
   */

  function deterministicWeightedPredict(): {
    predictedMove: Move
    usedPredictor: PredictorName | 'fallback'
  } {
    // gather predictions
    const allPredictions: {
      name: PredictorName
      guess: Move | null
    }[] = [
      { name: 'suffix', guess: predictUsingSuffix() },
      { name: 'secondOrder', guess: predictSecondOrder() },
      { name: 'frequency', guess: predictFrequency() },
    ]

    // sort them by (score desc, name asc) for deterministic resolution
    allPredictions.sort((a, b) => {
      const scoreDiff = predictorScores[b.name] - predictorScores[a.name]
      if (scoreDiff !== 0) return scoreDiff > 0 ? 1 : -1
      // if scores are the same, name asc
      return a.name < b.name ? -1 : 1
    })

    // find first non-null guess
    for (const p of allPredictions) {
      if (p.guess !== null) {
        return { predictedMove: p.guess, usedPredictor: p.name }
      }
    }

    // fallback
    return { predictedMove: hiddenConfig.FALLBACK_MOVE, usedPredictor: 'fallback' }
  }

  /* =========================
   *  Move to beat opponent
   * =========================
   */
  function beatMove(m: Move): Move {
    switch (m) {
      case 'ROCK':
        return 'PAPER'
      case 'PAPER':
        return 'SCISSORS'
      case 'SCISSORS':
        return 'ROCK'
      default:
        return 'ROCK'
    }
  }

  /* =========================
   *  CHOOSING YOUR MOVE
   * =========================
   */
  function chooseMove(): {
    yourMove: Move
    predictedOppMove: Move
    usedPredictor: PredictorName | 'fallback'
  } {
    const { predictedMove, usedPredictor } = deterministicWeightedPredict()
    const yourMove = beatMove(predictedMove)
    return { yourMove, predictedOppMove: predictedMove, usedPredictor }
  }

  /* =========================
   *  SCORE UPDATES
   * =========================
   * If the predictor guessed the opponent's move correctly, we increase its score.
   * Otherwise, we decrease it (down to a minimum).
   */
  function updatePredictorScores(
    usedPredictor: PredictorName | 'fallback',
    predictedOppMove: Move,
    actualOppMove: Move
  ) {
    if (usedPredictor === 'fallback') return
    if (predictedOppMove === actualOppMove) {
      // correct guess
      predictorScores[usedPredictor] += hiddenConfig.LEARNING_RATE
    } else {
      predictorScores[usedPredictor] = Math.max(
        hiddenConfig.MIN_SCORE,
        predictorScores[usedPredictor] - hiddenConfig.LEARNING_RATE
      )
    }
  }

  /* =========================
   *  SOCKET EVENTS
   * =========================
   */
  let pendingPrediction: {
    usedPredictor: PredictorName | 'fallback'
    predictedOppMove: Move
  } | null = null

  socket.on('connect', () => {
    console.log("Connected to server")
    socket.emit('bot', BOT_NAME)
  })

  socket.on('round', (previousRound: RoundResult | undefined) => {
    console.log("Round ended:", previousRound)

    // 1) Store the previous round result
    if (previousRound) {
      previousRounds.push(previousRound)
    }

    // 2) Update predictor scores for the last prediction
    if (pendingPrediction && previousRound?.opponent) {
      const { usedPredictor, predictedOppMove } = pendingPrediction
      updatePredictorScores(usedPredictor, predictedOppMove, previousRound.opponent)
      pendingPrediction = null
    }

    // 3) Update stats (suffix, second-order, etc.)
    updateSuffixStats()
    updateSecondOrderStats()

    // 4) Choose next move
    const { yourMove, predictedOppMove, usedPredictor } = chooseMove()

    // We’ll verify correctness after next round
    pendingPrediction = { usedPredictor, predictedOppMove }

    // 5) Emit our choice
    socket.emit('move', yourMove)
  })
}

main()
