import test from 'node:test'
import assert from 'node:assert/strict'
import {ASSESSMENT_TYPES,getAssessmentDisplayTitle,getAssessmentIdFromInstrument,getAssessmentType} from '../src/assessment/display.js'
test('public labels do not expose canonical instrument IDs',()=>{for(const item of ASSESSMENT_TYPES){assert.equal(item.displayTitle.includes(item.instrument),false);assert.doesNotMatch(item.title,/PHQ|GAD|WHO/i);assert.doesNotMatch(item.displayTitle,/PHQ|GAD|WHO/i)}})
test('canonical IDs map to friendly labels',()=>{assert.equal(getAssessmentDisplayTitle('PHQ-9'),'Mood & interest check-in');assert.equal(getAssessmentDisplayTitle('GAD-7'),'Worry & tension check-in');assert.equal(getAssessmentDisplayTitle('unknown'),'Check-in');assert.equal(getAssessmentIdFromInstrument('PHQ-9'),'mood');assert.equal(getAssessmentIdFromInstrument('GAD-7'),'worry');assert.equal(getAssessmentType('mood').instrument,'PHQ-9');assert.equal(getAssessmentType('worry').instrument,'GAD-7')})
