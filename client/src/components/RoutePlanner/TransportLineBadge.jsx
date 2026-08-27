function normalizeMode(mode = '') {
  return String(mode || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function TransportLineBadge({ line = {} }) {
  const lineMode = normalizeMode(line.commercialMode || line.physicalMode);
  const style = {
    '--route-line-color': line.color || 'var(--color-secondary)',
    '--route-line-text': line.textColor || 'var(--color-on-primary)',
  };
  const label = line.code || line.label || line.commercialMode;

  return (
    <span
      className="route-line-badge"
      data-mode={lineMode}
      data-transport="true"
      style={style}
      title={line.label || label}
    >
      <span>{label}</span>
    </span>
  );
}
