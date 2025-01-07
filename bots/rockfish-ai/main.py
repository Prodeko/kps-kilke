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
BOT_NAME = "rockfishAI"
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
    
    op = 1
    pp = 1
    if round_index != 0:
        op = round_index+3 #2 if previous_rounds[-1]['opponent'] == 'ROCK' else 5 if previous_rounds[-1]['opponent'] == 'PAPER' else 35
        pp = 3*round_index+7 #0 if previous_rounds[-1]['you'] == 'ROCK' else 1 if previous_rounds[-1]['you'] == 'PAPER' else 7

    # Check if the last 5 opponent moves are the same
    #if len(previous_rounds) >= 5 and all(past['opponent'] == previous_rounds[-1]['opponent'] for past in previous_rounds[-5:]):
    #    # Pick the move that beats the repeated move
    #    if previous_rounds[-1]['opponent'] == "ROCK":
    #        move = "PAPER"
    #    elif previous_rounds[-1]['opponent'] == "PAPER":
    #        move = "SCISSORS"
    #    else:  # SCISSORS
    #
    #        move = "ROCK"

    # Default deterministic behavior
    #sum_previous = sum([1 if m == "ROCK" else 2 if m == "SCISSORS" else 0 for m in [round['opponent'] for round in previous_rounds]])
    move = possible_moves[(op + pp + round_index * (round_index + 1)) % 3]
    

    #                   STOP HERE                    #
    ##################################################

    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
print("Trying to connect")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
