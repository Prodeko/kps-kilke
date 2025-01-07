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
    
    H='SCISSORS'
    G='you'
    C='PAPER'
    B='ROCK'
    A='opponent'
    E=1
    F=1
    if round_index!=0:E=2 if previous_rounds[-1][A]==B else 5 if previous_rounds[-1][A]==C else 35;F=0 if previous_rounds[-1][G]==B else 1 if previous_rounds[-1][G]==C else 7
    if len(previous_rounds)>=5 and all(B[A]==previous_rounds[-1][A]for B in previous_rounds[-5:]):
        if previous_rounds[-1][A]==B:move=C
        elif previous_rounds[-1][A]==C:move=H
        else:move=B
    else:I=sum([1 if A==B else 2 if A==H else 0 for A in[round[A]for round in previous_rounds]]);move=possible_moves[(E+F+I+round_index*(round_index+1))%3]
    

    #                   STOP HERE                    #
    ##################################################

    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
print("Trying to connect")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
