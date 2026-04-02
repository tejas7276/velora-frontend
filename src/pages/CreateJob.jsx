import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Upload, CheckCircle, AlertCircle, Clock, Zap, Brain, Gauge } from 'lucide-react'
import Layout from '../components/Layout'
import { createJob } from '../api/jobs'

const JOB_TYPES = [
  { value: 'AI_ANALYSIS',       label: 'AI Analysis',        category: 'Core',         desc: 'Deep AI analysis of text or PDF'              },
  { value: 'SUMMARIZE',         label: 'Summarize',          category: 'Core',         desc: 'Condense long text into concise summary'      },
  { value: 'SENTIMENT',         label: 'Sentiment Analysis', category: 'Core',         desc: 'Detect Positive / Negative / Neutral'         },
  { value: 'EXTRACT_KEYWORDS',  label: 'Extract Keywords',   category: 'General',      desc: 'Pull key topics and phrases from text'        },
  { value: 'TRANSLATE',         label: 'Translate',          category: 'General',      desc: 'Translate text between languages'             },
  { value: 'GENERATE_REPORT',   label: 'Generate Report',    category: 'General',      desc: 'Create structured report from raw data'       },
  { value: 'CODE_REVIEW',       label: 'Code Review',        category: 'General',      desc: 'Review code quality, bugs and security'       },
  { value: 'CLASSIFY',          label: 'Classify Text',      category: 'General',      desc: 'Categorize text into predefined topics'       },
  { value: 'QUESTION_ANSWER',   label: 'Question & Answer',  category: 'General',      desc: 'Answer questions from a document'             },
  { value: 'COMPARE_DOCUMENTS', label: 'Compare Documents',  category: 'General',      desc: 'Find similarities and differences'            },
  { value: 'RESUME_SCORE',      label: 'Resume Score',       category: 'HR & Career',  desc: 'Score resume out of 100 with ATS analysis'   },
  { value: 'INTERVIEW_PREP',    label: 'Interview Prep',     category: 'HR & Career',  desc: 'Generate interview Q&A from job description' },
  { value: 'JD_MATCH',          label: 'JD Match',           category: 'HR & Career',  desc: 'Match resume against job description'         },
  { value: 'LINKEDIN_BIO',      label: 'LinkedIn Bio',       category: 'HR & Career',  desc: 'Generate LinkedIn headline and About section' },
  { value: 'EMAIL_WRITER',      label: 'Email Writer',       category: 'Professional', desc: 'Write professional emails from context'       },
  { value: 'MEETING_SUMMARY',   label: 'Meeting Summary',    category: 'Professional', desc: 'Convert meeting notes to structured summary'  },
  { value: 'BUG_EXPLAINER',     label: 'Bug Explainer',      category: 'Professional', desc: 'Explain errors and suggest exact fixes'       },
]

const CATEGORIES = ['Core', 'General', 'HR & Career', 'Professional']

const CATEGORY_COLORS = {
  'Core':         'bg-brand-50 text-brand-600 border-brand-200',
  'General':      'bg-violet-50 text-violet-600 border-violet-200',
  'HR & Career':  'bg-emerald-50 text-emerald-600 border-emerald-200',
  'Professional': 'bg-amber-50 text-amber-700 border-amber-200',
}

const PLACEHOLDERS = {
  AI_ANALYSIS:       'Paste text or upload a PDF for deep AI analysis...',
  SUMMARIZE:         'Paste the long article or document to summarize...',
  SENTIMENT:         'Paste the review or feedback to analyze sentiment...',
  EXTRACT_KEYWORDS:  'Paste the article to extract keywords from...',
  TRANSLATE:         'Paste the text you want to translate...',
  GENERATE_REPORT:   'Paste raw data or notes to generate a report from...',
  CODE_REVIEW:       'Paste your code here for review...',
  CLASSIFY:          'Paste the text to classify...',
  QUESTION_ANSWER:   'Paste the document and your questions...',
  COMPARE_DOCUMENTS: 'Paste both texts separated by "---DOCUMENT 2---"...',
  RESUME_SCORE:      'Paste resume text or upload a PDF...',
  INTERVIEW_PREP:    'Paste the job description...',
  JD_MATCH:          'Paste resume then "---JOB DESCRIPTION---" then the JD...',
  LINKEDIN_BIO:      'Paste your resume or career summary...',
  EMAIL_WRITER:      'Describe the email context...',
  MEETING_SUMMARY:   'Paste raw meeting notes or transcript...',
  BUG_EXPLAINER:     'Paste the error message or stack trace...',
}

