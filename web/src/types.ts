export interface Clinic {
  id: string;
  name: string;
  address: string;
  workingHours: string;
  doctors?: Doctor[];
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  photoUrl: string;
  clinicId: string;
  clinic?: Clinic;
}

export type QueueStatus = "WAITING" | "APPROACHING" | "CALLED";
export type AppointmentStatus = "BOOKED" | "DONE" | "CANCELLED";

export interface Queue {
  id: string;
  appointmentId: string;
  queueNumber: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  status: QueueStatus;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  userId: string;
  doctorId: string;
  clinicId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  createdAt: string;
  doctor: Doctor;
  clinic: Clinic;
  queue: Queue | null;
}

export type LabStatus = "PENDING" | "READY";

export interface LabTest {
  id: string;
  userId: string;
  name: string;
  date: string;
  status: LabStatus;
  result: string | null;
  normalRange: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
}
