import type { Round, Side } from "./types";

const RoundDisplay = ({
  rounds,
  leftName,
  rightName,
  winningSide,
}: {
  rounds: Round[];
  leftName: string;
  rightName: string;
  winningSide: Side | null;
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-200 text-left bg-white shadow-md rounded-lg">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-4 py-2 border-b border-gray-200">Winner:</th>
            <th className={!!winningSide && winningSide === "LEFT" ? "bg-green-300 px-4 py-2 border-b border-gray-200" : "bg-red-300 px-4 py-2 border-b border-gray-200"}
            >{!!winningSide ? winningSide === "LEFT" ? "WINNER" : "LOSER" : ""}</th>
            <th className={!!winningSide && winningSide === "RIGHT" ? "bg-green-300 px-4 py-2 border-b border-gray-200" : "bg-red-300 px-4 py-2 border-b border-gray-200"}
            >{!!winningSide ? winningSide === "RIGHT" ? "WINNER" : "LOSER" : ""}</th>
          </tr>
          <tr>
            <th className="px-4 py-2 border-b border-gray-200">Round</th>
            <th className="px-4 py-2 border-b border-gray-200">{leftName}</th>
            <th className="px-4 py-2 border-b border-gray-200">{rightName}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{rounds.reduce((prev, curr) => curr.winner === "DRAW" ? prev + 1 : prev, 0)}</td>
            <td>{rounds.reduce((prev, curr) => curr.winner === "LEFT" ? prev + 1 : prev, 0)}</td>
            <td>{rounds.reduce((prev, curr) => curr.winner === "RIGHT" ? prev + 1 : prev, 0)}</td>
          </tr>
          {rounds.map((round, index) => (
            <tr
              key={index}
              className=""
            >
              <td className="px-4 py-2 border-b border-gray-200">{999 - index}</td>
              <td className={
                round.winner === "DRAW"
                ? "px-4 py-2 border-b border-gray-200 bg-gray-300"
                : round.winner === "LEFT" 
                ? "px-4 py-2 border-b border-gray-200 bg-green-300"
                : "px-4 py-2 border-b border-gray-200 bg-red-300"
              }>
                {round.left ?? "timeout"}
              </td>
              <td className={
                round.winner === "DRAW"
                ? "px-4 py-2 border-b border-gray-200 bg-gray-300"
                : round.winner === "LEFT" 
                ? "px-4 py-2 border-b border-gray-200 bg-red-300"
                : "px-4 py-2 border-b border-gray-200 bg-green-300"
              }>
                {round.right ?? "timeout"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RoundDisplay;
