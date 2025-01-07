from dataclasses import dataclass
import os
import time
from typing import Literal, get_args
import socketio

SERVER_URL = os.environ["SERVER_URL"]

Move = Literal["ROCK", "PAPER", "SCISSORS"]
Result = Literal["win", "loss", "draw"]
possible_moves = list(get_args(Move))

@dataclass
class RoundResult:
  you: Move
  opponent: Move
  result: Result

sio = socketio.Client(reconnection=True, reconnection_attempts=0)

round_index = 0
previous_rounds = [RoundResult]

##################################################
#                  CHANGE THIS                   #
BOT_NAME = "example-python"
##################################################

@sio.event
def connect():
  print("Connected to server")
  sio.emit("bot", BOT_NAME)

@sio.event
def round(previous_round: RoundResult | None):
  global round_index
  print(previous_round)
  if previous_round: previous_rounds.append(previous_round)

  ##################################################
  #                   CODE HERE                    #

  
  move = possible_moves[round_index % len(possible_moves)]

  #                   STOP HERE                    #
  ##################################################

  sio.emit("move", move)
  round_index += 1

print(f"Trying to connect to {SERVER_URL}")
connected = False
while not connected:
    try:
        sio.connect(SERVER_URL)
        connected = True
    except Exception:
        time.sleep(0.1)

