import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const assessmentSource = readFileSync(resolve(here, '../src/components/Assessment.jsx'), 'utf8')
const assessmentCss = readFileSync(resolve(here, '../src/components/Assessment.css'), 'utf8')

test('assessment uses a single step indicator instead of a row of question jump buttons', () => {
  assert.match(assessmentSource, /assessment-progress-track/)
  assert.match(assessmentSource, /Question \{step \+ 1\} of \{questions\.length\}/)
  assert.doesNotMatch(assessmentSource, /questions\.map\(\(_, index\)/)
  assert.doesNotMatch(assessmentSource, /setTimeout\(\(\) => setStep/)
})

test('responses use native radios and preserve explicit continue navigation', () => {
  assert.match(assessmentSource, /type="radio"/)
  assert.match(assessmentSource, /assessment-nav-primary/)
  assert.match(assessmentSource, /Continue <ChevronRight/)
  assert.match(assessmentSource, /onClick=\{handleSubmit\}/)
})

test('result layout removes the severity strip but keeps separate safety follow-up and resources', () => {
  assert.doesNotMatch(assessmentSource, /Your response at a glance/)
  assert.match(assessmentSource, /assessment-result-summary/)
  assert.match(assessmentSource, /result\.crisis_flag/)
  assert.match(assessmentSource, /cannot determine whether you're safe/)
  assert.match(assessmentSource, /Tele-MANAS: 14416/)
  assert.match(assessmentSource, /Vandrevala Foundation: \+91 9999 666 555/)
})

test('the check-in hub avoids a duplicate hero and shows a short choice list', () => {
  assert.doesNotMatch(assessmentSource, /assessment-hero|assessment-trust-row/)
  assert.match(assessmentSource, /Choose a check-in/)
  assert.match(assessmentSource, /View result/)
  assert.match(assessmentSource, /Retake check-in/)
})

test('assessment occupies its own scroll area and reserves space above the workspace note', () => {
  assert.match(assessmentCss, /\.assessment-page\s*\{[^}]*flex:\s*1 1 0%/s)
  assert.match(assessmentCss, /\.assessment-page\s*\{[^}]*min-height:\s*0/s)
  assert.match(assessmentCss, /\.assessment-page\s*\{[^}]*overflow-y:\s*auto/s)
  assert.match(assessmentCss, /env\(safe-area-inset-bottom/)
})
