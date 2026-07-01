import { useEffect, useRef, useState } from 'react'
import type { OptionItem, QuestionOut } from './profiling.types'
import styles from './QuestionRenderer.module.css'

interface QuestionRendererProps {
  question: QuestionOut
  value: string
  onChange: (questionId: string, value: string) => void
  error?: string
}

const RADIO_THRESHOLD = 5
const COMBOBOX_THRESHOLD = 15

export default function QuestionRenderer({
  question,
  value,
  onChange,
  error,
}: QuestionRendererProps) {
  const inputId = `q-${question.id}`
  const errorId = error ? `${inputId}-error` : undefined
  const [searchText, setSearchText] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const [multiSearch, setMultiSearch] = useState('')

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange(question.id, e.target.value)
  }

  const opts = question.options ?? []

  const renderInput = () => {
    switch (question.question_type) {
      case 'text':
        return (
          <input
            id={inputId}
            type="text"
            className={`${styles.input} ${error ? styles.invalid : ''}`}
            value={value}
            onChange={handleChange}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
        )

      case 'number':
      case 'numeric':
        return (
          <input
            id={inputId}
            type="number"
            className={`${styles.input} ${error ? styles.invalid : ''}`}
            value={value}
            onChange={handleChange}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
        )

      case 'textarea':
        return (
          <textarea
            id={inputId}
            className={`${styles.textarea} ${error ? styles.invalid : ''}`}
            value={value}
            onChange={handleChange}
            rows={3}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
        )

      case 'date':
        return (
          <input
            id={inputId}
            type="date"
            className={`${styles.input} ${error ? styles.invalid : ''}`}
            value={value}
            onChange={handleChange}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
        )

      case 'boolean':
        return (
          <div className={styles.booleanGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name={inputId}
                value="yes"
                checked={value === 'yes'}
                onChange={handleChange}
              />
              <span>Yes</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name={inputId}
                value="no"
                checked={value === 'no'}
                onChange={handleChange}
              />
              <span>No</span>
            </label>
          </div>
        )

      case 'select':
        return (
          <select
            id={inputId}
            className={`${styles.select} ${error ? styles.invalid : ''}`}
            value={value}
            onChange={handleChange}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          >
            <option value="">Select an option</option>
            {opts.map((opt: OptionItem) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className={styles.radioGroup}>
            {opts.map((opt: OptionItem) => (
              <label key={opt.value} className={styles.radioLabel}>
                <input
                  type="radio"
                  name={inputId}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={handleChange}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )

      case 'single_choice': {
        if (!opts.length) {
          return (
            <input
              id={inputId}
              type="text"
              className={`${styles.input} ${error ? styles.invalid : ''}`}
              value={value}
              onChange={handleChange}
              aria-invalid={Boolean(error)}
              aria-describedby={errorId}
            />
          )
        }
        if (opts.length <= RADIO_THRESHOLD) {
          return (
            <div className={styles.radioGroup}>
              {opts.map((opt: OptionItem) => (
                <label key={opt.value} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name={inputId}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={handleChange}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )
        }
        if (opts.length <= COMBOBOX_THRESHOLD) {
          return (
            <select
              id={inputId}
              className={`${styles.select} ${error ? styles.invalid : ''}`}
              value={value}
              onChange={handleChange}
              aria-invalid={Boolean(error)}
              aria-describedby={errorId}
            >
              <option value="">Select an option</option>
              {opts.map((opt: OptionItem) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )
        }

        const selectedOpt = opts.find((o) => o.value === value)
        const filtered = searchText
          ? opts.filter((o) => o.label.toLowerCase().includes(searchText.toLowerCase()))
          : opts

        const selectOption = (opt: OptionItem) => {
          onChange(question.id, opt.value)
          setSearchText(opt.label)
          setShowDropdown(false)
        }

        return (
          <div ref={comboboxRef} className={styles.combobox}>
            <input
              id={inputId}
              type="text"
              className={`${styles.comboboxInput} ${error ? styles.invalid : ''}`}
              value={selectedOpt && !showDropdown ? selectedOpt.label : searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setShowDropdown(true)
                if (selectedOpt && selectedOpt.label !== e.target.value) {
                  onChange(question.id, '')
                }
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Type to search..."
              aria-invalid={Boolean(error)}
              aria-describedby={errorId}
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              role="combobox"
            />
            {showDropdown && (
              <ul className={styles.comboboxDropdown}>
                {filtered.length === 0 ? (
                  <li className={styles.comboboxEmpty}>No matches found</li>
                ) : (
                  filtered.map((opt) => (
                    <li
                      key={opt.value}
                      className={`${styles.comboboxOption} ${
                        value === opt.value ? styles.comboboxOptionActive : ''
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        selectOption(opt)
                      }}
                    >
                      {opt.label}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )
      }

      case 'multi_select': {
        const DELIM = '|||'
        const LEGACY_DELIM = ','

        const parseSelected = (val: string): string[] => {
          if (!val) return []
          const pipeParts = val.split(DELIM).filter(Boolean)
          const hasPipe = val.includes(DELIM)
          if (hasPipe) return pipeParts
          if (!val.includes(LEGACY_DELIM)) return pipeParts
          const commaParts = val.split(LEGACY_DELIM).filter(Boolean)
          const pipeMatches = pipeParts.filter(p => opts.some(o => o.value === p)).length
          const commaMatches = commaParts.filter(p => opts.some(o => o.value === p)).length
          return commaMatches > pipeMatches ? commaParts : pipeParts
        }

        const selected = parseSelected(value)
        const needsSearch = opts.length > 10

        const toggleCheckbox = (optValue: string, checked: boolean) => {
          const next = checked
            ? [...selected, optValue]
            : selected.filter((v) => v !== optValue)
          onChange(question.id, next.join(DELIM))
        }

        interface OptionGroup {
          prefix: string
          options: OptionItem[]
        }

        const groupOptions = (items: OptionItem[]): { grouped: OptionGroup[]; ungrouped: OptionItem[] } => {
          const prefixMap = new Map<string, OptionItem[]>()
          const standalone: OptionItem[] = []

          for (const opt of items) {
            const lastColon = opt.value.lastIndexOf(':')
            if (lastColon > 0) {
              const prefix = opt.value.slice(0, lastColon)
              const suffix = opt.value.slice(lastColon + 1)
              if (suffix === 'Yes' || suffix === 'No') {
                if (!prefixMap.has(prefix)) prefixMap.set(prefix, [])
                prefixMap.get(prefix)!.push(opt)
              } else {
                standalone.push(opt)
              }
            } else {
              standalone.push(opt)
            }
          }

          const grouped: OptionGroup[] = []
          const ungrouped: OptionItem[] = [...standalone]

          for (const [prefix, options] of prefixMap) {
            const hasYes = options.some((o) => o.value.endsWith(':Yes'))
            const hasNo = options.some((o) => o.value.endsWith(':No'))
            if (hasYes && hasNo) {
              grouped.push({ prefix, options })
            } else {
              ungrouped.push(...options)
            }
          }

          return { grouped, ungrouped }
        }

        const { grouped, ungrouped } = groupOptions(opts)
        const totalItems = grouped.length + ungrouped.length

        const handleRadioChange = (optValue: string, groupPrefix: string) => {
          const withoutGroup = selected.filter((v) => !v.startsWith(groupPrefix + ':'))
          onChange(question.id, [...withoutGroup, optValue].join(DELIM))
        }

        const matchesSearch = (label: string) =>
          !multiSearch || label.toLowerCase().includes(multiSearch.toLowerCase())

        const visibleGrouped = grouped.filter((g) =>
          g.options.some((o) => matchesSearch(o.label)),
        )
        const visibleUngrouped = ungrouped.filter((o) => matchesSearch(o.label))

        return (
          <div>
            {needsSearch && (
              <input
                type="text"
                className={styles.multiSearch}
                placeholder="Search options..."
                value={multiSearch}
                onChange={(e) => setMultiSearch(e.target.value)}
              />
            )}
            <div>
              {visibleGrouped.map((group) => (
                <div key={group.prefix} className={styles.radioGroup}>
                  {group.options.map((opt) => (
                    <label key={opt.value} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name={`${inputId}_${group.prefix}`}
                        value={opt.value}
                        checked={selected.includes(opt.value)}
                        onChange={() => handleRadioChange(opt.value, group.prefix)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              ))}
              {visibleGrouped.length > 0 && visibleUngrouped.length > 0 && (
                <div style={{ height: '0.5rem' }} />
              )}
              <div className={styles.checkboxGroup}>
                {(needsSearch ? visibleUngrouped : ungrouped).map((opt) => (
                  <label key={opt.value} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      value={opt.value}
                      checked={selected.includes(opt.value)}
                      onChange={(e) => toggleCheckbox(opt.value, e.target.checked)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {needsSearch && multiSearch && (
              <div className={styles.multiSearchCount}>
                {visibleGrouped.length + visibleUngrouped.length} of {totalItems} options shown
              </div>
            )}
          </div>
        )
      }

      default:
        return (
          <input
            id={inputId}
            type="text"
            className={`${styles.input} ${error ? styles.invalid : ''}`}
            value={value}
            onChange={handleChange}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
        )
    }
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {question.question_text}
      </label>
      {renderInput()}
      {error && (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
