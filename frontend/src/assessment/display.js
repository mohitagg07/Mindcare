export const ASSESSMENT_TYPES = Object.freeze([
 Object.freeze({id:'mood',instrument:'PHQ-9',title:'Mood & interest',displayTitle:'Mood & interest check-in',description:'A few questions about mood and interest over the past two weeks.',maxScore:27,questionCount:9,accent:'sage'}),
 Object.freeze({id:'worry',instrument:'GAD-7',title:'Worry & tension',displayTitle:'Worry & tension check-in',description:'A few questions about worry and tension over the past two weeks.',maxScore:21,questionCount:7,accent:'lilac'}),
])
export function getAssessmentType(id){return ASSESSMENT_TYPES.find(item=>item.id===id)||null}
export function getAssessmentDisplayTitle(instrument){return ASSESSMENT_TYPES.find(item=>item.instrument===instrument)?.displayTitle||'Check-in'}
export function getAssessmentIdFromInstrument(instrument){return ASSESSMENT_TYPES.find(item=>item.instrument===instrument)?.id||null}
