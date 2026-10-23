import { useEffect, useMemo, useRef, useState } from 'react'
import {
  UserRound, Mail, AtSign, Clock3, Heart, Sparkles, Check, LoaderCircle,
  ShieldCheck, Palette, BookOpen, Compass, Sun, MessageCircle, CheckCircle2,
  Save, RefreshCw, Info, Camera, Trash2, CalendarDays, Pencil, X,
} from 'lucide-react'
import {
  getMyProfile, updateMyProfile, uploadMyAvatar, deleteMyAvatar, deleteMyAccount,
  getChatMemories, createChatMemory, updateChatMemory, deleteChatMemory, deleteAllChatMemories,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import './ProfileMemory.css'

const SUPPORT_STYLES = [
  { id: 'gentle', title: 'Gentle & reassuring', description: 'A little warmth first, with calm guidance when you want it.', icon: Heart },
  { id: 'practical', title: 'Practical & focused', description: 'Clear language and one manageable next step at a time.', icon: Compass },
  { id: 'reflective', title: 'Thoughtful & reflective', description: 'Space to explore what you feel and what matters to you.', icon: BookOpen },
]

const FOCUS_AREAS = [
  { id: 'stress', title: 'Everyday stress', detail: 'Finding room to pause' },
  { id: 'sleep', title: 'Rest & sleep', detail: 'Building a calmer routine' },
  { id: 'confidence', title: 'Confidence', detail: 'Being kinder to yourself' },
  { id: 'relationships', title: 'Relationships', detail: 'Navigating connection' },
  { id: 'focus', title: 'Focus & balance', detail: 'Making space for what matters' },
  { id: 'self_compassion', title: 'Self-compassion', detail: 'Less self-criticism' },
  { id: 'emotional_balance', title: 'Emotional balance', detail: 'Understanding your feelings' },
  { id: 'other', title: 'Something else', detail: 'A focus that is personal to you' },
]

const COMMON_TIMEZONES = [
  ['Asia/Kolkata', 'India Standard Time · Kolkata'],
  ['Asia/Dubai', 'Gulf Standard Time · Dubai'],
  ['Europe/London', 'United Kingdom · London'],
  ['Europe/Paris', 'Central European Time · Paris'],
  ['America/New_York', 'Eastern Time · New York'],
  ['America/Los_Angeles', 'Pacific Time · Los Angeles'],
  ['UTC', 'Coordinated Universal Time · UTC'],
]
const TIMEZONES = typeof Intl.supportedValuesOf === 'function'
  ? ['UTC', ...Intl.supportedValuesOf('timeZone')].filter((value, index, list) => list.indexOf(value) === index).sort((a, b) => a === 'UTC' ? -1 : b === 'UTC' ? 1 : a.localeCompare(b))
  : COMMON_TIMEZONES.map(([value]) => value)

const TONES = [
  { id: 'sage', label: 'Sage', color: '#8db9a0', ink: '#244a3b' },
  { id: 'ocean', label: 'Ocean', color: '#90b8ce', ink: '#224a62' },
  { id: 'lavender', label: 'Lavender', color: '#b9a8d8', ink: '#4c3d69' },
  { id: 'sunrise', label: 'Sunrise', color: '#e4b38d', ink: '#6a432b' },
]

function initialForm(user) {
  return {
    username: user?.username || '',
    display_name: user?.display_name || '',
    pronouns: user?.pronouns || '',
    date_of_birth: user?.date_of_birth || '',
    avatar_url: user?.avatar_url || null,
    age: user?.age ?? null,
    timezone: user?.timezone || 'Asia/Kolkata',
    support_style: user?.support_style || 'gentle',
    focus_areas: Array.isArray(user?.focus_areas) ? user.focus_areas : [],
    avatar_tone: user?.avatar_tone || 'sage',
  }
}

function initialsFor(value) {
  const words = String(value || 'You').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(word => word[0]?.toUpperCase() || '').join('') || 'Y'
}

function localTodayIso() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function ageFromDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  const [year, month, day] = value.split('-').map(Number)
  const birth = new Date(year, month - 1, day)
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null
  const today = new Date()
  let age = today.getFullYear() - year
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age -= 1
  return age >= 0 && age <= 125 ? age : null
}

