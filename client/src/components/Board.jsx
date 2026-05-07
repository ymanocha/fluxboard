import List from './List';
import AddList from './AddList';

const Board = ({ lists, cards, boardId }) => {
  const sortedLists = [...lists].sort((a, b) => a.position - b.position);

  return (
    <div className="board">
      {sortedLists.map((list) => {
        const listCards = cards
          .filter((c) => c.list === list._id)
          .sort((a, b) => a.position - b.position);

        return <List key={list._id} list={list} cards={listCards} boardId={boardId} />;
      })}
      <AddList boardId={boardId} />
    </div>
  );
};

export default Board;
