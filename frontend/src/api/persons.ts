import api from "./axios";

export interface Person {
  id: string;
  name: string;
  contact_info: string;
  created_at: string;
}

export const getPersons = async (): Promise<Person[]> => {
  const response = await api.get("/api/persons");
  return response.data;
};

export interface CreatePersonPayload {
  name: string;
  contact_info?: string;
}

export const createPerson = async (
  data: CreatePersonPayload,
): Promise<Person> => {
  const response = await api.post("/api/persons", data);
  return response.data;
};
