export const StartMatchButton = ({onClick, isDisabled}: {onClick: () => void, isDisabled: boolean}) => (
  <button 
    className="px-8 py-4 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition duration-300"
    onClick={onClick} disabled={isDisabled}><h1>Start Match</h1></button>
)