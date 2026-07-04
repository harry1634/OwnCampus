'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor, BookOpen, Video, Award, Users, Play, Plus, Search, Star,
  Clock, CheckCircle, Lock, X, Check, ChevronRight as ChevRight,
  PlayCircle, FileText, HelpCircle, BarChart2, Upload, Trash2,
  Edit2, Settings, Eye, Film, PlusCircle,
} from 'lucide-react'

// ── Palette & constants ──────────────────────────────────────────────────────
const COURSE_PALETTE = [
  { color: '#2563EB', bg: '#EFF6FF' }, { color: '#10B981', bg: '#F0FDF4' },
  { color: '#06B6D4', bg: '#ECFEFF' }, { color: '#D97706', bg: '#FFFBEB' },
  { color: '#8B5CF6', bg: '#F5F3FF' }, { color: '#EC4899', bg: '#FDF2F8' },
  { color: '#F43F5E', bg: '#FFF1F2' }, { color: '#0F766E', bg: '#F0FDFA' },
]

const SUBJECTS = ['Mathematics','Science','English','History','Commerce','Physics','Computer Science','Hindi','Biology','Geography']

const MODULE_NAMES = {
  Mathematics:        ['Number Theory & Basics','Algebra & Functions','Geometry & Trigonometry','Statistics & Probability'],
  Science:            ['Physics Concepts','Chemistry Fundamentals','Biology & Life Sciences','Applied Science'],
  English:            ['Reading & Comprehension','Grammar & Usage','Creative Writing','Literature Analysis'],
  History:            ['Ancient Civilizations','Medieval & Renaissance','Modern Era','Contemporary World'],
  Commerce:           ['Accounting Basics','Business Organization','Economics Principles','Financial Markets'],
  Physics:            ['Mechanics & Motion','Heat & Thermodynamics','Waves & Optics','Modern Physics'],
  'Computer Science': ['Programming Fundamentals','Data Structures','Algorithms','Software Development'],
  Hindi:              ['व्याकरण','साहित्य','लेखन कौशल','भाषा विज्ञान'],
  Biology:            ['Cell Biology','Genetics & Evolution','Human Physiology','Ecology'],
  Geography:          ['Physical Geography','Human Geography','Environmental Issues','Regional Geography'],
}

// Icons stored by name so deep-clone (JSON) works
const LESSON_ICON_MAP = { PlayCircle, BookOpen, FileText, HelpCircle, BarChart2 }
const LESSON_TYPES = [
  { label: 'Introduction',    iconName: 'PlayCircle' },
  { label: 'Core Concepts',   iconName: 'BookOpen'   },
  { label: 'Worked Examples', iconName: 'FileText'   },
  { label: 'Practice Set',    iconName: 'FileText'   },
  { label: 'Discussion',      iconName: 'BarChart2'  },
  { label: 'Quiz',            iconName: 'HelpCircle' },
]

function getModuleName(subject, idx) {
  const list = MODULE_NAMES[subject] || []
  return list[idx] ?? `Module ${idx + 1}`
}

function buildModules(course) {
  if (!course.lessons || course.lessons === 0) return []
  const numMods = 4
  const perMod  = Math.ceil(course.lessons / numMods)
  const done    = Math.round((course.progress / 100) * course.lessons)
  let idx = 0
  return Array.from({ length: numMods }, (_, mi) => {
    const cnt = mi === numMods - 1
      ? Math.max(1, course.lessons - perMod * (numMods - 1))
      : perMod
    if (cnt <= 0) return null
    return {
      id: mi + 1,
      title: `Module ${mi + 1}: ${getModuleName(course.subject, mi)}`,
      lessons: Array.from({ length: cnt }, (_, li) => {
        const lessonIdx = idx++
        const type = LESSON_TYPES[li % LESSON_TYPES.length]
        return {
          id: lessonIdx + 1,
          title: type.label,
          iconName: type.iconName,
          mins: 20 + ((mi * 7 + li * 3) % 26),
          status: lessonIdx < done ? 'done' : lessonIdx === done ? 'current' : 'locked',
          videoUrl: null,
          videoName: null,
        }
      }),
    }
  }).filter(Boolean)
}

const LMS_KEY = 'owncampus_lms_courses_v1'
function loadCourses() { try { return JSON.parse(localStorage.getItem(LMS_KEY)) || [] } catch { return [] } }
function saveCourses(d) { try { localStorage.setItem(LMS_KEY, JSON.stringify(d)) } catch {} }

