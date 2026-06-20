import type { ProductStatusEnum } from "../dtos/enums/product-status.enum";
import type { ProductRequest } from "../dtos/request/product-request.dto";
import type { ProductResponse } from "../dtos/response/product-response.dto";
import api from "./api";

const API_URL = "/products";

function appendFormValue(fd: FormData, key: string, value: unknown) {
  if (value === undefined) return;

  if (value === null) {
    if (key === "supplierId") fd.append(key, "");
    if (key === "promoPrice") fd.append(key, "null");
    return;
  }

  if (Array.isArray(value) || typeof value === "object") {
    fd.append(key, JSON.stringify(value));
    return;
  }

  fd.append(key, String(value));
}

export const ProductService = {
  findAll: async (): Promise<ProductResponse[]> => {
    const response = await api.get<ProductResponse[]>(API_URL);
    return response.data;
  },

  findOne: async (id: string): Promise<ProductResponse> => {
    const response = await api.get<ProductResponse>(`${API_URL}/${id}`);
    return response.data;
  },

  create: async (
    product: ProductRequest,
    files?: File[],
  ): Promise<ProductResponse> => {
    const formData = new FormData();

    const { variations, ...productData } = product;
    const variationsForJson = variations?.map(({ images, ...rest }) => {
      void images;
      return rest;
    });

    Object.entries({ ...productData, variations: variationsForJson }).forEach(
      ([key, value]) => {
        appendFormValue(formData, key, value);
      },
    );

    if (files?.length) {
      files.forEach((file) => formData.append("files", file));
    }

    variations?.forEach((variation, index) => {
      if (
        variation.images &&
        variation.images.length > 0 &&
        variation.images[0] instanceof File
      ) {
        formData.append(`variationImage_${index}`, variation.images[0]);
      }
    });

    const response = await api.post<ProductResponse>(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  update: async (
    id: string,
    product: Partial<ProductRequest>,
    files?: File[],
  ): Promise<ProductResponse> => {
    const formData = new FormData();

    const { variations, ...productData } = product;
    const variationsForJson = variations?.map(({ images, ...rest }) => {
      void images;
      return rest;
    });

    Object.entries({ ...productData, variations: variationsForJson }).forEach(
      ([key, value]) => {
        appendFormValue(formData, key, value);
      },
    );

    if (files?.length) {
      files.forEach((file) => formData.append("files", file));
    }

    variations?.forEach((variation, index) => {
      if (
        variation.images &&
        variation.images.length > 0 &&
        variation.images[0] instanceof File
      ) {
        formData.append(`variationImage_${index}`, variation.images[0]);
      }
    });

    const response = await api.patch<ProductResponse>(
      `${API_URL}/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },

  actived: async (
    id: string,
    status: ProductStatusEnum,
  ): Promise<ProductResponse> => {
    const response = await api.patch<ProductResponse>(
      `${API_URL}/${id}/status`,
      { status },
    );
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`${API_URL}/${id}`);
  },
};
