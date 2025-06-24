import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {pyInvoke} from "tauri-plugin-pytauri-api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getStoreValue = async <T>(key: string): Promise<any> => {
  return await pyInvoke<T>("get_data_key", { "key": key });
};

export const setStoreValue = async (key: string, value: any): Promise<void> => {
  await pyInvoke("set_data_key", { "key": key, "value": value });
};

export const getStudent = async (id: string|number): Promise<any> => {
  return await pyInvoke("get_student_by_id", { "student_id": Number(id) });
}

export const setStudentMark = async (id: string|number, taskIndex: number, mark: number): Promise<void> => {
  await pyInvoke("set_student_mark", { "student_id": Number(id), "task_id": taskIndex, "mark": mark });
}

export const generateMarkForTask = async (id: string|number, taskIndex: number): Promise<number> => {
  return await pyInvoke("generate_mark_for_task", { "student_id": Number(id), "task_id": taskIndex });
}