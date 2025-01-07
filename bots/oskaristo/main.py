from dataclasses import dataclass
import os
import time
from typing import Literal, get_args
import socketio
import functools

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
BOT_NAME = "oskaristo   "
##################################################


@sio.event
def connect():
    print("Connected to server")
    sio.emit("bot", BOT_NAME)




@sio.event
def round(previous_round: RoundResult | None):
    global round_index
    print(previous_round)
    try:
        previous_round = RoundResult(**previous_round)
        previous_rounds.append(previous_round)
    except:
        previous_round = RoundResult("ROCK", "PAPER", "win")
        previous_rounds.append(previous_round)

    ##################################################
    #                   CODE HERE                    #

    
    def gen_1(prev: RoundResult):
        match prev.opponent:
            case "ROCK":
                return "PAPER"
            case "PAPER":
                return "SCISSORS"
            case "SCISSORS":
                return "ROCK"
            case _:
                return "ROCK"
        
    def gen_2(prev: RoundResult | None):
        match prev.opponent:
            case "ROCK":
                return "SCISSORS"
            case "PAPER":
                return "ROCK"
            case "SCISSORS":
                return "PAPER"
            case _:
                return "ROCK"

    def gen_3(prev: RoundResult | None):
        return prev.opponent
    
    def gen(prev: RoundResult | None):
        STRATEGY_INDEX = 0
        STRATEGIES = [gen_1, gen_2, gen_3]

        if round_index > 50:
            try:

                

                if round_index % 13 == 0:
                    STRATEGY_INDEX = (STRATEGY_INDEX + 1) % 3
                    print("changed strategy")

                return STRATEGIES[STRATEGY_INDEX](previous_round)

            except Exception as e:
                print(e)
                return gen_3(previous_round)
        else: 
            return gen_1(previous_round)
        
    move = gen(previous_round)
    #                   STOP HERE                    #
    ##################################################

    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
print("Trying to connect")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
