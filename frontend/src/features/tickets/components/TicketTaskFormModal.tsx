// Talebe bağlı görev oluşturma modalı — YENİ bir uç YOK: C şeridin `POST /api/tasks` ucu
// kullanılır, `taskable_type: 'ticket'` + `taskable_id` SABİTTİR (kullanıcı değiştiremez).
// Yalnızca OLUŞTURMA modu vardır (görev tanımı: "+ Görev Ekle ile ticket'a bağlı görev
// oluşturma") — mevcut bir görevi düzenlemek/taşımak genel `/tasks` sayfasının işidir.
//
// C şeridin `features/tasks/api/tasksApi.ts` (`useCreateTask`, `useTaskUserOptions`) ve
// `features/tasks/components/priorityMeta.ts` / `taskStatusMeta.ts` / `dateTimeInput.ts`
// dosyaları DOĞRUDAN kullanılır — kopya YAZILMAZ.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Input, Modal, Select, Textarea } from '../../../components/ui'
import { getFieldErrors } from '../../../lib/axios'
import { PRIORITY_OPTIONS } from '../../tasks/components/priorityMeta'
import { CREATE_STATUS_OPTIONS } from '../../tasks/components/taskStatusMeta'
import { localInputToIso } from '../../tasks/components/dateTimeInput'
import { useCreateTask, useTaskUserOptions } from '../../tasks/api/tasksApi'
import type { Task } from '../../tasks/types'
import type { Ticket } from '../types'

export type TicketTaskFormModalProps = {
  open: boolean
  onClose: () => void
  ticket: Ticket
}

export function TicketTaskFormModal({ open, onClose, ticket }: TicketTaskFormModalProps) {
  const { data: userOptions, isForbidden: usersForbidden } = useTaskUserOptions()
  const createTask = useCreateTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [reminderAt, setReminderAt] = useState('')
  const [priority, setPriority] = useState('normal')
  const [status, setStatus] = useState('pending')
  const [assignedTo, setAssignedTo] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [reminderClientError, setReminderClientError] = useState<string | undefined>(undefined)

  const openKey = open ? `create-${ticket.id}` : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setTitle('')
      setDescription('')
      setDueAt('')
      setReminderAt('')
      setPriority('normal')
      setStatus('pending')
      // Talebe atanan kişi varsa görev de doğal olarak ona önerilir — kullanıcı isterse değiştirir.
      setAssignedTo(ticket.assignee ? String(ticket.assignee.id) : '')
      setFieldErrors({})
      setReminderClientError(undefined)
    }
  }

  const isPending = createTask.isPending

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0]
  }

  function validate(): boolean {
    const errors: Record<string, string[]> = {}
    if (!title.trim()) errors.title = ['Başlık zorunludur.']
    const reminderAfterDue = !!dueAt && !!reminderAt && reminderAt > dueAt
    setReminderClientError(reminderAfterDue ? 'Hatırlatıcı, vade tarihinden sonra olamaz.' : undefined)
    if (reminderAfterDue) errors.reminder_at = ['Hatırlatıcı, vade tarihinden sonra olamaz.']
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    try {
      await createTask.mutateAsync({
        title,
        description: description || undefined,
        due_at: dueAt ? localInputToIso(dueAt) : null,
        reminder_at: reminderAt ? localInputToIso(reminderAt) : null,
        priority: priority as Task['priority'],
        status: status as Task['status'],
        assigned_to: assignedTo ? Number(assignedTo) : null,
        taskable_type: 'ticket',
        taskable_id: ticket.id,
      })
      onClose()
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error)
      if (serverFieldErrors) setFieldErrors(serverFieldErrors)
    }
  }

  const assigneeOptions = [
    { value: '', label: 'Atanmamış' },
    ...(userOptions ?? []).map((u) => ({ value: String(u.id), label: u.name })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Talebe Görev Ekle"
      description={`${ticket.ticket_number} — ${ticket.subject}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="ticket-task-form" loading={isPending}>
            Oluştur
          </Button>
        </div>
      }
    >
      <form id="ticket-task-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} error={fieldError('title')} required />

        <Textarea
          label="Açıklama"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldError('description')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Vade"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => {
              setDueAt(e.target.value)
              if (reminderAt && e.target.value && reminderAt > e.target.value) setReminderAt('')
            }}
            error={fieldError('due_at')}
          />
          <Input
            label="Hatırlatıcı"
            type="datetime-local"
            value={reminderAt}
            onChange={(e) => {
              setReminderAt(e.target.value)
              setReminderClientError(undefined)
            }}
            max={dueAt || undefined}
            disabled={!dueAt}
            hint={!dueAt ? 'Önce vade tarihi seçin.' : undefined}
            error={reminderClientError ?? fieldError('reminder_at')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Öncelik"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={PRIORITY_OPTIONS}
            error={fieldError('priority')}
          />
          <Select
            label="Durum"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={CREATE_STATUS_OPTIONS}
            error={fieldError('status')}
          />
          {!usersForbidden && (
            <Select
              label="Atanan"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              options={assigneeOptions}
              error={fieldError('assigned_to')}
            />
          )}
        </div>

        <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-fg-muted">
          Bu görev otomatik olarak talebe ({ticket.ticket_number}) bağlanır.
        </p>
      </form>
    </Modal>
  )
}
