import fs from 'fs/promises';
import path from 'path';

const REMINDER_FILE_PATH = path.resolve(__dirname, '../../reminders.json');

export interface ReminderEntry {
  id: string;
  proId: string;
  clientId: string;
  dateTime: any;
  duration: number;
  timeSlot: string;
  status: string;
  roomId?: string;
  [key: string]: any;
}

async function readReminders(): Promise<ReminderEntry[]> {
  try {
    const data = await fs.readFile(REMINDER_FILE_PATH, 'utf-8');
    if (!data.trim()) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Fichier reminders.json corrompu ou vide:', e);
      return [];
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeReminders(reminders: ReminderEntry[]): Promise<void> {
  await fs.writeFile(REMINDER_FILE_PATH, JSON.stringify(reminders, null, 2), 'utf-8');
}

export async function setReminders(reminders: ReminderEntry[]): Promise<void> {
  await writeReminders(reminders);
}

export async function addReminder(appointment: ReminderEntry): Promise<void> {
  const reminders = await readReminders();
  if (!reminders.find(r => r.id === appointment.id)) {
    reminders.push(appointment);
    await writeReminders(reminders);
  }
}

export async function removeReminder(appointmentId: string): Promise<void> {
  const reminders = await readReminders();
  const filtered = reminders.filter(r => r.id !== appointmentId);
  if (filtered.length !== reminders.length) {
    await writeReminders(filtered);
  }
}

export async function updateReminder(appointment: ReminderEntry): Promise<void> {
  const reminders = await readReminders();
  const idx = reminders.findIndex(r => r.id === appointment.id);
  if (idx !== -1) {
    reminders[idx] = appointment;
    await writeReminders(reminders);
  }
}

export const getReminders = async (): Promise<any[]> => {
  const remindersPath = path.resolve(__dirname, '../../reminders.json');
  try {
    const data = await fs.readFile(remindersPath, 'utf-8');
    if (!data.trim()) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Fichier reminders.json corrompu ou vide:', e);
      return [];
    }
  } catch (e) {
    // Fichier manquant ou autre erreur
    return [];
  }
}; 