const AI_MODELS = [
  {
    id: 'llama-3.1-8b-instant',
    label: 'Fast',
    sub:   'llama-3.1-8b',
    desc:  'Best for simple tasks. Fastest response.',
    icon:  Zap,
    color: 'text-emerald-500',
    bg:    'bg-emerald-50',
    border:'border-emerald-200',
  },
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Balanced',
    sub:   'llama-3.3-70b',
    desc:  'Best for most tasks. Recommended.',
    icon:  Gauge,
    color: 'text-brand-500',
    bg:    'bg-brand-50',
    border:'border-brand-200',
  },
  {
    id: 'llama-3.1-70b-versatile',
    label: 'Best Quality',
    sub:   'llama-3.1-70b',
    desc:  'Deepest analysis. Best for complex tasks.',
    icon:  Brain,
    color: 'text-violet-500',
    bg:    'bg-violet-50',
    border:'border-violet-200',
  },
]

const PRIORITIES = [
  { v: 'LOW',      bar: 'bg-slate-300',  active: 'border-slate-400 bg-slate-50'  },
  { v: 'MEDIUM',   bar: 'bg-brand-400',  active: 'border-brand-500 bg-brand-50'  },
  { v: 'HIGH',     bar: 'bg-amber-400',  active: 'border-amber-500 bg-amber-50'  },
  { v: 'CRITICAL', bar: 'bg-red-400',    active: 'border-red-500 bg-red-50'      },
]

function needsPdf(type) {
  return [
    'AI_ANALYSIS',
    'SUMMARIZE',
    'QUESTION_ANSWER',
    'EXTRACT_KEYWORDS',
    'GENERATE_REPORT',
    'COMPARE_DOCUMENTS',
    'RESUME_SCORE',
    'JD_MATCH',
    'LINKEDIN_BIO',
  ].includes(type);
}

