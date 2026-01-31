export interface Staff {
  id: string;
  username: string;
  fullName: string;
  active: boolean;
  createdAt: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  staff: Staff;
}
