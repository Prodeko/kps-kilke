import { io } from "socket.io-client";

const SERVER_URL = process.env.SERVER_URL!;

export const Moves = {
  ROCK: 0,
  PAPER: 1,
  SCISSORS: 2,
} as const;

const winningMoves = {
  ROCK: "PAPER",
  PAPER: "SCISSORS",
  SCISSORS: "ROCK",
};
const losingMoves = {
  ROCK: "SCISSORS",
  PAPER: "ROCK",
  SCISSORS: "PAPER",
};

const possibleMoves = Object.keys(Moves) as Move[];

export type Move = keyof typeof Moves;

type RoundResult = {
  you?: Move;
  opponent?: Move;
  result: "win" | "loss" | "draw";
};

function main() {
  console.log(`Trying to connect to ${SERVER_URL}`);
  const socket = io(SERVER_URL, { autoConnect: true });
  socket.connect();

  let roundIndex = 0;
  const previousRounds: RoundResult[] = [];

  /******************************************/
  /*              CHANGE THIS               */
  const BOT_NAME = "fuksibotti";
  /******************************************/

  socket.on("connect", () => {
    console.log("Connected to server");
    socket.emit("bot", BOT_NAME);
  });

  socket.on("round", (previousRound: RoundResult | undefined) => {
    console.log(previousRound);
    if (previousRound) previousRounds.push(previousRound);

    /******************************************/
    /*              CODE HERE                 */
    let move = "ROCK";
    if (previousRound) {
      const prev = previousRounds.slice(-3);
      if (
        prev.length === 3 &&
        prev[0].opponent === prev[1].opponent &&
        prev[1].opponent === prev[2].opponent
      ) {
        move = winningMoves[prev[0].opponent!];
      } else {
        move = losingMoves[previousRound.opponent!];
        //   const newPossibleMoves = possibleMoves.filter(
        //     (move) => move !== previousRound?.opponent
        //   );

        //   move = newPossibleMoves[roundIndex % newPossibleMoves.length];
        // }
      }
    }
    /*              STOP HERE                 */
    /******************************************/

    socket.emit("move", move);
    roundIndex++;
  });
}

main();
