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
lucky_numbers = [26, 33, 77, 151, 2, 1050, 21, 2022, 3005, 53]

##################################################
#                  CHANGE THIS                   #
BOT_NAME = "slaybot"
##################################################


@sio.event
def connect():
    print("Connected to server")
    sio.emit("bot", BOT_NAME)


@sio.event
def round(previous_round: RoundResult | None):
    global round_index
    print(previous_round)
    if previous_round:
        previous_rounds.append(previous_round)

    ##################################################
    #                   CODE HERE                    #

    number = lucky_numbers[round_index % len(lucky_numbers)]
    move = possible_moves[number % len(possible_moves)]

    #                   STOP HERE                    #
    ##################################################

    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
print("Trying to connect")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
