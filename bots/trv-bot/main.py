from dataclasses import dataclass
import os
import time
from typing import Literal, get_args
import socketio
import numpy as np


SERVER_URL = os.environ["SERVER_URL"]
move_to_index = {'ROCK': 0, 'PAPER': 1, 'SCISSORS': 2}
index_to_move = {0: 'ROCK', 1: 'PAPER', 2: 'SCISSORS'}

Move = Literal["ROCK", "PAPER", "SCISSORS"]
Result = Literal["win", "loss", "draw"]
possible_moves = list(get_args(Move))

moves = [[0, 0, 0], [0, 0, 0], [0, 0, 0]] 
prev_prev_round = None
previous_moves = []


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
BOT_NAME = "trv-bot"
##################################################


def get_winning_move(move: str) -> str:
    if move == 'ROCK':
        return 'PAPER'
    elif move == 'PAPER':
        return 'SCISSORS'
    else:
        return 'ROCK'


@sio.event
def connect():
    print("Connected to server")
    sio.emit("bot", BOT_NAME)


@sio.event
def round(previous_round: RoundResult | None):
    global round_index, prev_prev_round, moves

    print(previous_round)
    if previous_round:
        if prev_prev_round:
            prev_prev_index = move_to_index[prev_prev_round['opponent']]
            prev_index = move_to_index[previous_round['opponent']]
            
            moves[prev_prev_index][prev_index] += 1
        
        previous_rounds.append(previous_round)
        prev_prev_round = previous_round
    
    if round_index == 0 or not previous_round:
        move = possible_moves[round_index + 1 % len(possible_moves)]
    else:
        last_move_index = move_to_index[previous_round['opponent']]
        
        most_likely_next_move_index = max(range(3), key=lambda i: moves[last_move_index][i])
        most_likely_next_move = index_to_move[most_likely_next_move_index]
        
        move = get_winning_move(most_likely_next_move)



    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
print("Trying to connect")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
