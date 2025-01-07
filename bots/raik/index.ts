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

function main() {
  console.log(`Trying to connect to ${SERVER_URL}`)
  const socket = io(SERVER_URL, { autoConnect: true })
  socket.connect()

  const previousRounds: RoundResult[] = []

  /******************************************/
  /*              CHANGE THIS               */
  const BOT_NAME = "superraikku"
  /******************************************/

  /**
   * Markov chain transition stats:
   * For each possible move that the opponent plays,
   * how often do they transition to ROCK, PAPER, or SCISSORS next time?
   *
   * Example structure:
   * {
   *   ROCK:     { ROCK: 0, PAPER: 0, SCISSORS: 0 },
   *   PAPER:    { ROCK: 0, PAPER: 0, SCISSORS: 0 },
   *   SCISSORS: { ROCK: 0, PAPER: 0, SCISSORS: 0 }
   * }
   */
  const opponentTransitionStats: Record<Move, Record<Move, number>> = {
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
   * Update transition stats based on the last two known opponent moves.
   * If the opponent played A last round and B this round, increment stats[A][B].
   */
  function updateTransitionStats() {
    const len = previousRounds.length
    // We need at least two consecutive rounds of data
    if (len < 2) return

    const secondLastRound = previousRounds[len - 2]
    const lastRound = previousRounds[len - 1]

    if (secondLastRound.opponent && lastRound.opponent) {
      const prevMove = secondLastRound.opponent
      const nextMove = lastRound.opponent
      opponentTransitionStats[prevMove][nextMove]++
    }
  }

  /**
   * Predict the opponent’s next move using:
   * 1. Markov chain transition data (if available for the opponent’s last move).
   * 2. Fall back to frequency analysis (last N rounds).
   * 3. If no data, pick randomly.
   */
  function predictOpponentMove(): Move {
    if (previousRounds.length === 0) {
      // No data yet
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
    }

    // 1) Attempt Markov-based prediction
    const lastOpponentMove = previousRounds[previousRounds.length - 1].opponent
    if (lastOpponentMove) {
      // Figure out which next move is most likely based on transitions from `lastOpponentMove`
      const transitions = opponentTransitionStats[lastOpponentMove]
      const possibleNextMoves = Object.keys(transitions) as Move[]

      // Find the move with the highest transition count from lastOpponentMove
      let maxCount = -1
      let predictedMove: Move = 'ROCK' // default fallback
      for (const nextMove of possibleNextMoves) {
        if (transitions[nextMove] > maxCount) {
          maxCount = transitions[nextMove]
          predictedMove = nextMove
        }
      }

      // If there's some actual data (maxCount > 0), trust the Markov chain
      if (maxCount > 0) {
        return predictedMove
      }
    }

    // 2) If Markov chain data is not sufficient or doesn't exist for last move,
    //    fall back to frequency approach (last N rounds).
    const LOOKBACK_ROUNDS = 5
    const recentRounds = previousRounds.slice(-LOOKBACK_ROUNDS)
    const opponentMoves = recentRounds
      .map(r => r.opponent)
      .filter((m): m is Move => !!m)

    if (opponentMoves.length === 0) {
      // Still no data? Pick random.
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
    }

    // Frequency analysis on the last N rounds
    const frequencies = getMoveFrequencies(opponentMoves)
    // Find the move(s) with the highest frequency
    const maxFreq = Math.max(...Object.values(frequencies))
    const mostFrequentMoves = (Object.entries(frequencies) as [Move, number][])
      .filter(([_, freq]) => freq === maxFreq)
      .map(([move]) => move)

    // If there's a single most frequent move, use it
    if (mostFrequentMoves.length === 1) {
      return mostFrequentMoves[0]
    } else {
      // Tiebreaker: just pick the last opponent move in a tie
      return opponentMoves[opponentMoves.length - 1]
    }
  }

  /**
   * Decide your move based on the predicted opponent move.
   * Optionally, add some randomness if you want to be less predictable.
   */
  function chooseMove(): Move {
    const predictedOpponentMove = predictOpponentMove()

    // Beat the predicted move
    const bestCounter = beatMove(predictedOpponentMove)

    // (Optional) Add a small chance to deviate to avoid becoming too predictable
    // e.g., 10% chance to pick a random move
    const DEVIATION_CHANCE = 0.1
    if (Math.random() < DEVIATION_CHANCE) {
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
    }

    return bestCounter
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

    // Each new round means we can update our Markov chain with the latest known data
    updateTransitionStats()

    /******************************************/
    /*              CODE HERE                 */

    const move = chooseMove()

    /*              STOP HERE                 */
    /******************************************/

    socket.emit('move', move)
  })
}

main()
