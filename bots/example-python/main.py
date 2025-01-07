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

loop = [0, 2, 1, 2, 1]
loop_rev = [1, 2, 1, 2, 0]

sum_rock = 0
sum_paper = 0
sum_scissors = 0

def isrobin(prev_rounds):
    for i in range(len(prev_rounds)):
        if prev_rounds[i] != possible_moves[i % 3]:
            return False
    return True

def is_biased_index(sum_rock, sum_paper, sum_scissors):
    over_sum = sum_rock + sum_paper + sum_scissors
    frac_rock = sum_rock / over_sum
    frac_paper = sum_paper / over_sum
    frac_scissors = sum_scissors / over_sum

    if frac_rock > .5:
        return 0
    if frac_paper > .5:
        return 1
    if frac_scissors > .5:
        return 2
    return -1 

def winning_index(expected_index):
    if expected_index == 0:
        return 1
    if expected_index == 1:
        return 2
    if expected_index == 2:
        return 3
    return 1

def largest_value(r, p, s):
    if r >= p and r >= s:
        return 0  # r is the biggest
    elif p >= r and p >= s:
        return 1  # p is the biggest
    else:
        return 2  # s is the biggest

def freq_table(prev_rounds):
    move_dict = {}

    i = 1
    while i < len(prev_rounds):
        round = prev_rounds[i-1]
        key = {round.you, round.opponent}
        if key in move_dict:
            move_dict[key][prev_rounds[i].opponent] += 1
        else:
            move_dict[key] = {"ROCK": 0, "PAPER": 0, "SCISSORS": 0}
        move_dict[key][prev_rounds[i].opponent] += 1
        i+=1 
    last_round = prev_rounds[len(prev_rounds) -1]
    r = move_dict[last_round.you, last_round.opponent]["ROCK"]
    p = move_dict[last_round.you, last_round.opponent]["PAPER"]
    s = move_dict[last_round.you, last_round.opponent]["SCISSORS"]  

    return largest_value(r, p, s)

@sio.event
def round(previous_round: RoundResult | None):
    global round_index
    print(previous_round)
    if previous_round:
        previous_rounds.append(previous_round)
        if previous_round.opponent == "ROCK":
            sum_rock += 1
        if previous_round.opponent == "PAPER":
            sum_paper += 1
        if previous_round.opponent == "SCISSORS":
            sum_scissors += 1
    
    so_far_robin = isrobin(previous_rounds)
    

    if round_index < 30:
        move = possible_moves[loop[round_index % 5]]
    elif round_index < 60:
        move = possible_moves[loop_rev[round_index % 5]]
    else:
        if so_far_robin:
            #move = 1
            move = possible_moves[winning_index((round_index) % 3)]
        biased_index = is_biased_index(sum_rock, sum_paper, sum_scissors)
        if biased_index != -1:
            move = possible_moves[winning_index(biased_index)]
        
        # prev move freq calculation

        move = possible_moves[winning_index(freq_table(previous_rounds))]


        


    #                   STOP HERE                    #
    ##################################################

    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
print("Trying to connect")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
