import test from 'node:test'
import assert from 'node:assert/strict'
import { ASSESSMENT_TYPES, getAssessmentDisplayTitle, getAssessmentIdFromInstrument, getAssessmentType } from '../src/assessment/display.js'

test('the public structured assessment catalogue contains PHQ-9 only', () => {
  assert.deepEqual(ASSESSMENT_TYPES.map(item => item.instrument), ['PHQ-9'])
  for (const item of ASSESSMENT_TYPES) {
    assert.equal(item.displayTitle.includes(item.instrument), false)
    assert.doesNotMatch(item.title, /PHQ|GAD|WHO/i)
    assert.doesNotMatch(item.displayTitle, /PHQ|GAD|WHO/i)
  }
  assert.equal(getAssessmentType('mood').instrument, 'PHQ-9')
  assert.equal(getAssessmentType('worry'), null)
})

test('legacy GAD-7 results can be labelled for history but cannot open a new public check-in', () => {
  assert.equal(getAssessmentDisplayTitle('PHQ-9'), 'Mood & interest check-in')
  assert.equal(getAssessmentDisplayTitle('GAD-7'), 'Past worry & tension check-in')
  assert.equal(getAssessmentDisplayTitle('unknown'), 'Check-in')
  assert.equal(getAssessmentIdFromInstrument('PHQ-9'), 'mood')
  assert.equal(getAssessmentIdFromInstrument('GAD-7'), null)
})
