/**
 * Converts Weather Underground's mixed-unit observation into the fields the
 * dashboard displays. Most displayed values are imperial, but humidity is a
 * unitless value returned alongside the unit groups by Weather Underground.
 */
export function dashboardObservation(observation) {
  const imperial = observation.imperial ?? {};
  const humidity = firstPresent(
    observation.humidity,
    observation.relativeHumidity,
    imperial.humidity,
    observation.metric?.humidity,
  );

  return {
    ...imperial,
    humidity,
    obsTimeLocal: observation.obsTimeLocal,
    obsTimeUtc: observation.obsTimeUtc,
    solarRadiation: observation.solarRadiation,
    pressureTrend: observation.pressureTrend,
  };
}

function firstPresent(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '');
}
