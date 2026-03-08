export function SearchInput({ value, placeholder, onChange }) {
  return (
    <label className="field-group">
      <span className="field-label">Поиск по ID</span>
      <input
        className="field-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