export default function CreateJob() {
  var navigate = useNavigate()

  var [selectedType,    setSelectedType]    = useState(JOB_TYPES[0])
  var [payload,         setPayload]         = useState('')
  var [priority,        setPriority]        = useState('MEDIUM')
  var [file,            setFile]            = useState(null)
  var [file2,           setFile2]           = useState(null)
  var [loading,         setLoading]         = useState(false)
  var [success,         setSuccess]         = useState(false)
  var [error,           setError]           = useState('')
  var [deployStep,      setDeployStep]      = useState(0)
  var [scheduleEnabled, setScheduleEnabled] = useState(false)
  var [scheduledAt,     setScheduledAt]     = useState('')
  var [selectedModel,   setSelectedModel]   = useState(AI_MODELS[1])

  var minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16)

  function handleSubmit() {
    setError('')
    setLoading(true)
    setDeployStep(1)

    var fd = new FormData()
    fd.append('jobType',  selectedType.value)
    fd.append('payload',  payload)
    fd.append('aiModel',  selectedModel.id)
    fd.append('priority', priority)
    
    if (file) fd.append('file', file)
    if (scheduleEnabled && scheduledAt) fd.append('scheduledAt', scheduledAt)
    if (selectedType.value === 'COMPARE_DOCUMENTS') {
    if (file)  fd.append('file', file)
    if (file2) fd.append('file2', file2)
    } else {
    if (file) fd.append('file', file)
    }

    // Step 1 delay then call API
    setTimeout(function() {
      setDeployStep(2)
      createJob(fd)
        .then(function(res) {
          var jobId = res.data.id
          setDeployStep(3)
          setSuccess(true)
          // Reset form
          setPayload('')
          setFile(null)
          setFile2(null)
          setSelectedType(JOB_TYPES[0])
          setPriority('MEDIUM')
          setScheduleEnabled(false)
          setScheduledAt('')
          setSelectedModel(AI_MODELS[1])
          // Navigate after short delay
          setTimeout(function() {
            navigate('/jobs/' + jobId)
          }, 1000)
        })
        .catch(function(err) {
          setError(
            err.response && err.response.data && err.response.data.message
              ? err.response.data.message
              : 'Failed to create job'
          )
          setDeployStep(0)
        })
        .finally(function() {
          setLoading(false)
        })
    }, 700)
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create New Job</h1>
          <p className="page-subtitle">Configure and deploy an AI-powered task to the processing engine.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full font-medium">
          <span className="live-dot w-1.5 h-1.5" /> Engine: Online
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Job Type */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-brand-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Job Type</p>
                <p className="text-xs text-slate-500">Select the AI task to perform.</p>
              </div>
            </div>
            {CATEGORIES.map(function(cat) {
              return (
                <div key={cat} className="mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{cat}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {JOB_TYPES.filter(function(t) { return t.category === cat }).map(function(type) {
                      var isSelected = selectedType.value === type.value
                      return (
                        <button
                          key={type.value}
                          onClick={function() { setSelectedType(type); setPayload('') }}
                          className={
                            'text-left p-3 rounded-xl border-2 transition-all duration-150 ' +
                            (isSelected
                              ? CATEGORY_COLORS[cat] + ' border-current'
                              : 'border-transparent bg-slate-50 hover:bg-slate-100')
                          }
                        >
                          <p className="text-sm font-semibold text-slate-800">{type.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-tight">{type.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Payload */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-violet-500">T</span>
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Input Payload</p>
                <p className="text-xs text-slate-500">Text input for <span className="text-brand-500 font-semibold">{selectedType.label}</span></p>
              </div>
            </div>
            <textarea
              className="input font-mono text-xs min-h-[160px] resize-y"
              placeholder={PLACEHOLDERS[selectedType.value] || 'Enter your input here...'}
              value={payload}
              onChange={function(e) { setPayload(e.target.value) }}
            />
            {needsPdf(selectedType.value) && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload PDF <span className="text-brand-500 text-xs">(recommended)</span>
                </label>

                {/* FILE 1 */}
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                  <Upload className="w-5 h-5 text-slate-400" />
                  {file
                    ? <span className="text-sm text-brand-600 font-medium">{file.name}</span>
                    : <div className="text-center">
                        <span className="text-sm text-slate-500">
                          {selectedType.value === 'COMPARE_DOCUMENTS'
                            ? 'Upload First Document'
                            : 'Drop PDF or '}
                          <span className="text-brand-500 font-medium">browse</span>
                        </span>
                        <p className="text-xs text-slate-400 mt-1">Max 10MB · PDF only</p>
                      </div>
                  }
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </label>

                {file && (
                  <button
                    onClick={() => setFile(null)}
                    className="text-xs text-red-400 hover:text-red-500 mt-1"
                  >
                    Remove file
                  </button>
                )}

                {/* FILE 2 ONLY FOR COMPARE */}
                {selectedType.value === 'COMPARE_DOCUMENTS' && (
                  <>
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all mt-4">
                      <Upload className="w-5 h-5 text-slate-400" />
                      {file2
                        ? <span className="text-sm text-brand-600 font-medium">{file2.name}</span>
                        : <div className="text-center">
                            <span className="text-sm text-slate-500">
                              Upload Second Document <span className="text-brand-500 font-medium">browse</span>
                            </span>
                            <p className="text-xs text-slate-400 mt-1">Max 10MB · PDF only</p>
                          </div>
                      }
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={(e) => setFile2(e.target.files[0])}
                      />
                    </label>

                    {file2 && (
                      <button
                        onClick={() => setFile2(null)}
                        className="text-xs text-red-400 hover:text-red-500 mt-1"
                      >
                        Remove second file
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Model */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">AI Model</p>
                <p className="text-xs text-slate-500">Choose speed vs quality for this task.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {AI_MODELS.map(function(model) {
                var Icon       = model.icon
                var isSelected = selectedModel.id === model.id
                return (
                  <button
                    key={model.label}
                    onClick={function() { setSelectedModel(model) }}
                    className={
                      'p-4 rounded-xl border-2 text-left transition-all duration-150 ' +
                      (isSelected ? model.border + ' ' + model.bg : 'border-slate-200 hover:bg-slate-50')
                    }
                  >
                    <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-2 ' + (isSelected ? model.bg : 'bg-slate-100')}>
                      <Icon className={'w-4 h-4 ' + (isSelected ? model.color : 'text-slate-400')} />
                    </div>
                    <p className={'text-sm font-bold ' + (isSelected ? model.color : 'text-slate-700')}>{model.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{model.sub}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-tight">{model.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Schedule */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Schedule Job</p>
                  <p className="text-xs text-slate-500">Run at a specific time instead of immediately.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={scheduleEnabled}
                  onChange={function(e) { setScheduleEnabled(e.target.checked) }}
                  className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
              </label>
            </div>
            {scheduleEnabled ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Run at</label>
                <input type="datetime-local" className="input max-w-xs"
                  min={minDateTime} value={scheduledAt}
                  onChange={function(e) { setScheduledAt(e.target.value) }} />
                {scheduledAt && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                    <Clock size={11} /> Queued at {new Date(scheduledAt).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-3 p-3 bg-amber-50 rounded-lg">
                  Job saves as <strong>SCHEDULED</strong> and auto-releases when the time arrives. Engine checks every 60 seconds.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Toggle on to run this job at a future time.</p>
            )}
          </div>

          {/* Priority */}
          <div className="card p-6">
            <p className="font-semibold text-slate-800 text-sm mb-1">Execution Priority</p>
            <p className="text-xs text-slate-500 mb-4">Higher priority jobs are processed first when queue is busy.</p>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map(function(item) {
                return (
                  <button key={item.v}
                    onClick={function() { setPriority(item.v) }}
                    className={
                      'border-2 rounded-xl py-2.5 text-xs font-semibold transition-all ' +
                      (priority === item.v
                        ? item.active + ' text-slate-700'
                        : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100')
                    }
                  >
                    <div className={'h-1 w-10 mx-auto rounded-full mb-1.5 ' + item.bar} />
                    {item.v}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {scheduleEnabled ? 'Job scheduled! Redirecting...' : 'Job deployed! Redirecting...'}
            </div>
          )}
        </div>

        {/* Right preview */}
        <div className="flex flex-col gap-4">
          <div className="card p-5 sticky top-20">
            <p className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-4">SUBMISSION PREVIEW</p>
            <div className="flex flex-col gap-3 text-sm mb-5">
              {[
                { label: 'Job Type',  value: selectedType.label    },
                { label: 'Category', value: selectedType.category  },
                { label: 'AI Model', value: selectedModel.label + ' (' + selectedModel.sub + ')' },
                { label: 'Priority', value: priority               },
                { label: 'Schedule', value: scheduleEnabled && scheduledAt ? new Date(scheduledAt).toLocaleString() : 'Immediate' },
              ].map(function(item) {
                return (
                  <div key={item.label} className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 flex-shrink-0">{item.label}</span>
                    <span className="font-semibold text-slate-800 text-right text-xs">{item.value}</span>
                  </div>
                )
              })}
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">PAYLOAD SNIPPET</span>
                {payload.length > 0 && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> READY
                  </span>
                )}
              </div>
              <div className="log-terminal max-h-24 overflow-auto text-[11px] leading-relaxed">
                {payload.length > 0
                  ? payload.slice(0, 120) + (payload.length > 120 ? '...' : '')
                  : <span className="text-slate-500">No payload yet...</span>
                }
              </div>
            </div>

            {scheduleEnabled && scheduledAt && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                <Clock size={13} className="text-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Scheduled</p>
                  <p className="text-xs text-slate-500">{new Date(scheduledAt).toLocaleString()}</p>
                </div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading || success}
              className="btn-primary w-full justify-center py-3">
              {deployStep === 0 && <span>{scheduleEnabled ? '⏰ Schedule Job' : '⊙ Deploy Now'}</span>}
              {deployStep === 1 && <><span className="spinner w-4 h-4" /> Validating...</>}
              {deployStep === 2 && <><span className="spinner w-4 h-4" /> {scheduleEnabled ? 'Scheduling...' : 'Queuing...'}</>}
              {deployStep === 3 && <span>✓ {scheduleEnabled ? 'Scheduled!' : 'Deployed!'}</span>}
            </button>

            <p className="text-xs text-slate-400 text-center mt-2">
              {scheduleEnabled ? 'Job runs at scheduled time.' : 'Job starts processing immediately.'}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}