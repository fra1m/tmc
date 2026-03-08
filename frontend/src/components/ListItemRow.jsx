export function ListItemRow({ item, actionLabel, actionDisabled, onAction }) {
  return (
    <li className="item-row">
      <div className="item-id">ID: {item.id}</div>

      <button
        className="secondary-button"
        type="button"
        disabled={actionDisabled}
        onClick={() => onAction(item.id)}
      >
        {actionLabel}
      </button>
    </li>
  );
}
