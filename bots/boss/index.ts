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
 * For the meta-strategy results, we'll track how many times
 * each approach actually predicted the opponent's move correctly.
 */
type PredictorName = 'secondOrder' | 'firstOrder' | 'frequency'
const predictorPerformance: Record<PredictorName, number> = {
  secondOrder: 0,
  firstOrder: 0,
  frequency: 0,
}

function main() {
  console.log(`Trying to connect to ${SERVER_URL}`)
  const socket = io(SERVER_URL, { autoConnect: true })
  socket.connect()

  const previousRounds: RoundResult[] = []

  /******************************************/
  /*              CHANGE THIS               */
  const BOT_NAME = "superior-raineri"
  /******************************************/

  /**
   * secondOrderTransitionStats tracks transitions from pairs of moves
   * (last-2, last-1) -> next move.
   * E.g. secondOrderTransitionStats['ROCK']['SCISSORS'] = {
   *      ROCK: 2, PAPER: 1, SCISSORS: 0
   * }
   */
  const secondOrderTransitionStats: Record<Move, Record<Move, Record<Move, number>>> = {
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

  /**
   * First-order Markov chain: move -> next move.
   */
  const firstOrderTransitionStats: Record<Move, Record<Move, number>> = {
    ROCK: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
    PAPER: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
    SCISSORS: { ROCK: 0, PAPER: 0, SCISSORS: 0 },
  }

  /**
   * Given an opponent’s move, return the move that beats it.
   */
  function beatMove(opponentMove: Move): Move {
    switch (opponentMove) {
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

  /**
   * Get the frequency of each move from a list of moves.
   */
  function getMoveFrequencies(moves: Move[]): Record<Move, number> {
    return moves.reduce((acc, move) => {
      acc[move] = (acc[move] ?? 0) + 1
      return acc
    }, {} as Record<Move, number>)
  }

  /**
   * Update second-order and first-order transition stats from
   * the last 2 or 1 rounds respectively.
   */
  function updateTransitionStats() {
    const len = previousRounds.length
    if (len < 2) return

    const penultimateRound = previousRounds[len - 2]
    const lastRound = previousRounds[len - 1]

    if (penultimateRound.opponent && lastRound.opponent) {
      // Update first-order chain
      firstOrderTransitionStats[penultimateRound.opponent][lastRound.opponent]++

      // Update second-order chain if we have at least 3 rounds
      if (len >= 3) {
        const thirdLastRound = previousRounds[len - 3]
        if (thirdLastRound.opponent) {
          // secondOrderTransitionStats[ (move t-3), (move t-2) ][ (move t-1) ] -> inc
          const secondLastMove = penultimateRound.opponent
          const lastMove = lastRound.opponent
          const thirdLastMove = thirdLastRound.opponent
          secondOrderTransitionStats[thirdLastMove][secondLastMove][lastMove]++
        }
      }
    }
  }

  /**
   * Second-order Markov Prediction:
   * Look at the last two known opponent moves. Predict the next move
   * based on which move is most frequently observed after that pair.
   */
  function predictSecondOrderMove(): Move | null {
    if (previousRounds.length < 2) return null

    const last = previousRounds[previousRounds.length - 1].opponent
    const secondLast = previousRounds[previousRounds.length - 2].opponent
    if (!last || !secondLast) return null

    // Get the distribution from secondOrderTransitionStats[ secondLast ][ last ]
    const transitions = secondOrderTransitionStats[secondLast][last]
    if (!transitions) return null

    // Find the move with the highest count
    let maxCount = -1
    let bestMove: Move | null = null
    for (const nextMove of possibleMoves) {
      if (transitions[nextMove] > maxCount) {
        maxCount = transitions[nextMove]
        bestMove = nextMove
      }
    }

    // If we have actual data (maxCount > 0), use it, else null
    if (bestMove && maxCount > 0) {
      return bestMove
    }
    return null
  }

  /**
   * First-order Markov Prediction:
   * Predict next move based on opponent’s last move alone.
   */
  function predictFirstOrderMove(): Move | null {
    if (previousRounds.length === 0) return null
    const lastMove = previousRounds[previousRounds.length - 1].opponent
    if (!lastMove) return null

    const transitions = firstOrderTransitionStats[lastMove]
    // Find the move with the highest transition count
    let maxCount = -1
    let bestMove: Move | null = null
    for (const nextMove of possibleMoves) {
      if (transitions[nextMove] > maxCount) {
        maxCount = transitions[nextMove]
        bestMove = nextMove
      }
    }
    return (bestMove && maxCount > 0) ? bestMove : null
  }

  /**
   * Frequency-based approach:
   * Look at the opponent’s last N moves, pick the most frequent.
   */
  function predictFrequencyMove(): Move | null {
    const LOOKBACK_ROUNDS = 5
    const recentRounds = previousRounds.slice(-LOOKBACK_ROUNDS)
    const opponentMoves = recentRounds
      .map(r => r.opponent)
      .filter((m): m is Move => !!m)

    if (opponentMoves.length === 0) return null

    const frequencies = getMoveFrequencies(opponentMoves)
    const maxFreq = Math.max(...Object.values(frequencies))
    const mostFrequentMoves = (Object.entries(frequencies) as [Move, number][])
      .filter(([_, freq]) => freq === maxFreq)
      .map(([move]) => move)

    if (mostFrequentMoves.length === 1) {
      return mostFrequentMoves[0]
    } else {
      // tie-breaker: just pick the last opponent move if there's a tie
      return opponentMoves[opponentMoves.length - 1]
    }
  }

  /**
   * Meta-strategy pick:  We see which predictor is doing best so far
   * in terms of correct guesses. We'll try to use that approach first.
   */
  function chooseMetaPredictor(): PredictorName[] {
    // Sort predictorPerformance by value desc
    // Return an array of predictor names in order of their performance
    const sorted = Object.entries(predictorPerformance).sort((a, b) => b[1] - a[1])
    return sorted.map(([predictorName]) => predictorName as PredictorName)
  }

  /**
   * Main prediction pipeline:
   * 1) Try the best (meta) predictor first.
   * 2) If it fails or returns null, fallback to the next.
   * 3) If all fails, pick random.
   */
  function predictOpponentMove(): { move: Move; approach: PredictorName | 'random' } {
    const metaOrder = chooseMetaPredictor()
    const predictors: Record<PredictorName, () => Move | null> = {
      secondOrder: predictSecondOrderMove,
      firstOrder: predictFirstOrderMove,
      frequency: predictFrequencyMove,
    }

    // Try each predictor in the order of best performance
    for (const approach of metaOrder) {
      const predicted = predictors[approach]()
      if (predicted) {
        return { move: predicted, approach }
      }
    }

    // If none gave a valid prediction, pick random
    const randomMove = possibleMoves[0]
    return { move: randomMove, approach: 'random' }
  }

  /**
   * Choose your move by beating the predicted opponent move.
   * Add random deviation if you like.
   */
  function chooseMove(): { move: Move; approach: PredictorName | 'random' } {
    const { move: predictedOpponentMove, approach } = predictOpponentMove()
    const counter = beatMove(predictedOpponentMove)

    // random deviation
    const DEVIATION_CHANCE = 0.05
    if (Math.random() < DEVIATION_CHANCE) {
      return {
        move: possibleMoves[Math.floor(Math.random() * possibleMoves.length)],
        approach: 'random',
      }
    }

    return { move: counter, approach }
  }

  /**
   * After each round ends, we know the opponent's actual move.
   * We can check if our predicted move was correct or not and update
   * that predictor’s performance stat.
   */
  function updatePredictorPerformance(usedApproach: PredictorName | 'random', predictedOppMove: Move, actualOppMove: Move) {
    if (usedApproach !== 'random') {
      // If the predictor guessed the opponent's move correctly, increment
      if (predictedOppMove === actualOppMove) {
        predictorPerformance[usedApproach]++
      }
    }
  }

  socket.on('connect', () => {
    console.log("Connected to server")
    socket.emit('bot', BOT_NAME)
  })

  socket.on('round', (previousRound: RoundResult | undefined) => {
    console.log(previousRound)
    // Store result of the last round
    if (previousRound) {
      previousRounds.push(previousRound)
    }

    // Update Markov chains
    updateTransitionStats()

    /******************************************/
    /*              CODE HERE                 */

    // 1) Predict opponent move
    const { move: predictedOppMove, approach: usedApproach } = predictOpponentMove()
    // 2) Counter it
    let chosenMove = beatMove(predictedOppMove)

    // Random deviation to be less predictable
    const DEVIATION_CHANCE = 0.05
    if (Math.random() < DEVIATION_CHANCE) {
      chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
    }

    /*              STOP HERE                 */
    /******************************************/

    // Send our chosen move
    socket.emit('move', chosenMove)

    // When the *next* round event arrives, we’ll know whether our predicted move was right
    // because previousRounds[previousRounds.length - 1] will contain the actual move for this round.
    // We need to wait one more round to update the predictor's performance.
    // So let's do that after the next round arrives:
    socket.once('round', (newRound: RoundResult | undefined) => {
      // The move we predicted is stored in predictedOppMove
      // The actual is newRound.opponent
      if (newRound?.opponent) {
        updatePredictorPerformance(usedApproach, predictedOppMove, newRound.opponent)
      }
    })
  })
}

main()
