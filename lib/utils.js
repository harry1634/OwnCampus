import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date) {
  const now = new Date()
  const diff = now - new Date(date)
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export function generateId(prefix = '') {
  const id = Math.random().toString(36).substr(2, 9)
  return prefix ? `${prefix}_${id}` : id
}

export function truncate(str, length = 50) {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function titleCase(str) {
  if (!str) return ''
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

export function getInitials(name) {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key]
    if (!result[group]) result[group] = []
    result[group].push(item)
    return result
  }, {})
}

export function parseError(error) {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.error_description) return error.error_description
  return 'An unexpected error occurred'
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CHAIRMAN: 'chairman',
  DIRECTOR: 'director',
  OWNER: 'owner',
  PRINCIPAL: 'principal',
  VICE_PRINCIPAL: 'vice_principal',
  ACADEMIC_COORDINATOR: 'academic_coordinator',
  HOD: 'hod',
  TEACHER: 'teacher',
  TRAINER: 'trainer',
  FACULTY: 'faculty',
  ADMISSION_OFFICER: 'admission_officer',
  COUNSELLOR: 'counsellor',
  HR: 'hr',
  ACCOUNTANT: 'accountant',
  RECEPTIONIST: 'receptionist',
  TRANSPORT_MANAGER: 'transport_manager',
  HOSTEL_MANAGER: 'hostel_manager',
  LIBRARIAN: 'librarian',
  PARENT: 'parent',
  STUDENT: 'student',
  ALUMNI: 'alumni',
  VENDOR: 'vendor',
  AUDITOR: 'auditor',
  GUEST: 'guest',
}

export const INSTITUTION_TYPES = {
  SCHOOL: 'school',
  COLLEGE: 'college',
  UNIVERSITY: 'university',
  COACHING_CENTER: 'coaching_center',
  TRAINING_INSTITUTE: 'training_institute',
  SKILL_ACADEMY: 'skill_academy',
  MULTI_BRANCH: 'multi_branch',
}