export default function Profile() {
  const { user, syncProfile, logout } = useAuth()
  const [form, setForm] = useState(() => initialForm(user))
  const [loading, setLoading] = useState(true)
  const [loadRetry, setLoadRetry] = useState(0)
  const [profileLoadError, setProfileLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [memorySaving, setMemorySaving] = useState(false)
  const [memoryError, setMemoryError] = useState('')
  const [memoryStatus, setMemoryStatus] = useState('')
  const [memories, setMemories] = useState([])
  const [memoriesLoading, setMemoriesLoading] = useState(true)
  const [memoryDraft, setMemoryDraft] = useState('')
  const [editingMemoryId, setEditingMemoryId] = useState('')
  const [memoryManagerBusy, setMemoryManagerBusy] = useState(false)
  const [memoryManagerError, setMemoryManagerError] = useState('')
  const [memoryManagerStatus, setMemoryManagerStatus] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [accountDeletionAvailable, setAccountDeletionAvailable] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setProfileLoadError('')
    getMyProfile()
      .then(({ data }) => {
        if (!active) return
        setForm(initialForm({ ...user, ...data }))
        setMemoryEnabled(data?.memory_enabled === true)
        setMemoryError('')
        setMemoryStatus('')
        setAccountDeletionAvailable(Boolean(data?.account_deletion_enabled))
        syncProfile?.(data)
      })
      .catch((err) => { if (active) setProfileLoadError(err.message || 'Your profile could not be loaded right now.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // Reload only when the signed-in identity changes or the user retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRetry, user?.id])

  useEffect(() => {
    let active = true
    setMemoriesLoading(true)
    setMemoryManagerError('')
    getChatMemories()
      .then(({ data }) => {
        if (!active) return
        setMemories(Array.isArray(data?.memories) ? data.memories : [])
      })
      .catch((err) => {
        if (active) setMemoryManagerError(err.message || 'Your saved notes could not be loaded. Refresh and try again.')
      })
      .finally(() => { if (active) setMemoriesLoading(false) })
    return () => { active = false }
    // Reload only when the signed-in identity changes or the user retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRetry, user?.id])

  const displayLabel = form.display_name.trim() || user?.username || 'Your profile'
  const completeness = useMemo(() => {
    const checks = [Boolean(form.display_name.trim()), Boolean(form.timezone), Boolean(form.support_style), form.focus_areas.length > 0]
    return Math.round(checks.filter(Boolean).length / checks.length * 100)
  }, [form])
  const avatarTone = TONES.find(tone => tone.id === form.avatar_tone) || TONES[0]
  const timezoneOptions = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]

  const setField = (key, value) => {
    setForm(current => ({ ...current, [key]: value }))
    setSuccess('')
    setError('')
  }

  const toggleFocus = (id) => {
    setForm(current => {
      const selected = current.focus_areas.includes(id)
      if (!selected && current.focus_areas.length >= 6) return current
      return { ...current, focus_areas: selected ? current.focus_areas.filter(item => item !== id) : [...current.focus_areas, id] }
    })
    setSuccess('')
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const preferredName = form.display_name.trim().replace(/\s+/g, ' ')
    if (!preferredName || !/[\p{L}\p{N}]/u.test(preferredName)) {
      setError('A preferred name is required. Enter a name or nickname before saving your profile.')
      return
    }
    const username = form.username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setError('Choose a username with 3–30 letters, numbers, or underscores.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        username,
        display_name: preferredName,
        pronouns: form.pronouns.trim() || null,
        date_of_birth: form.date_of_birth || null,
        timezone: form.timezone,
        support_style: form.support_style,
        focus_areas: form.focus_areas,
        avatar_tone: form.avatar_tone,
      }
      const { data } = await updateMyProfile(payload)
      const saved = { ...form, ...data }
      setForm(initialForm(saved))
      syncProfile?.(data)
      setSuccess('Your profile is saved. MindCare will use these preferences in future conversations.')
    } catch (err) {
      setError(err.message || 'Your changes could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const saveMemoryPreference = async (event) => {
    const requested = event.currentTarget.checked
    setMemorySaving(true)
    setMemoryError('')
    setMemoryStatus('')
    try {
      const { data } = await updateMyProfile({ memory_enabled: requested })
      if (data?.memory_enabled !== requested) {
        throw new Error('MindCare could not verify the saved-memory setting. Reload your profile and try again.')
      }
      setMemoryEnabled(data.memory_enabled)
      setMemoryStatus(requested
        ? 'Saved memories are enabled for future replies.'
        : 'Saved memories are disabled for future replies. Your notes have not been deleted.')
      syncProfile?.(data)
    } catch (err) {
      setMemoryError(err.message || 'The saved-memory setting could not be updated. Your previous setting remains active.')
      // A network failure can happen after the server committed the preference. Re-read
      // the source of truth so the switch does not knowingly display a stale value.
      try {
        const { data } = await getMyProfile()
        setMemoryEnabled(data?.memory_enabled === true)
      } catch {
        // Keep the current state and leave the recoverable error visible.
      }
    } finally {
      setMemorySaving(false)
    }
  }

  const startMemoryEdit = (memory) => {
    setEditingMemoryId(memory.id)
    setMemoryDraft(memory.content)
    setMemoryManagerError('')
    setMemoryManagerStatus('')
  }

  const cancelMemoryEdit = () => {
    setEditingMemoryId('')
    setMemoryDraft('')
    setMemoryManagerError('')
    setMemoryManagerStatus('')
  }

  const saveMemoryNote = async () => {
    const content = memoryDraft.trim().replace(/\s+/g, ' ')
    if (content.length < 2 || !/[\p{L}\p{N}]/u.test(content)) {
      setMemoryManagerError('Write a short note with at least one letter or number.')
      return
    }
    if (!editingMemoryId && memories.length >= 20) {
      setMemoryManagerError('You can keep up to 20 saved notes. Delete one before adding another.')
      return
    }
    setMemoryManagerBusy(true)
    setMemoryManagerError('')
    setMemoryManagerStatus('')
    try {
      const { data } = editingMemoryId
        ? await updateChatMemory(editingMemoryId, content)
        : await createChatMemory(content)
      const saved = data?.memory
      if (!saved?.id || typeof saved.content !== 'string') {
        throw new Error('MindCare could not verify that your note was saved. Reload the page to check its status.')
      }
      if (editingMemoryId) {
        setMemories(current => current.map(item => item.id === editingMemoryId ? saved : item))
        setMemoryManagerStatus('Saved note updated. Future replies will use it only while saved memory is enabled.')
      } else {
        setMemories(current => [saved, ...current.filter(item => item.id !== saved.id)].slice(0, 20))
        setMemoryManagerStatus('Saved note added. Future replies will use it only while saved memory is enabled.')
      }
      setMemoryDraft('')
      setEditingMemoryId('')
    } catch (err) {
      setMemoryManagerError(err.message || 'Your note could not be saved. Your previous note is unchanged.')
    } finally {
      setMemoryManagerBusy(false)
    }
  }

  const removeMemoryNote = async (memoryId) => {
    if (memoryManagerBusy) return
    if (!window.confirm('Delete this saved note? It will no longer be available to future replies.')) return
    setMemoryManagerBusy(true)
    setMemoryManagerError('')
    setMemoryManagerStatus('')
    try {
      await deleteChatMemory(memoryId)
      setMemories(current => current.filter(item => item.id !== memoryId))
      if (editingMemoryId === memoryId) {
        setEditingMemoryId('')
        setMemoryDraft('')
      }
      setMemoryManagerStatus('Saved note deleted.')
    } catch (err) {
      setMemoryManagerError(err.message || 'The note could not be deleted. It is still shown here until deletion is confirmed.')
    } finally {
      setMemoryManagerBusy(false)
    }
  }

  const removeAllMemoryNotes = async () => {
    if (memoryManagerBusy || memories.length === 0) return
    if (!window.confirm('Delete all saved memory notes? This cannot be undone. Your conversation history will not be deleted.')) return
    setMemoryManagerBusy(true)
    setMemoryManagerError('')
    setMemoryManagerStatus('')
    try {
      await deleteAllChatMemories()
      setMemories([])
      setEditingMemoryId('')
      setMemoryDraft('')
      setMemoryManagerStatus('All saved memory notes have been deleted.')
    } catch (err) {
      setMemoryManagerError(err.message || 'Your saved notes could not be deleted. They remain listed here.')
    } finally {
      setMemoryManagerBusy(false)
    }
  }

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    setError('')
    setSuccess('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP photo.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose a photo smaller than 5 MB.')
      return
    }
    setAvatarBusy(true)
    try {
      const { data } = await uploadMyAvatar(file)
      setForm(current => ({ ...current, avatar_url: data.avatar_url || null }))
      syncProfile?.({ avatar_url: data.avatar_url || null, avatar_path: data.avatar_path || null })
      setSuccess('Your profile photo is saved privately.')
    } catch (err) {
      setError(err.message || 'Your photo could not be uploaded. Check that the avatar storage migration has been run.')
    } finally {
      setAvatarBusy(false)
    }
  }

  const removeAvatar = async () => {
    setError('')
    setSuccess('')
    setAvatarBusy(true)
    try {
      const { data } = await deleteMyAvatar()
      setForm(current => ({ ...current, avatar_url: null }))
      syncProfile?.({ avatar_url: null, avatar_path: null })
      setSuccess(data.message || 'Your profile photo was removed.')
    } catch (err) {
      setError(err.message || 'Your photo could not be removed. Please try again.')
    } finally {
      setAvatarBusy(false)
    }
  }

  const reset = () => { setForm(initialForm(user)); setError(''); setSuccess('') }

  const deleteAccount = async (event) => {
    event?.preventDefault()
    if (deleteText !== 'DELETE') return
    setError('')
    setDeleting(true)
    try {
      await deleteMyAccount()
      await logout()
    } catch (err) {
      setError(err.message || 'Your account could not be deleted. Please try again.')
      setDeleteOpen(false)
      setDeleteText('')
    } finally {
      setDeleting(false)
    }
  }

  if (loading || profileLoadError) {
    return (
      <div className="profile-page">
        <div className="profile-content">
          <header className="profile-heading-row">
            <div>
              <div className="profile-eyebrow"><Sparkles size={13} /> YOUR PERSONAL SPACE</div>
              <h1>Make it <em>yours.</em></h1>
              <p>A few choices help MindCare feel more personal. Everything here is optional.</p>
            </div>
          </header>
          {loading ? (
            <div className="profile-load-state" role="status" aria-live="polite"><LoaderCircle size={19} className="profile-spinning" /> Loading your saved preferences…</div>
          ) : (
            <div className="profile-load-error" role="alert">
              <Info size={18} />
              <div><strong>Your saved profile is unavailable.</strong><p>{profileLoadError} Your existing details are protected; retry before making changes.</p></div>
              <button type="button" onClick={() => setLoadRetry(value => value + 1)}><RefreshCw size={14} /> Try again</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="profile-content">
        <header className="profile-heading-row">
          <div>
            <div className="profile-eyebrow"><Sparkles size={13} /> YOUR PERSONAL SPACE</div>
            <h1>Make it <em>yours.</em></h1>
            <p>A few choices help MindCare feel more personal. Everything here is optional.</p>
          </div>
          <div className="profile-completion-card">
            <div className="profile-completion-top"><span>PROFILE SETUP</span><strong>{completeness}%</strong></div>
            <div className="profile-completion-track"><span style={{ width: `${completeness}%` }} /></div>
            <small>Personalisation is optional.</small>
          </div>
        </header>

        {error && <div className="profile-alert is-error" role="alert"><Info size={17} /><span>{error}</span></div>}
        {success && <div className="profile-alert is-success" role="status"><CheckCircle2 size={17} /><span>{success}</span></div>}

        <form onSubmit={save} className="profile-form" noValidate>
          <section className="profile-identity-card">
            <div className="profile-avatar-column">
              <div className={`profile-avatar profile-avatar-${avatarTone.id}${form.avatar_url ? ' has-photo' : ''}`} style={{ '--profile-avatar-bg': avatarTone.color, '--profile-avatar-ink': avatarTone.ink }}>
                {form.avatar_url ? <img src={form.avatar_url} alt={`${displayLabel}'s profile`} /> : <span>{initialsFor(displayLabel)}</span>}
                <i aria-hidden="true"><Heart size={13} fill="currentColor" /></i>
              </div>
              <input ref={fileInputRef} className="profile-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} aria-label="Choose a JPG, PNG, or WebP profile photo" />
              <button type="button" className="profile-photo-button" onClick={() => fileInputRef.current?.click()} disabled={avatarBusy}>
                {avatarBusy ? <LoaderCircle size={14} className="profile-spinning" /> : <Camera size={14} />}{form.avatar_url ? 'Change photo' : 'Add photo'}
              </button>
              {form.avatar_url && <button type="button" className="profile-photo-remove" onClick={removeAvatar} disabled={avatarBusy}><Trash2 size={12} /> Remove</button>}
            </div>
            <div className="profile-identity-copy">
              <span className="profile-section-kicker">YOUR PROFILE</span>
              <h2>{displayLabel}</h2>
              <p>{user?.email || 'Signed in account'} <span className="profile-verified-dot" /> Account connected</p>
              <div className="profile-avatar-options" aria-label="Profile accent color">
                {TONES.map(tone => (
                  <button key={tone.id} type="button" className={`profile-tone-swatch${form.avatar_tone === tone.id ? ' is-selected' : ''}`} style={{ '--tone-color': tone.color }} onClick={() => setField('avatar_tone', tone.id)} aria-label={`Use ${tone.label} profile color`} aria-pressed={form.avatar_tone === tone.id} title={tone.label} />
                ))}
                <span><Palette size={12} /> Pick your color</span>
              </div>
            </div>
            <div className="profile-identity-side"><ShieldCheck size={16} /><span>Your profile is private to your account.</span></div>
          </section>

          <div className="profile-main-grid">
            <section className="profile-panel">
              <div className="profile-panel-heading"><span className="profile-panel-icon"><UserRound size={17} /></span><div><h3>The basics</h3><p>Only what you choose to share.</p></div></div>
              <div className="profile-fields-grid">
                <label className="profile-field profile-field-span"><span>What should we call you?</span><input value={form.display_name} maxLength={60} required aria-required="true" onChange={e => setField('display_name', e.target.value)} placeholder="Your preferred name" autoComplete="nickname" /><small>Required. A first name or nickname is fine.</small></label>
                <label className="profile-field"><span>Username</span><div className="profile-input-with-icon"><AtSign size={15} /><input value={form.username} minLength={3} maxLength={30} pattern="[A-Za-z0-9_]{3,30}" onChange={e => setField('username', e.target.value)} autoComplete="username" aria-describedby="profile-username-help" /></div><small id="profile-username-help">3–30 letters, numbers, or underscores. Your handle is unique.</small></label>
                <label className="profile-field"><span>Account email</span><div className="profile-input-with-icon"><Mail size={15} /><input value={user?.email || ''} readOnly aria-readonly="true" /></div><small>Managed by Supabase Auth.</small></label>
                <label className="profile-field profile-field-span"><span>Pronouns <em>· optional</em></span><input value={form.pronouns} maxLength={40} onChange={e => setField('pronouns', e.target.value)} placeholder="e.g. she/her, he/him, they/them" autoComplete="off" /><small>Leave this blank if you'd rather not share it.</small></label>
                <label className="profile-field profile-field-span"><span><CalendarDays size={14} /> Date of birth <em>· optional</em></span><input type="date" value={form.date_of_birth} max={localTodayIso()} min="1900-01-01" onChange={e => setField('date_of_birth', e.target.value)} autoComplete="bday" /><small>{form.date_of_birth ? `Age calculated automatically: ${ageFromDate(form.date_of_birth) ?? '—'} years. Only age is shared with AI; your date of birth is not.` : 'Used only to calculate your age. The date itself is not shared with the AI.'}</small></label>
                <label className="profile-field profile-field-span"><span><Clock3 size={14} /> Time zone</span><select value={form.timezone} onChange={e => setField('timezone', e.target.value)}>{timezoneOptions.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select><small>Used to display times for your saved activity.</small></label>
              </div>
            </section>

            <section className="profile-panel profile-personalisation-panel">
              <div className="profile-panel-heading"><span className="profile-panel-icon"><MessageCircle size={17} /></span><div><h3>How should support feel?</h3><p>Choose a response style.</p></div></div>
              <div className="profile-support-options">
                {SUPPORT_STYLES.map(({ id, title, description, icon: Icon }) => (
                  <button type="button" key={id} className={`profile-support-option${form.support_style === id ? ' is-selected' : ''}`} onClick={() => setField('support_style', id)} aria-pressed={form.support_style === id}>
                    <span className="profile-support-icon"><Icon size={17} /></span>
                    <span className="profile-support-copy"><strong>{title}</strong><small>{description}</small></span>
                    <span className="profile-select-indicator">{form.support_style === id && <Check size={12} />}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="profile-panel profile-focus-panel">
            <div className="profile-panel-heading profile-focus-heading"><span className="profile-panel-icon"><Sun size={17} /></span><div><h3>Your focus areas</h3><p>Pick a few. Change them anytime.</p></div><span className="profile-selected-count">{form.focus_areas.length} selected</span></div>
            <div className="profile-focus-grid">
              {FOCUS_AREAS.map(({ id, title, detail }) => {
                const selected = form.focus_areas.includes(id)
                return <button type="button" key={id} className={`profile-focus-chip${selected ? ' is-selected' : ''}`} onClick={() => toggleFocus(id)} aria-pressed={selected}>
                  <span className="profile-focus-check">{selected ? <Check size={12} /> : <span />}</span><span><strong>{title}</strong><small>{detail}</small></span>
                </button>
              })}
            </div>
            <p className="profile-focus-footnote"><Info size={13} /> Select up to 6. MindCare will use your choices only to tailor responses when relevant.</p>
          </section>

          <section className="profile-panel profile-memory-panel" aria-labelledby="profile-memory-heading">
            <div className="profile-panel-heading">
              <span className="profile-panel-icon"><BookOpen size={17} /></span>
              <div><h3 id="profile-memory-heading">Saved memory</h3><p>You're in control of whether saved notes can be used in replies.</p></div>
            </div>
            <div className="profile-memory-row">
              <div className="profile-memory-copy">
                <strong>Use saved memories in replies</strong>
                <p id="profile-memory-description">When enabled, saved notes may be included in the AI context for future replies. Turning this off stops their use; it does not delete the notes.</p>
              </div>
              <label className="profile-memory-switch">
                <input type="checkbox" checked={memoryEnabled} disabled={memorySaving} onChange={saveMemoryPreference} aria-label="Use saved memories in replies" aria-describedby="profile-memory-description" />
                <span className="profile-memory-switch-track" aria-hidden="true"><span className="profile-memory-switch-knob" /></span>
              </label>
            </div>
            {memorySaving && <p className="profile-memory-status" role="status">Saving memory preference…</p>}
            {memoryError && <p className="profile-memory-error" role="alert">{memoryError}</p>}
            {memoryStatus && <p className="profile-memory-status" role="status">{memoryStatus}</p>}

            <div className="profile-memory-manager" aria-labelledby="profile-memory-notes-heading">
              <div className="profile-memory-manager-heading">
                <div>
                  <h4 id="profile-memory-notes-heading">Your saved notes</h4>
                  <p>Review, change, or remove every note MindCare may use across conversations.</p>
                </div>
                <span className="profile-memory-count">{memories.length}/20</span>
              </div>

              <div className="profile-memory-editor">
                <label htmlFor="profile-memory-draft">{editingMemoryId ? 'Edit saved note' : 'Add a saved note'}</label>
                <textarea
                  id="profile-memory-draft"
                  value={memoryDraft}
                  maxLength={240}
                  rows={3}
                  disabled={memoryManagerBusy}
                  onChange={event => { setMemoryDraft(event.target.value); setMemoryManagerError(''); setMemoryManagerStatus('') }}
                  placeholder="For example: I prefer short, practical replies when I feel overwhelmed."
                  aria-describedby="profile-memory-editor-help"
                />
                <div className="profile-memory-editor-actions">
                  <button
                    type="button"
                    className="profile-memory-action profile-memory-action-primary"
                    onClick={saveMemoryNote}
                    disabled={memoryManagerBusy || !memoryDraft.trim() || (!editingMemoryId && memories.length >= 20)}
                  >
                    <Save size={13} /> {memoryManagerBusy ? 'Saving…' : editingMemoryId ? 'Save changes' : 'Save note'}
                  </button>
                  {editingMemoryId && (
                    <button type="button" className="profile-memory-action" onClick={cancelMemoryEdit} disabled={memoryManagerBusy}>
                      <X size={13} /> Cancel edit
                    </button>
                  )}
                </div>
                <small id="profile-memory-editor-help">2–240 characters. MindCare never saves chat messages as long-term notes automatically.</small>
              </div>

              {memoriesLoading && <p className="profile-memory-status" role="status">Loading your saved notes…</p>}
              {memoryManagerError && <p className="profile-memory-error" role="alert">{memoryManagerError}</p>}
              {memoryManagerStatus && <p className="profile-memory-status" role="status">{memoryManagerStatus}</p>}
              {!memoriesLoading && !memoryManagerError && memories.length === 0 && (
                <p className="profile-memory-empty">No saved notes yet. Add a note only when you decide you want MindCare to carry it into future replies.</p>
              )}

              {memories.length > 0 && (
                <div className="profile-memory-list" role="list" aria-label="Saved memory notes">
                  {memories.map(memory => (
                    <article className="profile-memory-note" role="listitem" key={memory.id}>
                      <p>{memory.content}</p>
                      <div className="profile-memory-note-actions">
                        <button type="button" className="profile-memory-action" onClick={() => startMemoryEdit(memory)} disabled={memoryManagerBusy}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button type="button" className="profile-memory-action profile-memory-action-danger" onClick={() => removeMemoryNote(memory.id)} disabled={memoryManagerBusy}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="profile-memory-manager-footer">
                <span>Disabling memory stops these notes being used in replies; it does not delete them.</span>
                <button type="button" className="profile-memory-action profile-memory-action-danger" onClick={removeAllMemoryNotes} disabled={memoryManagerBusy || memories.length === 0}>
                  <Trash2 size={13} /> Delete all notes
                </button>
              </div>
            </div>
          </section>

          <section className="profile-privacy-banner"><span><ShieldCheck size={18} /></span><div><strong>Your space stays personal.</strong><p>Only share what feels useful. MindCare supports reflection; it does not diagnose or replace professional care.</p></div></section>

          <section className="profile-danger-zone" aria-labelledby="profile-delete-heading">
            <div><h3 id="profile-delete-heading">Delete your account</h3><p>This permanently removes your profile, private photo, conversations, saved memories, assessments, and insights.</p></div>
            {!accountDeletionAvailable ? <p className="profile-deletion-unavailable" role="status">Permanent deletion is not enabled on this server yet. Please contact the MindCare administrator.</p> : !deleteOpen ? <button type="button" className="profile-delete-button" onClick={() => { setDeleteOpen(true); setDeleteText(''); setError('') }}>Delete account</button> : (
              <div className="profile-delete-confirm">
                <label htmlFor="profile-delete-confirmation">Type <strong>DELETE</strong> to confirm. This cannot be undone.</label>
                <input id="profile-delete-confirmation" value={deleteText} onChange={event => setDeleteText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') deleteAccount(event) }} autoComplete="off" autoCapitalize="characters" spellCheck="false" />
                <div><button type="button" className="profile-reset-button" onClick={() => { setDeleteOpen(false); setDeleteText('') }} disabled={deleting}>Cancel</button><button type="button" className="profile-delete-button" onClick={deleteAccount} disabled={deleting || deleteText !== 'DELETE'}>{deleting ? 'Deleting…' : 'Permanently delete'}</button></div>
              </div>
            )}
          </section>

          <div className="profile-savebar"><div><span className="profile-save-dot" /><span>Unsaved changes stay here until you save.</span></div><div className="profile-save-actions"><button type="button" className="profile-reset-button" onClick={reset} disabled={saving}><RefreshCw size={14} /> Reset</button><button className="profile-save-button" type="submit" disabled={saving || loading}>{saving ? <><LoaderCircle size={15} className="profile-spinning" /> Saving…</> : <><Save size={15} /> Save my profile</>}</button></div></div>
        </form>
      </div>
    </div>
  )
}
