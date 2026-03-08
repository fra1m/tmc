import { useMemo, useState } from "react";

function validateId(input) {
  const trimmedValue = input.trim();

  if (!trimmedValue) {
    return "Введите ID.";
  }

  return null;
}

export function AddItemForm({ isSubmitting, onAdd }) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState(null);

  const validationError = useMemo(() => validateId(value), [value]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    try {
      setLocalError(null);
      await onAdd(value.trim());
      setValue("");
    } catch {
      // Серверная ошибка показывается родительским компонентом.
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <label className="field-group">
        <span className="field-label">Добавить новый ID (любая строка)</span>
        <div className="add-form-row">
          <input
            className="field-input"
            type="text"
            placeholder="Например, custom-id-001"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setLocalError(null);
            }}
          />
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Добавление..." : "Добавить"}
          </button>
        </div>
      </label>
      {localError ? <p className="inline-error">{localError}</p> : null}
    </form>
  );
}
