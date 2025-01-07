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
BOT_NAME = "Saksofoni 3000"
##################################################


def convert_round_result_to_float(result: RoundResult | None) -> int | None:
    if result is None:
        return None
    try:
        index = possible_moves.index(RoundResult.opponent)
    except AttributeError:
        index = 0
    return index


@sio.event
def connect():
    print("Connected to server")
    sio.emit("bot", BOT_NAME)


@sio.event
def round(previous_round: RoundResult | None):
    global round_index
    if previous_round:
        previous_rounds.append(previous_round)

    ##################################################
    #                   CODE HERE                    #

    if round_index == 0:
        move = "ROCK"
    if round_index % 19 == 0:
        move = "SCISSORS"
    else:
        counts = {"ROCK": 0, "PAPER": 0, "SCISSORS": 0}
        for i, round in enumerate(previous_rounds):
            try:
                counts[round["opponent"]] += 1
            except:
                pass
        max_hits_move, max_hits_count = max(counts.items(), key=lambda k: k[1])
        if max_hits_move == "ROCK":
            move = "PAPER"
        elif max_hits_move == "PAPER":
            move = "SCISSORS"
        else:
            move = "ROCK"

    #                   STOP HERE                    #
    ##################################################

    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
print("Trying to connect")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
