import { useEffect, useRef } from 'react'
import { useNotifications } from '../context/NotificationContext'

export function useJobNotifications(jobs) {
  const { addNotification } = useNotifications()
  const prevJobs = useRef({})

  useEffect(() => {
    jobs.forEach(job => {
      const prev = prevJobs.current[job.id]
      if (prev && prev !== job.status) {
        if (job.status === 'COMPLETED') {
          addNotification(`✅ Job JOB-${String(job.id).padStart(4,'0')} (${job.jobType}) completed successfully`, 'success')
        } else if (job.status === 'FAILED') {
          addNotification(`❌ Job JOB-${String(job.id).padStart(4,'0')} (${job.jobType}) failed — ${job.errorMessage?.slice(0,60) || 'unknown error'}`, 'error')
        } else if (job.status === 'PROCESSING') {
          addNotification(`⚙️ Job JOB-${String(job.id).padStart(4,'0')} is now processing on Node-${job.workerId || '?'}`, 'info')
        }
      }
      prevJobs.current[job.id] = job.status
    })
  }, [jobs])
}