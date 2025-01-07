import React, { useEffect, useState } from 'react';
import io from 'socket.io-client'
import { SERVER_URL } from './config'; 
import { Bots, Round, Side } from './types';
import RoundDisplay from './RoundDisplay';
import { StartMatchButton } from './StartRoundButton';



const socket = io(SERVER_URL)
console.log('Connecting to server at ', SERVER_URL)

socket.on('reconnect', () => {
  console.log('Reconnected to server')
  socket.emit("getBots")
})

socket.on('connect', () => {
  console.log('Connected to server')
  socket.emit("getBots")
})

function App() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [winningSide, setWinningSide] = useState<Side | null>(null)
  const [startDisabled, setStartDisabled] = useState(true)
  const [bots, setBots] = useState<Bots>({})

  useEffect(() => {
    socket.connect()
    socket.on('bots', (bots: Bots) => {
      console.log('bots: ', bots)
      setBots(bots)
      if (bots.left && bots.right) {
        setStartDisabled(false)
      }
    })

    socket.on('rounds', (data: Round[]) => {
      console.log('rounds: ', data)
      setRounds(data.reverse())
    })

    socket.on('result', (winningSide: Side) => {
      console.log("result: ", winningSide)
      setWinningSide(winningSide)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  function handleStartClick() {
    socket.emit('start')
    setStartDisabled(true)
  }

  return (
    <div className="App">
      <StartMatchButton onClick={handleStartClick} isDisabled={startDisabled} />
      <RoundDisplay rounds={rounds} winningSide={winningSide} leftName={bots.left ?? 'Not connected'} rightName={bots.right ?? 'Not connected'}/>
    </div>
  );
}

export default App;
