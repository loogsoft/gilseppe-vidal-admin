import type { UserTypeEnum } from "../dtos/enums/user-type.enum";
import type { LoginRequestDto } from "../dtos/request/login-request.dto";
import type { UpdatePasswordRequestDto } from "../dtos/request/update-password-request.dto";
import type { UserRequestDto } from "../dtos/request/user-request.dto";
import type { VerifyCoderequestDto } from "../dtos/request/verification-code-request.dto";
import type { LoginResponseDto } from "../dtos/response/login-response.dto";
import api from "./api";

type UserMeResponse = {
  id: string;
  email: string;
};

export type UserProfileResponse = {
  id: string;
  name?: string;
  email?: string;
  dataCadastro: Date;
  userType: UserTypeEnum;
  companyId: string;
};

export const UserService = {
  create: async (dto: UserRequestDto) => {
    const response = await api.post("/users", dto);
    return response.data;
  },

  update: async (id: string, dto: Partial<UserRequestDto>) => {
    const response = await api.put(`/users/${id}`, dto);
    return response.data;
  },

  updatePassword: async (id: string, dto: UpdatePasswordRequestDto) => {
    const response = await api.post(`/users/${id}/update-password`, dto);
    return response.data;
  },

  remove: async (id: string): Promise<string> => {
    const response = await api.delete<string>(`/users/${id}`);
    return response.data;
  },

  verifyEmail: async (dto: LoginRequestDto): Promise<{ companyId: string }> => {
    const response = await api.post("/users/verify-email", dto);
    return response.data;
  },

  verificationToken: async (
    dto: VerifyCoderequestDto,
  ): Promise<LoginResponseDto> => {
    const response = await api.post<LoginResponseDto>(
      "/users/verify-code",
      dto,
    );
    return response.data;
  },

  activate: async (body: string): Promise<string> => {
    const response = await api.post<string>("/users/activate-api", { body });
    return response.data;
  },

  getMe: async (): Promise<UserMeResponse> => {
    const response = await api.get<UserMeResponse>("/users/me");
    return response.data;
  },

  findOne: async (id: string): Promise<UserProfileResponse> => {
    const response = await api.get<UserProfileResponse>(`/users/${id}`);
    return response.data;
  },

  findAll: async (): Promise<UserProfileResponse[]> => {
    const response = await api.get<UserProfileResponse[]>("/users/find-all");
    return response.data;
  },
};
