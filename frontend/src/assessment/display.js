export const ASSESSMENT_TYPES = Object.freeze([
  Object.freeze({
    id: 'mood',
    instrument: 'PHQ-9',
    title: 'Mood & interest',
    displayTitle: 'Mood & interest check-in',
    description: 'A few questions about mood and interest over the past two weeks.',
    maxScore: 27,
    questionCount: 9,
    accent: 'sage',
  }),
])

const HISTORICAL_DISPLAY_TITLES = Object.freeze({
  'PHQ-9': 'Mood & interest check-in',
  'GAD-7': 'Past worry & tension check-in',
})

export function getAssessmentType(id) {
  return ASSESSMENT_TYPES.find(item => item.id === id) || null
}

export function getAssessmentDisplayTitle(instrument) {
  return HISTORICAL_DISPLAY_TITLES[instrument] || 'Check-in'
}

// Only instruments in ASSESSMENT_TYPES may be opened as a new public check-in.
export function getAssessmentIdFromInstrument(instrument) {
  return ASSESSMENT_TYPES.find(item => item.instrument === instrument)?.id || null
}
