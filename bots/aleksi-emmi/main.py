from dataclasses import dataclass
import os
from typing import Literal, get_args
import socketio
import random

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
previous_rounds: list[RoundResult] = []

##################################################
#                  CHANGE THIS                   #
BOT_NAME = "slaybot"
##################################################

####################
# Q-LEARNING PARAMS
####################
ALPHA = 0.1  # Learning rate
GAMMA = (
    0.0  # Discount factor for next state (RPS is usually stateless, so gamma=0 is okay)
)
EPSILON = 0.1  # Probability to pick a random action (exploration)

# We'll define states as the opponent's LAST move
# So possible states = ["None", "ROCK", "PAPER", "SCISSORS"]
states = ["None"] + possible_moves

# Initialize Q-table: Q[state][action] = 0
Q = {}
for s in states:
    Q[s] = {}
    for a in possible_moves:
        Q[s][a] = 0.0

# Keep track of the current state
current_state = "None"


def get_reward(result: Result) -> float:
    if result == "win":
        return +1.0
    elif result == "loss":
        return -1.0
    else:  # draw
        return 0.0


@sio.event
def connect():
    print("Connected to server")
    sio.emit("bot", BOT_NAME)


@sio.event
def round(previous_round: RoundResult | None):
    global round_index
    global current_state

    # If previous_round is a dict, convert it into a RoundResult
    if isinstance(previous_round, dict):
        previous_round = RoundResult(
            you=previous_round["you"],
            opponent=previous_round["opponent"],
            result=previous_round["result"],
        )

    print(previous_round)
    if previous_round:
        previous_rounds.append(previous_round)

        # ... now previous_round is guaranteed to be a RoundResult
        reward = get_reward(previous_round.result)

        # 2. Observe new state (opponent's latest move)
        new_state = previous_round.opponent

        # 3. Update Q(current_state, action) using the RL formula
        #    But we need to recall the action we took. We can store it in our logic
        last_action = previous_round.you  # from the last round result
        best_future_q = max(Q[new_state].values())  # max_{a'} Q(new_state, a')
        old_value = Q[current_state][last_action]

        # Q-learning update
        Q[current_state][last_action] = old_value + ALPHA * (
            reward + GAMMA * best_future_q - old_value
        )

        # 4. Transition to the new state
        current_state = new_state
    else:
        # This is the very first round - no previous result
        current_state = "None"

    ##################################################
    #                   CODE HERE                    #
    ##################################################

    # Epsilon-greedy: pick a random move with probability EPSILON
    if random.random() < EPSILON:
        move = random.choice(possible_moves)
    else:
        # Otherwise pick best move from Q-table for current state
        q_vals = Q[current_state]
        # Argmax over possible moves
        move = max(q_vals, key=q_vals.get)

    ##################################################
    #                   STOP HERE                    #
    ##################################################

    sio.emit("move", move)
    round_index += 1
    sio.wait()


print(f"Trying to connect to {SERVER_URL}")
sio.connect(SERVER_URL, retry=True, wait=True)
sio.wait()
