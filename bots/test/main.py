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
strategyIndex = 0

##################################################
#                  CHANGE THIS                   #
BOT_NAME = "python-herrasmieskivi"
##################################################


@sio.event
def connect():
    print("Connected to server")
    sio.emit("bot", BOT_NAME)


@sio.event
def round(previous_round: RoundResult | None):
    global round_index
    global strategyIndex
    print(previous_round)
    if previous_round:
        previous_rounds.append(previous_round)

    strategies = [
        ["SCISSORS", "PAPER", "ROCK", "SCISSORS", "PAPER", "PAPER", "ROCK", "SCISSORS", "SCISSORS", "PAPER", "ROCK", "SCISSORS"],
        ["PAPER", "ROCK", "SCISSORS", "PAPER", "ROCK", "ROCK", "SCISSORS", "PAPER","PAPER", "ROCK", "SCISSORS", "PAPER"],
    ]

    

    ##################################################
    #                   CODE HERE                    #


    move = strategies[0][round_index % 12]

    #                   STOP HERE                    #
    ##################################################

    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
print("Trying to connect")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
