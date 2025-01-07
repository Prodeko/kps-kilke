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
  
  let roundIndex = 0
  const previousRounds: RoundResult[] = []
  
  /******************************************/
  /*              CHANGE THIS               */
  const BOT_NAME = "example-node"
  /******************************************/

  socket.on('connect', () => {
    console.log("Connected to server")
    socket.emit('bot', BOT_NAME)
  })

  socket.on('round', (previousRound: RoundResult | undefined) => {
    console.log(previousRound)
    if (previousRound) previousRounds.push(previousRound)

    /******************************************/
    /*              CODE HERE                 */
    
    
    const move = possibleMoves[roundIndex % possibleMoves.length]
    
    
    /*              STOP HERE                 */
    /******************************************/    
    
    socket.emit('move', move)
    roundIndex++
  })
}

main()