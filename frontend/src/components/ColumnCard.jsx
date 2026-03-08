export function ColumnCard({ title, subtitle, children }) {
  return (
    <section className="column-card">
      <header className="column-header">
        <h2>{title}</h2>
        {subtitle ? <p className="column-subtitle">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
