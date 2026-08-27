function normalizeMode(mode = '') {
  return String(mode || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getLineModeText(line) {
  return [line.commercialMode, line.physicalMode, line.label, line.code]
    .filter(Boolean)
    .join(' ');
}

function getDisruptionSeverityRank(disruption) {
  const severityText = normalizeMode(
    [
      disruption?.severity,
      disruption?.severity?.name,
      disruption?.severity?.effect,
      disruption?.status,
      disruption?.type,
      disruption?.category,
      disruption?.cause,
      disruption?.title,
      disruption?.message,
    ]
      .filter(Boolean)
      .join(' ')
  );

  if (
    severityText.includes('interrupt') ||
    severityText.includes('ferme') ||
    severityText.includes('closed') ||
    severityText.includes('suspend') ||
    severityText.includes('no_service') ||
    severityText.includes('blocked')
  ) {
    return 0;
  }

  return 1;
}

function getDisruptionModeRank(line, disruption) {
  const modeText = normalizeMode(
    [
      line?.commercialMode,
      line?.physicalMode,
      line?.label,
      line?.code,
      disruption?.commercialMode,
      disruption?.mode,
      disruption?.network,
      disruption?.line,
      disruption?.title,
      disruption?.message,
    ]
      .filter(Boolean)
      .join(' ')
  );
  const lineCode = String(line?.code || disruption?.line?.code || '').trim();

  if (modeText.includes('bus')) {
    return null;
  }

  if (modeText.includes('metro') || /^\d{1,2}$/.test(lineCode)) {
    return 0;
  }

  if (modeText.includes('rer')) {
    return 1;
  }

  if (
    modeText.includes('rapid') ||
    modeText.includes('train') ||
    /^[A-E]$/i.test(lineCode)
  ) {
    return 2;
  }

  if (modeText.includes('tram') || /^T\d*/i.test(lineCode)) {
    return 3;
  }

  return null;
}

function getDisruptionTitle(disruption) {
  return (
    disruption?.title ||
    disruption?.message ||
    disruption?.messages?.[0]?.text ||
    disruption?.severity?.name ||
    'Perturbation en cours'
  );
}

export function getDisruptionLineLabel(disruption) {
  const line = disruption.line || {};

  return (
    line.code ||
    line.label ||
    disruption.lineCode ||
    disruption.lineLabel ||
    disruption.line ||
    'Ligne'
  );
}

function getDisruptionLineType(line = {}) {
  const modeText = normalizeMode(getLineModeText(line));
  const code = String(line.code || line.label || '').trim();

  if (modeText.includes('metro') || /^\d{1,2}$/.test(code)) {
    return 'Métro';
  }

  if (modeText.includes('rer') || /^[A-E]$/i.test(code)) {
    return 'RER';
  }

  if (modeText.includes('tram') || /^T\d*/i.test(code)) {
    return 'Tram';
  }

  if (modeText.includes('train') || modeText.includes('rapid')) {
    return 'Transilien';
  }

  return 'Ligne';
}

export function getDisruptionLineTitle(disruption) {
  const line = disruption.line || {};
  const type = getDisruptionLineType(line);
  const label = getDisruptionLineLabel(disruption);
  const titleLabel =
    type === 'Tram' && /^T\d/i.test(label) ? label.replace(/^T/i, '') : label;

  return `${type} ${titleLabel}`;
}

function getDisruptionLineKey(disruption) {
  const line = disruption.line || {};

  return (
    line.id ||
    line.code ||
    line.label ||
    getDisruptionLineLabel(disruption)
  );
}

function normalizeDisruption(disruption, line) {
  if (!disruption) {
    return null;
  }

  const normalizedLine = disruption.line || line || {};
  const modeRank = getDisruptionModeRank(normalizedLine, disruption);

  if (modeRank === null) {
    return null;
  }

  return {
    ...disruption,
    line: normalizedLine,
    modeRank,
    severityRank: getDisruptionSeverityRank(disruption),
    title: getDisruptionTitle(disruption),
    count: disruption.count || disruption.disruptions?.length || 1,
    disruptions: disruption.disruptions || [disruption],
  };
}

function collectDisruptionsFromItem(item, fallbackLine = null) {
  const disruptions = [
    ...(Array.isArray(item?.disruptions) ? item.disruptions : []),
    ...(Array.isArray(item?.trafficReports) ? item.trafficReports : []),
    ...(Array.isArray(item?.traffic_reports) ? item.traffic_reports : []),
  ];

  return disruptions
    .map((disruption) => normalizeDisruption(disruption, fallbackLine))
    .filter(Boolean);
}

export function getSortedRouteDisruptions(journeys, routeDisruptions = []) {
  const disruptions = [
    ...routeDisruptions
      .map((disruption) => normalizeDisruption(disruption, disruption.line))
      .filter(Boolean),
    ...journeys.flatMap((journey) => [
      ...collectDisruptionsFromItem(journey),
      ...(journey.sections || []).flatMap((section) => [
        ...collectDisruptionsFromItem(section, section.line),
        ...collectDisruptionsFromItem(section.line, section.line),
      ]),
    ]),
  ];
  const disruptionsByLine = new Map();

  disruptions.forEach((disruption) => {
    const lineKey = getDisruptionLineKey(disruption);
    const currentGroup = disruptionsByLine.get(lineKey);

    if (!currentGroup) {
      disruptionsByLine.set(lineKey, disruption);
      return;
    }

    const nextDisruptions = [
      ...currentGroup.disruptions,
      ...disruption.disruptions,
    ].filter(
      (currentDisruption, index, allDisruptions) =>
        allDisruptions.findIndex(
          (candidate) =>
            candidate.id === currentDisruption.id ||
            candidate.message === currentDisruption.message ||
            candidate.title === currentDisruption.title
        ) === index
    );

    disruptionsByLine.set(lineKey, {
      ...(disruption.severityRank < currentGroup.severityRank
        ? disruption
        : currentGroup),
      count: nextDisruptions.length,
      disruptions: nextDisruptions,
      severityRank: Math.min(currentGroup.severityRank, disruption.severityRank),
    });
  });

  return [...disruptionsByLine.values()].sort((first, second) => {
    const severityDelta = first.severityRank - second.severityRank;

    if (severityDelta !== 0) {
      return severityDelta;
    }

    const modeDelta = first.modeRank - second.modeRank;

    if (modeDelta !== 0) {
      return modeDelta;
    }

    return getDisruptionLineLabel(first).localeCompare(
      getDisruptionLineLabel(second),
      'fr',
      { numeric: true }
    );
  });
}

export function getDisruptionGroups(disruptions) {
  return {
    interruptions: disruptions.filter(
      (disruption) => disruption.severityRank === 0
    ),
    perturbations: disruptions.filter(
      (disruption) => disruption.severityRank !== 0
    ),
  };
}

export function formatDisruptionGroupTitle(count, singular, plural) {
  return `${count} ${count > 1 ? plural : singular}`;
}

export function getDisruptionMessages(disruption) {
  const details = disruption.disruptions?.length
    ? disruption.disruptions
    : [disruption];

  return details
    .map((detail) => detail.message || detail.title || disruption.title)
    .filter(Boolean)
    .filter((message, index, messages) => messages.indexOf(message) === index);
}