const STATUS_FILTERS = [
  { key: 'all', label: 'All' }, { key: 'published', label: 'Published' }, { key: 'draft', label: 'Draft' },
]

// ── Video Player Modal ────────────────────────────────────────────────────────
function VideoModal({ url, title, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>{title}</p>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF' }}>
            <X size={15} />
          </button>
        </div>
        <video src={url} controls autoPlay
          style={{ width: '100%', maxHeight: '70vh', borderRadius: 14, background: '#000', outline: 'none', display: 'block' }}
        />
      </motion.div>
    </motion.div>
  )
}

// ── Course Detail Panel ───────────────────────────────────────────────────────
function CourseDetailPanel({ course, onClose, onUpdate }) {
  const [modules, setModules]       = useState(() => course.modules ?? buildModules(course))
  const [tab, setTab]               = useState('view')   // 'view' | 'manage'
  const [openMod, setOpenMod]       = useState(0)
  const [playingVideo, setPlaying]  = useState(null)     // { url, title }
  const [newModTitle, setNewModTitle] = useState('')
  const [showAddMod, setShowAddMod]   = useState(false)
  const [addingLessonMod, setAddingLessonMod] = useState(null)
  const [newLessonTitle, setNewLessonTitle]   = useState('')
  const videoInputRefs = useRef({})

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0)
  const totalVideos  = modules.reduce((s, m) => s + m.lessons.filter(l => l.videoUrl).length, 0)
  const done         = modules.reduce((s, m) => s + m.lessons.filter(l => l.status === 'done').length, 0)
  const progress     = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0

  const saveModules = (mods) => {
    setModules(mods)
    const total = mods.reduce((s, m) => s + m.lessons.length, 0)
    onUpdate({ ...course, modules: mods, lessons: total })
  }

  const handleVideoUpload = (mi, li, file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const mods = JSON.parse(JSON.stringify(modules))
    mods[mi].lessons[li].videoUrl  = url
    mods[mi].lessons[li].videoName = file.name
    saveModules(mods)
  }

  const removeLesson = (mi, li) => {
    const mods = JSON.parse(JSON.stringify(modules))
    mods[mi].lessons.splice(li, 1)
    saveModules(mods)
  }

  const removeModule = (mi) => {
    const mods = JSON.parse(JSON.stringify(modules))
    mods.splice(mi, 1)
    saveModules(mods)
  }

  const addModule = () => {
    if (!newModTitle.trim()) return
    const mods = [...JSON.parse(JSON.stringify(modules)), {
      id: Date.now(),
      title: newModTitle.trim(),
      lessons: [],
    }]
    saveModules(mods)
    setNewModTitle('')
    setShowAddMod(false)
    setOpenMod(mods.length - 1)
  }

  const addLesson = (mi) => {
    if (!newLessonTitle.trim()) return
    const mods = JSON.parse(JSON.stringify(modules))
    mods[mi].lessons.push({
      id: Date.now(),
      title: newLessonTitle.trim(),
      iconName: 'PlayCircle',
      mins: 30,
      status: 'locked',
      videoUrl: null,
      videoName: null,
    })
    saveModules(mods)
    setAddingLessonMod(null)
    setNewLessonTitle('')
  }

  const updateLessonTitle = (mi, li, val) => {
    const mods = JSON.parse(JSON.stringify(modules))
    mods[mi].lessons[li].title = val
    saveModules(mods)
  }

  const pill = (txt, color, bg, border) => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600, color, background:bg, border:`1px solid ${border}` }}>{txt}</span>
  )

  return (
    <>
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 100 }} />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ position:'fixed', top:0, right:0, bottom:0, width:480, background:'#FFFFFF', zIndex:101, display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.12)' }}>

        {/* ── Header ── */}
        <div style={{ background: course.bg, padding:'24px 24px 18px', flexShrink:0, borderBottom:`2px solid ${course.color}20` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ width:48, height:48, borderRadius:13, background:`${course.color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Monitor size={22} style={{ color: course.color }} />
            </div>
            <button onClick={onClose}
              style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(0,0,0,0.10)', background:'rgba(255,255,255,0.8)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ marginBottom:8 }}>
            {course.status === 'published'
              ? pill('● Live',  '#16A34A','#F0FDF4','#BBF7D0')
              : pill('● Draft', '#D97706','#FFFBEB','#FDE68A')}
          </div>
          <h2 style={{ fontSize:16, fontWeight:800, color:'#0F172A', lineHeight:1.35, letterSpacing:'-0.02em', marginBottom:3 }}>{course.title}</h2>
          <p style={{ fontSize:12, color:'#64748B', marginBottom: course.rating > 0 ? 8 : 0 }}>{course.instructor}</p>
          {course.rating > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:3 }}>
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={12} style={{ color: s <= Math.round(course.rating) ? '#F59E0B':'#E2E8F0', fill: s <= Math.round(course.rating) ? '#F59E0B':'#E2E8F0' }} />
              ))}
              <span style={{ fontSize:11, fontWeight:700, color:'#64748B', marginLeft:3 }}>{course.rating}</span>
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid #F1F5F9', flexShrink:0 }}>
          {[
            { label:'Modules',  value: modules.length },
            { label:'Lessons',  value: totalLessons   },
            { label:'Videos',   value: totalVideos    },
            { label:'Enrolled', value: course.enrolled },
          ].map((s, i) => (
            <div key={s.label} style={{ padding:'12px 0', textAlign:'center', borderRight: i<3 ? '1px solid #F1F5F9':'' }}>
              <p style={{ fontSize:18, fontWeight:800, color:'#0F172A', letterSpacing:'-0.02em' }}>{s.value}</p>
              <p style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display:'flex', borderBottom:'1px solid #F1F5F9', flexShrink:0 }}>
          {[{key:'view',label:'View',icon:Eye},{key:'manage',label:'Manage Content',icon:Settings}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px', border:'none', background:'transparent', cursor:'pointer', fontSize:12.5, fontWeight: tab===t.key ? 700 : 500, color: tab===t.key ? course.color : '#64748B', borderBottom: tab===t.key ? `2px solid ${course.color}` : '2px solid transparent', marginBottom:-1, fontFamily:'inherit', transition:'all 0.15s' }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ flex:1, overflowY:'auto' }}>

          {/* VIEW TAB */}
          {tab === 'view' && (
            <div>
              {/* Progress */}
              <div style={{ padding:'16px 24px', borderBottom:'1px solid #F8FAFC' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>Your Progress</span>
                  <span style={{ fontSize:13, fontWeight:700, color:course.color }}>{progress}%</span>
                </div>
                <div style={{ height:7, borderRadius:99, background:'#F1F5F9', overflow:'hidden' }}>
                  <motion.div initial={{ width:0 }} animate={{ width:`${progress}%` }} transition={{ duration:0.6, ease:'easeOut' }}
                    style={{ height:'100%', borderRadius:99, background:course.color }} />
                </div>
                <p style={{ fontSize:11, color:'#94A3B8', marginTop:5 }}>{done} of {totalLessons} lessons completed</p>
              </div>

              {/* Modules */}
              {modules.length === 0 ? (
                <div style={{ padding:'40px 24px', textAlign:'center' }}>
                  <div style={{ width:54, height:54, borderRadius:14, background:'#F8FAFC', border:'1px dashed #CBD5E1', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                    <BookOpen size={20} style={{ color:'#94A3B8' }} />
                  </div>
                  <p style={{ fontSize:14, fontWeight:600, color:'#475569', marginBottom:6 }}>No lessons yet</p>
                  <p style={{ fontSize:12, color:'#94A3B8', lineHeight:1.6 }}>Switch to <strong>Manage Content</strong> tab to add modules and upload videos.</p>
                </div>
              ) : modules.map((mod, mi) => {
                const modDone = mod.lessons.filter(l => l.status === 'done').length
                const isOpen  = openMod === mi
                return (
                  <div key={mod.id} style={{ borderBottom:'1px solid #F8FAFC' }}>
                    <button onClick={() => setOpenMod(isOpen ? -1 : mi)}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'13px 24px', background: isOpen ? '#FAFAFE':'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                      <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration:0.15 }} style={{ display:'flex' }}>
                        <ChevRight size={14} style={{ color:'#94A3B8' }} />
                      </motion.span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{mod.title}</p>
                        <p style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>{modDone}/{mod.lessons.length} completed · {mod.lessons.filter(l=>l.videoUrl).length} videos</p>
                      </div>
                      {modDone === mod.lessons.length && mod.lessons.length > 0 && (
                        <CheckCircle size={14} style={{ color:'#16A34A', flexShrink:0 }} />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }} style={{ overflow:'hidden' }}>
                          {mod.lessons.length === 0
                            ? <p style={{ padding:'10px 24px 14px 52px', fontSize:12, color:'#94A3B8' }}>No lessons — add some in the Manage tab.</p>
                            : mod.lessons.map((lesson, li) => {
                              const LIcon    = LESSON_ICON_MAP[lesson.iconName] || PlayCircle
                              const isDone   = lesson.status === 'done'
                              const isCur    = lesson.status === 'current'
                              const isLocked = lesson.status === 'locked'
                              const hasVideo = !!lesson.videoUrl
                              return (
                                <div key={lesson.id}
                                  onClick={() => hasVideo && setPlaying({ url: lesson.videoUrl, title: lesson.title })}
                                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 24px 10px 52px', cursor: hasVideo ? 'pointer' : isLocked ? 'default' : 'pointer', opacity: isLocked && !hasVideo ? 0.5 : 1, transition:'background 0.12s' }}
                                  onMouseEnter={e => { if (!isLocked || hasVideo) e.currentTarget.style.background='#F8FAFC' }}
                                  onMouseLeave={e => e.currentTarget.style.background=''}>
                                  <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                                    background: isDone ? '#F0FDF4' : isCur ? `${course.color}15` : hasVideo ? `${course.color}10` : '#F8FAFC',
                                    border:`1px solid ${isDone ? '#BBF7D0' : isCur ? course.color : hasVideo ? `${course.color}40` : '#E2E8F0'}` }}>
                                    {isDone      ? <CheckCircle size={12} style={{ color:'#16A34A' }} />
                                    : isLocked && !hasVideo ? <Lock size={11} style={{ color:'#94A3B8' }} />
                                    : hasVideo   ? <Film size={12} style={{ color: course.color }} />
                                    : <LIcon size={12} style={{ color: course.color }} />}
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:12.5, fontWeight: isCur||hasVideo ? 600 : 500, color: isDone ? '#94A3B8':'#0F172A', textDecoration: isDone ? 'line-through':'none' }}>
                                      {lesson.id}. {lesson.title}
                                    </p>
                                    {hasVideo
                                      ? <p style={{ fontSize:10, color: course.color, fontWeight:600, marginTop:1 }}>▶ Click to watch</p>
                                      : isCur && <p style={{ fontSize:10, color: course.color, fontWeight:600, marginTop:1 }}>In Progress</p>}
                                  </div>
                                  <span style={{ fontSize:11, color:'#94A3B8', flexShrink:0 }}>{lesson.mins} min</span>
                                </div>
                              )
                            })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}

          {/* MANAGE TAB */}
          {tab === 'manage' && (
            <div style={{ padding:'16px 0' }}>
              <div style={{ padding:'0 24px 12px', borderBottom:'1px solid #F8FAFC', marginBottom:8 }}>
                <p style={{ fontSize:12, color:'#64748B', lineHeight:1.6 }}>
                  Add modules, lessons and upload video files for each lesson. Videos are playable in the <strong>View</strong> tab.
                </p>
              </div>

              {modules.map((mod, mi) => {
                const isOpen = openMod === mi
                return (
                  <div key={mod.id} style={{ borderBottom:'1px solid #F8FAFC' }}>
                    {/* Module header */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px 12px 24px', background: isOpen ? '#F8FAFC':'transparent' }}>
                      <button onClick={() => setOpenMod(isOpen ? -1 : mi)} style={{ display:'flex', alignItems:'center', gap:8, flex:1, background:'none', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                        <motion.span animate={{ rotate: isOpen ? 90:0 }} transition={{ duration:0.15 }} style={{ display:'flex' }}>
                          <ChevRight size={14} style={{ color:'#94A3B8' }} />
                        </motion.span>
                        <span style={{ fontSize:13, fontWeight:700, color:'#0F172A', flex:1 }}>{mod.title}</span>
                        <span style={{ fontSize:11, color:'#94A3B8' }}>{mod.lessons.length} lessons · {mod.lessons.filter(l=>l.videoUrl).length} videos</span>
                      </button>
                      <button onClick={() => removeModule(mi)}
                        style={{ width:26, height:26, borderRadius:7, border:'1px solid #FECACA', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#DC2626', flexShrink:0 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }} style={{ overflow:'hidden' }}>

                          {/* Lesson rows */}
                          {mod.lessons.map((lesson, li) => {
                            const hasVideo = !!lesson.videoUrl
                            const refKey = `${mi}-${li}`
                            return (
                              <div key={lesson.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px 9px 48px', borderTop:'1px solid #F8FAFC' }}>
                                {/* Lesson icon */}
                                <div style={{ width:24, height:24, borderRadius:6, background: hasVideo ? `${course.color}15` : '#F8FAFC', border:`1px solid ${hasVideo ? `${course.color}40` : '#E2E8F0'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  {hasVideo ? <Film size={11} style={{ color: course.color }} /> : <PlayCircle size={11} style={{ color:'#94A3B8' }} />}
                                </div>

                                {/* Editable title */}
                                <input
                                  value={lesson.title}
                                  onChange={e => updateLessonTitle(mi, li, e.target.value)}
                                  style={{ flex:1, border:'none', outline:'none', fontSize:12.5, color:'#0F172A', background:'transparent', fontFamily:'inherit', fontWeight:500, minWidth:0 }}
                                />

                                {/* Video status */}
                                {hasVideo && (
                                  <span style={{ fontSize:10, fontWeight:600, color: course.color, background:`${course.color}12`, padding:'2px 8px', borderRadius:6, flexShrink:0, whiteSpace:'nowrap' }}>
                                    {lesson.videoName?.length > 14 ? lesson.videoName.slice(0,14)+'…' : lesson.videoName}
                                  </span>
                                )}

                                {/* Upload button */}
                                <label style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, border:`1px solid ${hasVideo ? course.color+'50' : '#E2E8F0'}`, background: hasVideo ? `${course.color}10` : '#F8FAFC', cursor:'pointer', fontSize:11, fontWeight:600, color: hasVideo ? course.color : '#64748B', whiteSpace:'nowrap', flexShrink:0 }}>
                                  <Upload size={11} />
                                  {hasVideo ? 'Replace' : 'Upload Video'}
                                  <input type="file" accept="video/*" style={{ display:'none' }}
                                    ref={el => videoInputRefs.current[refKey] = el}
                                    onChange={e => handleVideoUpload(mi, li, e.target.files?.[0])} />
                                </label>

                                {/* Delete lesson */}
                                <button onClick={() => removeLesson(mi, li)}
                                  style={{ width:24, height:24, borderRadius:6, border:'1px solid #FECACA', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#DC2626', flexShrink:0 }}>
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            )
                          })}

                          {/* Add lesson row */}
                          {addingLessonMod === mi ? (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px 10px 48px', borderTop:'1px solid #F8FAFC' }}>
                              <input autoFocus
                                className="input-premium"
                                style={{ flex:1, fontSize:12.5, padding:'7px 10px', boxSizing:'border-box' }}
                                placeholder="Lesson title…"
                                value={newLessonTitle}
                                onChange={e => setNewLessonTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addLesson(mi); if (e.key === 'Escape') { setAddingLessonMod(null); setNewLessonTitle('') } }}
                              />
                              <button onClick={() => addLesson(mi)}
                                style={{ padding:'7px 12px', borderRadius:8, border:'none', background: course.color, color:'#FFF', fontSize:12, fontWeight:700, cursor:'pointer' }}>Add</button>
                              <button onClick={() => { setAddingLessonMod(null); setNewLessonTitle('') }}
                                style={{ padding:'7px 10px', borderRadius:8, border:'1px solid #E2E8F0', background:'#FFF', fontSize:12, color:'#64748B', cursor:'pointer' }}>Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => { setAddingLessonMod(mi); setNewLessonTitle('') }}
                              style={{ width:'100%', display:'flex', alignItems:'center', gap:7, padding:'9px 16px 10px 48px', background:'transparent', border:'none', borderTop:'1px solid #F8FAFC', cursor:'pointer', fontSize:12, color:'#64748B', fontFamily:'inherit', textAlign:'left' }}
                              onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                              onMouseLeave={e => e.currentTarget.style.background=''}>
                              <PlusCircle size={13} style={{ color:'#94A3B8' }} /> Add Lesson
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {/* Add Module */}
              <div style={{ padding:'12px 24px' }}>
                {showAddMod ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <input autoFocus
                      className="input-premium"
                      style={{ width:'100%', boxSizing:'border-box', fontSize:13 }}
                      placeholder="Module title, e.g. Introduction to Calculus"
                      value={newModTitle}
                      onChange={e => setNewModTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addModule(); if (e.key === 'Escape') { setShowAddMod(false); setNewModTitle('') } }}
                    />
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={addModule}
                        style={{ flex:1, padding:'9px', borderRadius:9, border:'none', background: course.color, color:'#FFF', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                        Add Module
                      </button>
                      <button onClick={() => { setShowAddMod(false); setNewModTitle('') }}
                        style={{ padding:'9px 14px', borderRadius:9, border:'1px solid #E2E8F0', background:'#FFF', fontSize:13, color:'#64748B', cursor:'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddMod(true)}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:10, border:`2px dashed ${course.color}50`, background:`${course.color}06`, cursor:'pointer', fontSize:13, fontWeight:600, color: course.color, fontFamily:'inherit', transition:'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = course.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = `${course.color}50`}>
                    <Plus size={15} /> Add Module
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        {tab === 'view' && (
          <div style={{ padding:'14px 24px', borderTop:'1px solid #F1F5F9', flexShrink:0 }}>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background: course.color, color:'#FFFFFF', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit' }}>
              <Play size={15} fill="white" />
              {(course.progress ?? 0) > 0 ? 'Continue Learning' : 'Start Course'}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Video Player */}
      <AnimatePresence>
        {playingVideo && <VideoModal url={playingVideo.url} title={playingVideo.title} onClose={() => setPlaying(null)} />}
      </AnimatePresence>
    </>
  )
}

// ── Create Course Modal ───────────────────────────────────────────────────────
function CreateCourseModal({ courseCount, onClose, onAdd }) {
  const [form, setForm]   = useState({ title:'', instructor:'', subject:'', duration:'', status:'draft' })
  const [saved, setSaved] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const isPublished = form.status === 'published'

  const handleSave = async () => {
    if (!form.title.trim() || !form.instructor.trim()) return
    setSaved(true)
    await new Promise(r => setTimeout(r, 700))
    const palette = COURSE_PALETTE[courseCount % COURSE_PALETTE.length]
    onAdd({ id:Date.now(), title:form.title, instructor:form.instructor, subject:form.subject||'General', lessons:0, duration:form.duration||'TBD', enrolled:0, progress:0, ...palette, rating:0, status:form.status, modules:[] })
    onClose()
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={onClose}>
      <motion.div initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95 }}
        onClick={e => e.stopPropagation()}
        style={{ background:'#FFFFFF', borderRadius:18, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', overflowX:'hidden', overflowY:'auto', maxHeight:'calc(100vh - var(--header-height) - 64px)' }}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:'#0F172A' }}>Create New Course</p>
            <p style={{ fontSize:12, color:'#64748B', marginTop:2 }}>Add a new learning module to the LMS</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid #E2E8F0', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#64748B' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Course Title *</label>
            <input className="input-premium" style={{ width:'100%', boxSizing:'border-box' }} placeholder="e.g. Advanced Physics — Class 12" value={form.title} onChange={set('title')} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Instructor *</label>
              <input className="input-premium" style={{ width:'100%', boxSizing:'border-box' }} placeholder="e.g. Dr. Anita Sharma" value={form.instructor} onChange={set('instructor')} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Subject</label>
              <select className="input-premium" style={{ width:'100%' }} value={form.subject} onChange={set('subject')}>
                <option value="">Select subject…</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Estimated Duration</label>
              <input className="input-premium" style={{ width:'100%', boxSizing:'border-box' }} placeholder="e.g. 18h 30m" value={form.duration} onChange={set('duration')} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Publish Status</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, status: f.status === 'published' ? 'draft':'published' }))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:9, border:`1px solid ${isPublished ? '#BBF7D0':'#FDE68A'}`, background: isPublished ? '#F0FDF4':'#FFFBEB', cursor:'pointer', fontFamily:'inherit' }}>
                <div style={{ width:32, height:18, borderRadius:99, background: isPublished ? '#16A34A':'#D97706', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left: isPublished ? 14:2, width:14, height:14, borderRadius:99, background:'#FFFFFF', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <span style={{ fontSize:12, fontWeight:600, color: isPublished ? '#16A34A':'#D97706' }}>{isPublished ? 'Published':'Draft'}</span>
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid #F1F5F9', display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid #E2E8F0', background:'#FFFFFF', fontSize:13, color:'#475569', cursor:'pointer', fontWeight:500 }}>Cancel</button>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} onClick={handleSave}
            style={{ padding:'9px 20px', borderRadius:9, border:'none', background: saved ? '#16A34A':'#2563EB', color:'#FFFFFF', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, transition:'background 0.2s' }}>
            {saved ? <><Check size={14} /> Created!</> : <><Plus size={14} /> Create Course</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LMSPage() {
  const [courses, setCourses]         = useState([])
  const [mounted, setMounted]         = useState(false)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState('all')
  const [showModal, setShowModal]     = useState(false)
  const [selectedCourse, setSelected] = useState(null)

  useEffect(() => { setCourses(loadCourses()); setMounted(true) }, [])

  const saveThenSet = (next) => { saveCourses(next); setCourses(next) }

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || c.status === filter)
  )

  const updateCourse = (updated) => {
    const next = courses.map(c => c.id === updated.id ? updated : c)
    saveThenSet(next)
    setSelected(updated)
  }

  // Dynamic KPIs from real courses
  const kpis = [
    { label: 'Active Courses',    value: String(courses.filter(c=>c.status==='published').length), icon: BookOpen, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Enrolled Students', value: String(courses.reduce((s,c)=>s+(c.enrolled||0),0)),       icon: Users,    color: '#10B981', bg: '#F0FDF4' },
    { label: 'Total Lessons',     value: String(courses.reduce((s,c)=>s+(c.lessons||0),0)),         icon: Video,    color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Avg Rating',        value: (() => { const rated=courses.filter(c=>c.rating>0); return rated.length ? (rated.reduce((s,c)=>s+c.rating,0)/rated.length).toFixed(1) : '—' })(), icon: Award, color: '#D97706', bg: '#FFFBEB' },
  ]

  if (!mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      <div className="page-header">
        <div>
          <h1 className="page-header-title">Learning Management System</h1>
          <p className="page-header-sub">Create, manage and deliver digital learning experiences</p>
        </div>
        <div className="page-actions">
          <motion.button whileHover={{ scale:1.02 }} className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Create Course
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {kpis.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }} whileHover={{ y:-2 }}
              style={{ background:stat.bg, border:`1px solid ${stat.color}25`, borderRadius:14, padding:'20px 18px', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`${stat.color}20`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                <Icon size={18} style={{ color:stat.color }} />
              </div>
              <p style={{ fontSize:11, fontWeight:600, color:'#64748B', marginBottom:5, letterSpacing:'0.02em', textTransform:'uppercase' }}>{stat.label}</p>
              <p style={{ fontSize:28, fontWeight:700, color:stat.color, lineHeight:1, letterSpacing:'-0.02em' }}>{stat.value}</p>
            </motion.div>
          )
        })}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:14, padding:'10px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ position:'relative', flex:1, maxWidth:280 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#CBD5E1', pointerEvents:'none' }} />
          <input type="text" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', height:36, paddingLeft:36, paddingRight:12, border:'1px solid #E2E8F0', borderRadius:9, background:'#F8FAFC', fontSize:13, color:'#0F172A', outline:'none', fontFamily:'Inter, sans-serif' }} />
        </div>
        <div style={{ width:1, height:24, background:'#E8ECF0' }} />
        <div style={{ display:'flex', gap:2 }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight: filter===f.key ? 700:500, color: filter===f.key ? '#2563EB':'#64748B', background: filter===f.key ? '#EFF6FF':'transparent', border: filter===f.key ? '1px solid #BFDBFE':'1px solid transparent', cursor:'pointer', transition:'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize:13, color:'#94A3B8', marginLeft:'auto', flexShrink:0 }}>
          {filtered.length} course{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div style={{ gridColumn:'1 / -1', padding:'56px 20px', textAlign:'center', background:'#FFFFFF', borderRadius:16, border:'1px dashed #CBD5E1' }}>
            <Monitor size={36} style={{ color:'#CBD5E1', margin:'0 auto 12px', display:'block' }} />
            <p style={{ fontSize:14, fontWeight:600, color:'#64748B', margin:0 }}>
              {search ? `No courses found for "${search}"` : courses.length === 0 ? 'No courses yet' : 'No courses match this filter'}
            </p>
            {!search && courses.length === 0 && (
              <p style={{ fontSize:12, color:'#94A3B8', marginTop:8 }}>Click "Create Course" to add your first course.</p>
            )}
          </div>
        ) : filtered.map((course, i) => (
          <motion.div key={course.id}
            initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
            whileHover={{ y:-3, boxShadow:'0 12px 32px rgba(0,0,0,0.10)' }}
            onClick={() => setSelected(course)}
            style={{ background:'#FFFFFF', border:`1px solid ${selectedCourse?.id===course.id ? course.color : '#E8ECF0'}`, borderRadius:16, overflow:'hidden', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', transition:'box-shadow 0.2s, border-color 0.15s' }}>
            <div style={{ height:148, background:course.bg, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', borderBottom:`1px solid ${course.color}15` }}>
              <div style={{ width:60, height:60, borderRadius:18, background:`${course.color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Monitor size={28} style={{ color:course.color }} />
              </div>
              {course.status === 'published'
                ? <div style={{ position:'absolute', top:12, right:12, display:'flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, background:'#F0FDF4', border:'1px solid #BBF7D0', fontSize:11, fontWeight:600, color:'#16A34A' }}><CheckCircle size={10} /> Live</div>
                : <div style={{ position:'absolute', top:12, right:12, display:'flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, background:'#FFFBEB', border:'1px solid #FDE68A', fontSize:11, fontWeight:600, color:'#D97706' }}><Lock size={10} /> Draft</div>}
              {/* Video count badge */}
              {(course.modules ?? []).reduce((s,m) => s + m.lessons.filter(l=>l.videoUrl).length, 0) > 0 && (
                <div style={{ position:'absolute', bottom:12, left:12, display:'flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, background:'rgba(0,0,0,0.55)', fontSize:11, fontWeight:600, color:'#FFF' }}>
                  <Film size={10} /> {(course.modules ?? []).reduce((s,m)=>s+m.lessons.filter(l=>l.videoUrl).length,0)} videos
                </div>
              )}
              <motion.div initial={{ opacity:0 }} whileHover={{ opacity:1 }}
                style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.22)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:course.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Play size={18} color="white" />
                </div>
              </motion.div>
            </div>
            <div style={{ padding:'14px 16px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:20, background:`${course.color}15`, color:course.color }}>{course.subject}</span>
                {course.rating > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <Star size={11} style={{ color:'#F59E0B', fill:'#F59E0B' }} />
                    <span style={{ fontSize:12, fontWeight:600, color:'#64748B' }}>{course.rating}</span>
                  </div>
                )}
              </div>
              <h3 style={{ fontSize:14, fontWeight:700, color:'#0F172A', lineHeight:1.4, marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{course.title}</h3>
              <p style={{ fontSize:12, color:'#94A3B8', marginBottom:10 }}>{course.instructor}</p>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, fontSize:11, color:'#94A3B8' }}>
                {course.lessons > 0 && <span style={{ display:'flex', alignItems:'center', gap:4 }}><BookOpen size={11} style={{ color:'#CBD5E1' }} />{course.lessons} lessons</span>}
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11} style={{ color:'#CBD5E1' }} />{course.duration}</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><Users size={11} style={{ color:'#CBD5E1' }} />{course.enrolled}</span>
              </div>
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'#94A3B8' }}>Progress</span>
                  <span style={{ fontSize:11, fontWeight:700, color: course.progress > 0 ? course.color : '#94A3B8' }}>{course.progress}%</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:'#F1F5F9', overflow:'hidden' }}>
                  <motion.div initial={{ width:0 }} animate={{ width:`${course.progress}%` }}
                    transition={{ delay:0.3+i*0.05, duration:0.8, ease:'easeOut' }}
                    style={{ height:'100%', borderRadius:99, background:course.color }} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedCourse && (
          <CourseDetailPanel
            key={selectedCourse.id}
            course={selectedCourse}
            onClose={() => setSelected(null)}
            onUpdate={updateCourse}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <CreateCourseModal
            courseCount={courses.length}
            onClose={() => setShowModal(false)}
            onAdd={course => { const next = [course, ...courses]; saveThenSet(next); setSelected(course) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
